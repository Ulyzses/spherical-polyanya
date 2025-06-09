import { assert } from "@std/assert";
import Point from "./Point.ts";
import Polygon from "./Polygon.ts";
import { Orientation, PolyContainmentType } from "../types.ts";
import Vertex from "./Vertex.ts";

/** A class representing search nodes */
export default class SearchNode {
  private _parent: SearchNode | null;

  private _root: Point;
  private _right: Point;
  private _left: Point;

  private _rightVertex: Vertex | null;
  private _leftVertex: Vertex | null;

  private _nextPolygon: Polygon;

  private _g: number;
  private _h: number;

  private _goal: Point;

  //#region Initialisers
  /**
   * @param parent Parent node in the search tree or null if this is the root node
   * @param root The root point of the search node
   * @param right The right point of the interval
   * @param left The left point of the interval
   * @param rightVertex The vertex ID of the right point in the polygon
   * @param leftVertex The vertex ID of the left point in the polygon
   * @param nextPolygon The next polygon to explore from this node
   * @param g The cost to reach this node from the start node
   * @param goal The goal point to reach from this node
   * @throws Will throw an error if the root point is not on the left side of the edge formed by right and left points
   * @remarks The right and left vertices are defined as the vertices of the polygon that are nearest to the right and left points such that traversing from right to left contains the maximal interval
   */
  constructor(
    parent: SearchNode | null,
    root: Point,
    right: Point,
    left: Point,
    rightVertex: Vertex | null,
    leftVertex: Vertex | null,
    nextPolygon: Polygon,
    g: number = 0,
    goal: Point,
  ) {
    assert(
      Point.getOrientation(root, right, left) !== Orientation.CLOCKWISE,
      `Root ${root.toString()} is on the right of edge ${left.toString()}-${right.toString()}`,
    );

    assert(nextPolygon.id !== -1, "Next polygon must not be an obstacle");

    this._parent = parent;
    this._root = root;
    this._right = right;
    this._left = left;
    this._rightVertex = rightVertex;
    this._leftVertex = leftVertex;
    this._nextPolygon = nextPolygon;
    this._g = g;
    this._goal = goal;

    // Computing the h value as the distance to the goal
    if (root.equals(left) || root.equals(right)) {
      this._h = root.distance(goal);
      return;
    }

    let end = goal;

    // If the goal is on the right side of the edge, reflect it across the edge
    if (Point.getOrientation(end, right, left) === Orientation.ANTICLOCKWISE) {
      end = goal.reflectPoint(right, left);
    }

    if (Point.getOrientation(root, right, end) === Orientation.CLOCKWISE) {
      this._h = root.distance(right) + right.distance(end);
    } else if (
      Point.getOrientation(root, left, end) === Orientation.ANTICLOCKWISE
    ) {
      this._h = root.distance(left) + left.distance(end);
    } else {
      this._h = root.distance(end);
    }
  }
  //#endregion

  //#region Generate successors
  /**
   * Generate successors for this search node
   * @returns An array of successor search nodes generated from this node
   */
  genSuccessors(): SearchNode[] {
    assert(this._rightVertex !== null, `Right vertex is not set`);
    assert(this._leftVertex !== null, `Left vertex is not set`);

    const successors: SearchNode[] = [];
    let reversed = false;

    // Special case for terminal nodes
    // @todo Handle this case more gracefully
    if (
      this.nextPolygon.containsPoint(this.root.negate()).type !==
        PolyContainmentType.OUTSIDE
    ) {
      reversed = true;
    }

    const [
      newRightPoint,
      newLeftPoint,
      observableRange,
      nonObservableRightRange,
      nonObservableLeftRange,
    ] = this.project(reversed);

    // Generate observable successors
    successors.push(
      ...this.splitSuccessors(
        newRightPoint,
        newLeftPoint,
        observableRange as [number, number],
        this.root,
      ),
    );

    // Generate non-observable successors
    if (
      this._right.equals(this._rightVertex) &&
      this._rightVertex.isCorner &&
      nonObservableRightRange[1] > nonObservableRightRange[0]
    ) {
      successors.push(
        ...this.splitSuccessors(
          this._rightVertex,
          newRightPoint,
          nonObservableRightRange as [number, number],
          this._right,
        ),
      );
    }

    if (
      this._left.equals(this._leftVertex) &&
      this._leftVertex.isCorner &&
      nonObservableLeftRange[1] > nonObservableLeftRange[0]
    ) {
      successors.push(
        ...this.splitSuccessors(
          newLeftPoint,
          this._leftVertex,
          nonObservableLeftRange as [number, number],
          this._left,
        ),
      );
    }

    return successors;
  }

