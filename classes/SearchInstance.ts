import { assert } from "@std/assert/assert";
import { PointLocationType, PolyContainmentType, PolygonIndex, VertexIndex } from "../types.ts";
import { debug } from "../utils.ts";
import { Mesh, Orientation } from "./Mesh.ts";
import { Point } from "./Point.ts";
import { PriorityQueue } from "./PriorityQueue.ts";
import { SearchNode } from "./SearchNode.ts";

export class SearchInstance {
  mesh: Mesh;
  start: Point;
  end: Point;

  endPolygons!: PolygonIndex[];
  openList!: PriorityQueue<SearchNode>;

  nodesPushed: number = 0;
  finalNode!: SearchNode;

  constructor(mesh: Mesh, start: Point, end: Point) {
    this.mesh = mesh;
    this.start = start;
    this.end = end;

    const compare = (a: SearchNode, b: SearchNode): boolean => a.lt(b);
    this.openList = new PriorityQueue<SearchNode>(compare);
  }

  getHValue(root: Point, right: Point, left: Point) {
    if (root.eq(left) || root.eq(right)) {
      return root.distance(this.end);
    }

    let goal = this.end;

    // Check whether goal and root are on the same side of the interval
    // formed by right and left; reflect the goal if they are not
    assert(
      Mesh.getOrientation(root, right, left) === Orientation.CCW,
      `Root ${root.toString()} is not on the left of edge ${left.toString()}-${right.toString()}`,
    );

    if (Mesh.getOrientation(goal, right, left) === Orientation.CCW) {
      goal = Mesh.reflectPoint(goal, right, left);
    }

    if (Mesh.getOrientation(root, right, goal) === Orientation.CW) {
      return root.cosDistance(right) + right.cosDistance(goal);
    } else if (Mesh.getOrientation(root, left, goal) === Orientation.CCW) {
      return root.cosDistance(left) + left.cosDistance(goal);
    } else {
      return root.cosDistance(goal);
    }
  }

  genInitNodes(): void {
    debug(`Generating initial search nodes from ${this.start.toString()}`);

    const pl = this.mesh.getPointLocation(this.start);

    debug(`Start point type: ${pl.type}`);
    debug(`Start point is in polygons: ${pl.polygons.join(", ")}`);

    // To make it easier to work with, we'll store the mesh vertcies locally
    const v = this.mesh.vertices;

    const pushFromStart = (pIndex: PolygonIndex) => {
      debug(`Pushing from start in polygon ${pIndex}`);
      assert(pIndex >= 0, `Invalid polygon index: ${pIndex}`);
      assert(
        pIndex < this.mesh.polygons.length,
        `Polygon index out of bounds: ${pIndex}`,
      );

      if (this.endPolygons.includes(pIndex)) {
        // Trivial case: start and end points are in the same polygon
        debug("Start and end points are in the same polygon");
        this.finalNode = new SearchNode(
          null,
          this.start,
          this.start,
          this.start,
          -1,
          -1,
          pIndex,
          0,
          this.start.distance(this.end),
        );
      }

      const poly = this.mesh.polygons[pIndex];
      const nVertices = poly.vertices.length;

      // Loop through each edge
      let vertex = v[poly.vertices[0]];
      for (let i = 0; i < nVertices; ++i) {
        // Indices of l-r vertices of the edge
        const rightVertex = poly.vertices[i];
        const leftVertex = poly.vertices[(i + 1) % nVertices];

        const nextVertex = v[leftVertex];

        // Check first if the edge is actually traversable
        const nextPolygon = poly.neighbours[(i + 1) % nVertices];

        if (nextPolygon === -1) {
          vertex = nextVertex;
          continue;
        }

        const right = vertex;
        const left = nextVertex;

        if (this.start.eq(right) || this.start.eq(left)) {
          debug("Start point is on the vertex");
          vertex = nextVertex;
          continue;
        }

        if (Mesh.getOrientation(this.start, right, left) === Orientation.COLINEAR) {
          debug("Start point is on the edge");
          vertex = nextVertex;
          continue;
        }

        const parent = null;
        const root = this.start;

        const g = 0;
        const h = this.getHValue(root, right, left);

        const node = new SearchNode(
          parent,
          root,
          right,
          left,
          rightVertex,
          leftVertex,
          nextPolygon,
          g,
          h,
        );

        this.openList.push(node);
        this.nodesPushed++;

        vertex = nextVertex;
      }
    };

    if (pl.type === PointLocationType.IN_OBSTACLE) {
      debug("Start point is in an obstacle");
      return;
    }

    for (const pIndex of pl.polygons) {
      pushFromStart(pIndex);
    }
  }

