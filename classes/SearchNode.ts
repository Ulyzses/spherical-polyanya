import { PolygonIndex, VertexIndex } from "../types.ts";
import { Point } from "./Point.ts";

export class SearchNode {
  parent: SearchNode | null;

  root: Point;
  right: Point;
  left: Point;

  rightVertex: VertexIndex;
  leftVertex: VertexIndex;

  nextPolygon: PolygonIndex;

  g: number;
  h: number;

  constructor(
    parent: SearchNode | null,
    root: Point,
    right: Point,
    left: Point,
    rightVertex: VertexIndex,
    leftVertex: VertexIndex,
    nextPolygon: PolygonIndex,
    g: number,
    h: number,
  ) {
    this.parent = parent;
    this.root = root;
    this.left = left;
    this.right = right;
    this.leftVertex = leftVertex;
    this.rightVertex = rightVertex;
    this.nextPolygon = nextPolygon;
    this.g = g;
    this.h = h;
  }

  // Comparers
  lt(other: SearchNode): boolean {
    if (this.f === other.f) {
      // If two nodes have the same f, the one with bigger g is "smaller"
      return this.g > other.g;
    }

    return this.f < other.f;
  }

  gt(other: SearchNode): boolean {
    return !this.lt(other);
  }

  // Getters
  get f(): number {
    return this.g + this.h;
  }

  // Print function
  toString(): string {
    return `SearchNode(${this.root.toString()}, [${this.right.toString()}, ${this.left.toString()}], f: ${
      this.f.toFixed(2)
    }, g: ${this.g}, h: ${this.h.toFixed(2)}, next: ${this.nextPolygon})`;
  }
}