  /** */
  genFinalNode(): SearchNode {
    assert(
      this.nextPolygon.containsPoint(this._goal).type !==
        PolyContainmentType.OUTSIDE,
      `Goal point ${this._goal.toString()} is not yet in the next polygon ${this.nextPolygon.id}`,
    );

    // Perform a visibility check to ensure the goal is visible from the root point
    const rightAngle = Point.getOrientation(
      this._root,
      this._right,
      this._goal,
    );
    const leftAngle = Point.getOrientation(this._root, this._left, this._goal);

    if (rightAngle !== Orientation.ANTICLOCKWISE) {
      return new SearchNode(
        this,
        this._right,
        this._goal,
        this._goal,
        null,
        null,
        this.nextPolygon,
        this._g + this._root.distance(this._right),
        this._goal,
      );
    } else if (leftAngle !== Orientation.CLOCKWISE) {
      return new SearchNode(
        this,
        this._left,
        this._goal,
        this._goal,
        null,
        null,
        this.nextPolygon,
        this._g + this._root.distance(this._left),
        this._goal,
      );
    } else if (
      rightAngle === Orientation.ANTICLOCKWISE &&
      leftAngle === Orientation.CLOCKWISE
    ) {
      return new SearchNode(
        this,
        this._root,
        this._goal,
        this._goal,
        null,
        null,
        this.nextPolygon,
        this._g,
        this._goal,
      );
    } else {
      throw new Error(
        `Goal point ${this._goal.toString()} is not visible from root point ${this._root.toString()}`,
      );
    }
  }
  //#endregion