  pushSuccessors(node: SearchNode, right: Point, left: Point, range: [VertexIndex, VertexIndex], newRoot: Point): void {
    debug(`Pushing successors in ${node.nextPolygon} from ${right.toString()}-${left.toString()}`);

    assert(range[0] !== undefined, `Invalid vertex range: ${range}`);
    assert(range[1] !== undefined, `Invalid vertex range: ${range}`);
    assert(range[0] < range[1], `Invalid vertex range: ${range}`);

    const v = this.mesh.vertices;
    const poly = this.mesh.polygons[node.nextPolygon];
    const nVertices = poly.vertices.length;

    for (let i = range[0]; i < range[1]; ++i) {
      const currVertex = poly.vertices[i % nVertices];
      const nextVertex = poly.vertices[(i + 1) % nVertices];

      debug(`Pushing successor on edge of vertex ${currVertex}`);

      const rightPoint = (i === range[0]) ? right : v[currVertex];
      const leftPoint = (i === range[1] - 1) ? left : v[nextVertex];

      const nextPolygon = poly.neighbours[(i + 1) % nVertices];

      if (nextPolygon === -1) {
        debug(`Next polygon is -1, skipping`);
        continue;
      }

      const g = node.g + node.root.distance(newRoot);
      const h = this.getHValue(newRoot, rightPoint, leftPoint);

      debug(`Node g: ${node.g}`);
      debug(`Root: ${node.root}`);
      debug(`New root: ${newRoot}`)
      debug(`Node distance: ${node.root.distance(newRoot)}`);

      debug(`g: ${g}`);
      debug(`h: ${h}`);

      const newNode = new SearchNode(
        node,
        newRoot,
        rightPoint,
        leftPoint,
        currVertex,
        nextVertex,
        nextPolygon,
        g,
        h,
      );

      this.openList.push(newNode);
      this.nodesPushed++;
    }
  }

