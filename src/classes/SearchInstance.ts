import { Orientation, PointLocationType } from "../types.ts";
import Mesh from "./Mesh.ts";
import Point from "./Point.ts";
import Polygon from "./Polygon.ts";
import PriorityQueue from "./PriorityQueue.ts";
import SearchNode from "./SearchNode.ts";

export default class SearchInstance {
  private _mesh: Mesh;
  private _start: Point;
  private _end: Point;

  private _endPolygons!: Polygon[];
  private _finalNode!: SearchNode;

  private _openList: PriorityQueue<SearchNode>;
  private _history: Map<string, number>;

  /**
   * Create a search instance
   * @param mesh The mesh containing the polygons and vertices
   * @param start The starting point of the search
   * @param end The ending point of the search
   */
  constructor(mesh: Mesh, start: Point, end: Point) {
    this._mesh = mesh;
    this._start = start;
    this._end = end;

    const compare = (a: SearchNode, b: SearchNode): boolean => a.lt(b);
    this._openList = new PriorityQueue<SearchNode>(compare);
    this._history = new Map<string, number>();
  }

  /**
   * Initialise the search nodes based on the start point.
   * @remarks This method effectively creates the search nodes with the edges of the polygons that contain the start point, skipping edges that contain it.
   */
  private genInitNodes(): void {
    const pl = this._mesh.getPointLocation(this._start);

    // No search nodes can be generated if the start point is not in any polygon
    if (pl.type === PointLocationType.IN_OBSTACLE) {
      console.debug("Start point is in an obstacle.");
      return;
    }

    // Loop through each polygon that incident to the start point
    for (const polygon of pl.polygons) {
      const nVertices = polygon.vertices.length;

      // Trivial case: start and end points are in the same polygon
      if (this._endPolygons.some((p) => p.id === polygon.id)) {
        console.debug(`Start point is in the end polygon ${polygon.id}.`);
        this._finalNode = new SearchNode(
          null,
          this._start,
          this._end,
          this._end,
          null,
          null,
          polygon,
          0,
          this._end,
        );

        return;
      }

      // Loop through each edge in the polygon
      for (let i = 0; i < nVertices; ++i) {
        const right = polygon.vertices[i];
        const left = polygon.vertices[(i + 1) % nVertices];

        // Check if the point is on the edge (also handles vertices), skip if so
        if (
          Point.getOrientation(this._start, right, left) ===
            Orientation.COLLINEAR && this._start.isBounded(right, left)
        ) {
          console.debug(`Start point is on the edge ${right.id}-${left.id}.`);
          continue;
        }

        // Check if next polygon exists, skip if not
        const nextPolygon = polygon.neighbours[(i + 1) % nVertices];

        if (nextPolygon.id === -1) {
          console.debug(
            `No next polygon for edge ${right.id}-${left.id}. Skipping.`,
          );
          continue;
        }

        // The edge passes the checks, create a new search node using it
        const parent = null;
        const root = this._start;
        const g = 0;

        const node = new SearchNode(
          parent,
          root,
          right,
          left,
          right,
          left,
          nextPolygon,
          g,
          this._end,
        );

        this._openList.push(node);
      }
    }
  }

  search(): [Point[], number] {
    console.debug(
      `Starting search from ${this._start.toString()} to ${this._end.toString()}...`,
    );

    this._endPolygons = this._mesh.getPointLocation(this._end).polygons;

    if (this._endPolygons.length === 0) {
      console.debug("No polygons found for the end point.");
      return [[], 0];
    }

    console.debug(
      `End point is in ${this._endPolygons.length} polygons: ${
        this._endPolygons.map((p) => p.id).join(", ")
      }`,
    );

    this.genInitNodes();

    console.debug(`Initial nodes generated: ${this._openList.size} nodes.`);
    console.debug(this._openList.toString());

    if (this._finalNode) {
      console.debug("Final node already found in initial nodes.");
      return [[this._start, this._end], this._start.distance(this._end)];
    }

    while (!this._finalNode) {
      if (this._openList.isEmpty) {
        console.debug("Open list is empty, no path found.");
        break;
      }

      const node = this._openList.pop();

      if (this._endPolygons.some((p) => p.id === node.nextPolygon.id)) {
        console.debug("End polygon found in current node.");
        this._finalNode = node.genFinalNode();
        break;
      }

      const successors = node.genSuccessors();
      console.debug(
        `Generated ${successors.length} successors for node with root ${node.root.toString()}.`,
      );

      for (const successor of successors) {
        const key = successor.root.asKey;

        if (!this._history.has(key) || this._history.get(key)! >= successor.g) {
          console.debug(
            `Adding successor ${key} with g-value ${successor.g} to history.`,
          );
          this._history.set(key, successor.g);
          this._openList.push(successor);
        } else {
          console.debug(
            `Successor ${key} with g-value ${successor.g} already exists in history with a better or equal g-value.`,
          );
        }
      }
    }

    if (!this._finalNode) {
      console.debug("No final node found, returning empty path.");
      return [[], 0];
    }

    console.debug(this._finalNode.toString());
    const path: Point[] = this.getPath(this._finalNode);

    return [path, this._finalNode.f];
  }

  /**
   * Traces the path from the given search node back to the start point.
   * @param node The search node to get the path from
   * @returns The path as an array of points from the start to the end
   */
  getPath(node: SearchNode): Point[] {
    const path: Point[] = [];
    let current: SearchNode | null = node;
    let last = this._end;

    path.unshift(last);

    while (current) {
      if (!current.root.equals(last)) {
        last = current.root;
        path.unshift(last);
      }

      current = current.parent;
    }

    return path;
  }

  traverseNodes(node: SearchNode): void {
    let current: SearchNode | null = node;

    while (current) {
      console.debug(current.toString());
      current = current.parent;
    }
  }
}