  //#region Projection
  /**
   * Project the left and right rays from the root point to the edges of the next polygon
   * @param reversed Whether to expect the left intersection to be on the right side of the perimeter
   * @returns A tuple containing the right point, left point, observable range, non-observable right range, and non-observable left range
   * @todo Double check the cases as there may be uncaught edge cases
   */
  private project(
    reversed: boolean = false,
  ): [Point, Point, [number, number], [number, number], [number, number]] {
    assert(this._rightVertex !== null, `Right vertex is not set`);
    assert(this._leftVertex !== null, `Left vertex is not set`);

    // Get the local indices of the interval in the next polygon
    // Right local index is where the search begins
    const leftLocalIndex =
      this.nextPolygon.vIndices.indexOf(this._leftVertex.id) + this.nVertices;
    const rightLocalIndex = leftLocalIndex + 1 - this.nVertices;

    // Intersection of the left and right rays with the edges of the next polygon
    let newRightPoint!: Point;
    let newLeftPoint!: Point;

    // The range of vertices that are observable from the search node [a, b] but not including b when iterating
    const observableRange: [number?, number?] = [];
    const nonObservableRightRange: [number, number?] = [rightLocalIndex];
    const nonObservableLeftRange: [number?, number?] = [, leftLocalIndex];

    // Reverse the left and right rays if needed
    const right = reversed ? this._left : this._right;
    const left = reversed ? this._right : this._left;

    // Start scanning the perimeter
    for (let i = rightLocalIndex; i < leftLocalIndex; ++i) {
      const vertex = this.nextPolygon.vertices[i % this.nVertices];
      const nextVertex = this.nextPolygon.vertices[(i + 1) % this.nVertices];

      //#region Right projection
      // Start looking for the first intersection
      if (!newRightPoint) {
        // Project the right ray to the edge formed by vertex and nextVertex. It's a valid intersection if the angle formed by root, intersection, and nextVertex is not clockwise

        const intersection = Point.getIntersection(
          this.root,
          right,
          vertex,
          nextVertex,
        );

        if (intersection) {
          const r = intersection.find((p) =>
            this.nextPolygon.containsPoint(p).type !==
              PolyContainmentType.OUTSIDE
          );

          // There is no intersection in the edge
          if (!r) continue;

          const orientation = Point.getOrientation(this.root, r, nextVertex);

          if (orientation === Orientation.CLOCKWISE) {
            // The intersection is not valid
            continue;
          } else if (orientation === Orientation.COLLINEAR) {

            assert(
              r.equals(nextVertex),
              `Right intersection is not equal to next vertex: ${r.toString()} != ${nextVertex.toString()}`,
            );

            newRightPoint = nextVertex;
            observableRange[0] = i + 1;

            if (reversed) {
              nonObservableLeftRange[0] = i + 1;
            } else {
              nonObservableRightRange[1] = i + 1;
            }
          } else {
            newRightPoint = r;
            observableRange[0] = i;

            if (reversed) {
              nonObservableLeftRange[0] = i;
            } else {
              nonObservableRightRange[1] = r.equals(vertex) ? i : i + 1;
            }
          }
        } else {
          // The edge and the ray lie on the same great circle. The point of intersection is the vertex itself
          assert(
            !reversed,
            `Right intersection should not be collinear as it should have been handled by the previous edge`,
          );

          newRightPoint = vertex;
          observableRange[0] = i;
          nonObservableRightRange[1] = i;
        }
      }
      //#endregion

      //#region Left projection
      if (newRightPoint && !newLeftPoint) {
        // Project the left ray to the edge formed by vertex and nextVertex. It's a valid intersection if the angle formed by root, intersection, and vertex is not anticlockwise
        const intersection = Point.getIntersection(
          this.root,
          left,
          vertex,
          nextVertex,
        );

        if (intersection) {
          const l = intersection.find((p) =>
            this.nextPolygon.containsPoint(p).type !==
              PolyContainmentType.OUTSIDE
          );

          // There is no intersection in the edge
          if (!l) continue;

          const orientation = Point.getOrientation(this.root, l, vertex);

          assert(
            orientation === Orientation.CLOCKWISE,
            `Left intersection should not be collinear or anticlockwise as it should have been handled prior`,
          );

          if (l.equals(nextVertex)) {
            newLeftPoint = nextVertex;
            observableRange[1] = i + 1;

            if (reversed) {
              nonObservableRightRange[1] = i + 1;
            } else {
              nonObservableLeftRange[0] = i + 1;
            }
          } else {
            newLeftPoint = l;
            observableRange[1] = i + 1;

            if (reversed) {
              nonObservableRightRange[1] = i + 1;
            } else {
              nonObservableLeftRange[0] = i;
            }
          }
        } else {
          // The edge and the ray lie on the same great circle. The point of intersection is the nextVertex
          // console.debug("Collinear intersection");

          newLeftPoint = nextVertex;
          observableRange[1] = i + 1;

          if (reversed) {
            nonObservableRightRange[1] = i;
          } else {
            nonObservableLeftRange[0] = i + 1;
          }
        }
      }
      //#endregion

      if (newRightPoint && newLeftPoint) {
        // Both intersections are found, we can stop searching
        break;
      }
    }

    assert(newRightPoint !== undefined, `Right point is undefined`);
    assert(newLeftPoint !== undefined, `Left point is undefined`);
    assert(observableRange[0] !== undefined, `Observable range is undefined`);
    assert(observableRange[1] !== undefined, `Observable range is undefined`);
    assert(
      observableRange[0] < observableRange[1],
      `Observable range is invalid: ${observableRange}`,
    );
    assert(
      nonObservableRightRange[0] !== undefined,
      `Non-observable right range is undefined`,
    );
    assert(
      nonObservableRightRange[1] !== undefined,
      `Non-observable right range is undefined`,
    );
    assert(
      nonObservableLeftRange[0] !== undefined,
      `Non-observable left range is undefined`,
    );
    assert(
      nonObservableLeftRange[1] !== undefined,
      `Non-observable left range is undefined`,
    );

    return [
      newRightPoint,
      newLeftPoint,
      observableRange as [number, number],
      nonObservableRightRange as [number, number],
      nonObservableLeftRange as [number, number],
    ];
  }
  //#endregion