  genSuccessors(node: SearchNode): void {
    assert(node.nextPolygon >= 0, `Invalid polygon index: ${node.nextPolygon}`);
    assert(
      node.nextPolygon < this.mesh.polygons.length,
      `Polygon index out of bounds: ${node.nextPolygon}`,
    );

    const poly = this.mesh.polygons[node.nextPolygon];
    const nVertices = poly.vertices.length;
    const v = this.mesh.vertices;

    // Local indices of the left and right vertices of the edge in the polygon. Running through the indices going from right to left will traverse all edges except the one whence the projection is from.
    const leftLocalVIndex = poly.vertices.findIndex(v => v === node.leftVertex) + nVertices;
    const rightLocalVIndex = leftLocalVIndex + 1 - nVertices;

    // Intersection of the left and right rays with the edges of the polygon
    let rightPoint!: Point;
    let leftPoint!: Point;

    // The range of vertices that are observable from the search node.
    // [a, b] but not including b when iterating
    const observableRange: [VertexIndex?, VertexIndex?] = [];
    const nonObservableRightRange: [VertexIndex, VertexIndex?] = [rightLocalVIndex,];
    const nonObservableLeftRange: [VertexIndex?, VertexIndex?] = [, leftLocalVIndex];

    for (let i = rightLocalVIndex; i < leftLocalVIndex; ++i) {
      debug(`Scanning vertex ${i}: ${poly.vertices[i % nVertices]}`);

      const vertex = v[poly.vertices[i % nVertices]];
      const nextVertex = v[poly.vertices[(i + 1) % nVertices]];

      if (!rightPoint) {
        // Project the right ray to the edge formed by vertex and nextVertex
        // It's a valid intersection if the angle formed by root, intersection,
        // and nextVertex is not clockwise
        const intersection = Point.getIntersection(
          node.root, node.right, vertex, nextVertex
        );

        if (intersection === false) {
          // The edge and the ray lie on the same great circle
          debug(`Colinear intersection`);

          rightPoint = vertex;
          observableRange[0] = i;
          nonObservableRightRange[1] = i;
          continue;
        }

        for (const r of intersection) {
          const containmentType = this.mesh.polyContainsPoint(node.nextPolygon, r).type;

          if (containmentType === PolyContainmentType.OUTSIDE) {
            continue;
          }

          assert(containmentType !== PolyContainmentType.INSIDE, `Invalid containment type: ${containmentType}`);

          const orientation = Mesh.getOrientation(node.root, r, nextVertex);

          if (orientation === Orientation.CW) {
            break;
          }

          // The right intersection is valid

          if (orientation === Orientation.COLINEAR) {
            debug(`Next vertex is colinear with the right ray`);
            
            assert(r.eq(nextVertex), `Right intersection is not equal to next vertex: ${r.toString()} != ${nextVertex.toString()}`);

            debug(`Right intersection is ${r.toString()}`);

            rightPoint = nextVertex;
            observableRange[0] = i + 1;

            break;
          }
          
          debug(`Next vertex is anticlockwise with the right ray`);
          debug(`Right intersection is ${r.toString()}`);

          rightPoint = r;
          observableRange[0] = i;
          nonObservableRightRange[1] = r.eq(vertex) ? i : i + 1;
        }
      }
      
      if (rightPoint && !leftPoint) {
        // Project the left ray to the edge formed by vertex and nextVertex
        // It's a valid intersection if the angle formed by root, intersection,
        // and vertex is clockwise

        const intersection = Point.getIntersection(
          node.root, node.left, vertex, nextVertex
        );

        if (intersection === false) {
          // The edge and the ray lie on the same great circle
          debug(`Colinear intersection`);

          leftPoint = nextVertex;
          observableRange[1] = i + 1;
          nonObservableLeftRange[0] = i + 1;
          continue;
        }

        for (const l of intersection) {
          const containmentType = this.mesh.polyContainsPoint(node.nextPolygon, l).type;
        
          if (containmentType === PolyContainmentType.OUTSIDE) {
            continue;
          }

          assert(containmentType !== PolyContainmentType.INSIDE, `Invalid containment type: ${containmentType}`);

          const orientation = Mesh.getOrientation(node.root, l, vertex);

          assert(orientation === Orientation.CW, `Left intersection should not be colinear or anticlockwise as it should have already been handled prior`);

          // The left intersection is valid
          
          if (l.eq(nextVertex)) {
            debug(`Next vertex is colinear with the left ray`);
            debug(`Left intersection is ${l.toString()}`);

            leftPoint = nextVertex;
            observableRange[1] = i + 1;
            nonObservableLeftRange[0] = i + 1;

            break;
          }

          debug(`Vertex is clockwise with the left ray`);
          debug(`Left intersection is ${l.toString()}`);

          leftPoint = l;
          observableRange[1] = i + 1;
          nonObservableLeftRange[0] = i;
        }
      }

      if (rightPoint && leftPoint) {
        // We have both points, we can stop scanning
        break;
      }
    }

    assert(rightPoint !== undefined, `Right point is undefined`);
    assert(leftPoint !== undefined, `Left point is undefined`);
    assert(observableRange[0] !== undefined, `Observable range is undefined`);
    assert(observableRange[1] !== undefined, `Observable range is undefined`);
    assert(observableRange[0] < observableRange[1], `Observable range is invalid: ${observableRange}`);
    assert(nonObservableRightRange[0] !== undefined, `Non-observable right range is undefined`);
    assert(nonObservableRightRange[1] !== undefined, `Non-observable right range is undefined`);
    assert(nonObservableLeftRange[0] !== undefined, `Non-observable left range is undefined`);
    assert(nonObservableLeftRange[1] !== undefined, `Non-observable left range is undefined`);
    

    debug('SUMMARY');
    debug('Root point: ' + node.root.toString());
    debug(`Non-observable right range: ${nonObservableRightRange}`);
    debug(`Observable range: ${observableRange}`);
    debug(`Non-observable left range: ${nonObservableLeftRange}`);
    debug(`Right point: ${rightPoint.toString()}`);
    debug(`Left point: ${leftPoint.toString()}`);
    debug(`Right vertex: ${poly.vertices[observableRange[0] % nVertices]}`);
    debug(`Left vertex: ${poly.vertices[observableRange[1] % nVertices]}`);
    debug(`Interval right index: ${poly.vertices[rightLocalVIndex % nVertices]}`);
    debug(`interval left index: ${poly.vertices[leftLocalVIndex % nVertices]}`);

    this.pushSuccessors(node, rightPoint, leftPoint, observableRange as [VertexIndex, VertexIndex], node.root);

    // Check if the right vertex has non-observable successors
    if (node.right.eq(v[node.rightVertex]) &&
        v[node.rightVertex].isCorner &&
        nonObservableRightRange[1] > nonObservableRightRange[0]) {
      debug(`Right vertex has non-observable successors`);

      this.pushSuccessors(node, node.right, rightPoint, nonObservableRightRange as [VertexIndex, VertexIndex], node.right);
    }

    // Check if the left vertex has non-observable successors
    if (node.left.eq(v[node.leftVertex]) &&
        v[node.leftVertex].isCorner &&
        nonObservableLeftRange[1] > nonObservableLeftRange[0]) {
      debug(`Left vertex has non-observable successors`);

      this.pushSuccessors(node, leftPoint, node.left, nonObservableLeftRange as [VertexIndex, VertexIndex], node.left);
    }
  }