  //#region Split successors
  private splitSuccessors(
    right: Point,
    left: Point,
    range: [number, number],
    newRoot: Point,
  ): SearchNode[] {
    const successors: SearchNode[] = [];

    for (let i = range[0]; i < range[1]; ++i) {
      const vertex = this.nextPolygon.vertices[i % this.nVertices];
      const nextVertex = this.nextPolygon.vertices[(i + 1) % this.nVertices];

      const rightPoint = (i === range[0]) ? right : vertex;
      const leftPoint = (i === range[1] - 1) ? left : nextVertex;

      const nextPolygon = this.nextPolygon.neighbours[(i + 1) % this.nVertices];

      if (nextPolygon.id === -1) {
        continue;
      }

      const g = this._g + this._root.distance(newRoot);

      const node = new SearchNode(
        this,
        newRoot,
        rightPoint,
        leftPoint,
        vertex,
        nextVertex,
        nextPolygon,
        g,
        this._goal,
      );

      successors.push(node);
    }

    return successors;
  }
  //#endregion

  //#region Comparators
  /**
   * Compare this node with another search node based on their f-values
   * @param other The other search node to compare with
   * @returns True if this node's cost is less than the other node, false otherwise
   */
  lt(other: SearchNode): boolean {
    if (this.f === other.f) {
      // If two nodes have the same f value, the one with the bigger g value is "smaller"
      return this.g > other._g;
    }

    return this.f < other.f;
  }
  //#endregion

  //#region Getters
  /**
   * Get the f-value of the node
   * @return The f-value, which is the sum of g and h
   */
  get f(): number {
    return this._g + this._h;
  }

  /**
   * Get the g-value of the node
   * @return The g-value, which is the cost to reach this node from the start node
   */
  get g(): number {
    return this._g;
  }

  /**
   * Get the h-value of the node
   * @return The h-value, which is the heuristic estimate of the cost to reach the goal from this node
   */
  get h(): number {
    return this._h;
  }

  /**
   * Get the parent node of this search node
   * @returns The parent search node or null if this is the root node
   */
  get parent(): SearchNode | null {
    return this._parent;
  }

  /**
   * Get the root point of the search node
   * @returns The root point of the search node
   */
  get root(): Point {
    return this._root;
  }

  /**
   * Get the next polygon to explore from this node
   * @returns The next polygon to explore
   */
  get nextPolygon(): Polygon {
    return this._nextPolygon;
  }

  /**
   * Get the number of vertices or sides of the next polygon
   * @returns The number of vertices in the next polygon
   */
  get nVertices(): number {
    return this.nextPolygon.vertices.length;
  }
  //#endregion

  toString(): string {
    return `SearchNode(${this.root.toString()}, [${this._right.toString()}, ${this._left.toString()}], f: ${+this
      .f.toFixed(2)}, g: ${this._g.toFixed(2)}, h: ${
      this._h.toFixed(2)
    }), next: ${this.nextPolygon.id})`;
  }
}