  generatePath(): [Point[], number] {
    const path = [this.end];
    const node = this.finalNode;

    // Generate a new final turning point if the goal is not observable
    assert(node, "No final node found");

    let distance = node.f;

    // Checking right non-observable
    if (Mesh.getOrientation(node.root, node.right, this.end) === Orientation.CW) {
      path.unshift(node.right);
      distance += node.right.distance(this.end);
    } else if (Mesh.getOrientation(node.root, node.left, this.end) === Orientation.CCW) {
      path.unshift(node.left);
      distance += node.left.distance(this.end);
    }

    let currNode = node;

    while (currNode.parent) {
      if (!currNode.root.eq(currNode.parent.root)) {
        path.unshift(currNode.root);
      }

      currNode = currNode.parent;
    }

    path.unshift(this.start);

    return [path, distance];
  }

  search(): [Point[], number] {
    // Returns the path and distance from start to end

    debug(
      `Starting search from ${this.start.toString()} to ${this.end.toString()}`,
    );

    // Seeing any one of these in the next search node means we are done
    this.endPolygons = this.mesh.getPointLocation(this.end).polygons;

    if (this.endPolygons.length === 0) {
      debug("No polygons found for end point");
      return [[], 0];
    }

    debug(
      `End point is in polygon: ${this.endPolygons.join(", ")}`,
    );

    // Generate initial search nodes from the starting point
    this.genInitNodes();

    // The initial nodes include the final node
    if (this.finalNode) {
      debug("Found final node");
      return this.generatePath();
    }

    if (this.openList.isEmpty) {
      debug("No nodes to search from");
      return [[], 0];
    }

    debug(`Open list: ${this.openList.toString()}`);

    // Start the search

    while (!this.finalNode) {
      if (this.openList.isEmpty) {
        debug("No nodes left to search");
        break;
      }

      const node = this.openList.pop();

      if (node.nextPolygon === -1) {
        // The node is a dead end
        debug("Dead end node");
        continue;
      }

      // Check if the node is a goal node
      if (this.endPolygons.includes(node.nextPolygon)) {
        // BUG: This also triggers even if the point is not necessarily visible
        // from the current node root. Need to check if it's actually visible
        debug("Found final node");
        this.finalNode = node;
      
        return this.generatePath();
      }

      this.genSuccessors(node);
    }

    return [[], 0];
  }
}
