import { assert } from "@std/assert";
import Mesh from "./Mesh.ts";
import Point from "./Point.ts";
import Vertex from "./Vertex.ts";
import { Orientation, PolyContainment, PolyContainmentType } from "../types.ts";

/** A class representing polygons */
export default class Polygon {
  private _id: number;

  private _vIndices: number[] = [];
  private _nIndices: number[] = [];

  private _vertices: Vertex[] = []; // Will be set later once the mesh is available
  private _neighbours: Polygon[] = []; // Will be set later once the mesh is available

  private _isOneWay: boolean = true;

  //#region Initialisers
  /**
   * Create a polygon
   * @param vertices The indices of the vertices that make up the polygon
   * @param neighbours The indices of the neighbouring polygons
   * @throws Will throw an error if the vertices array has less than 3 elements or if the vertices and neighbours arrays have different lengths
   */
  constructor(id: number, vertices: number[], neighbours: number[]) {
    if (id !== -1) {
      assert(vertices.length >= 3, "A polygon must have at least 3 vertices");
      assert(
        vertices.length === neighbours.length,
        "Vertices and neighbours arrays must have the same length",
      );
    }

    this._id = id;
    this._vIndices = vertices;
    this._nIndices = neighbours;
  }

  /**
   * Set the neighbours based on a given mesh
   * @param mesh The mesh containing the list of polygons
   * @throws Will throw an error if the mesh polygons are not set or if any vertex index is out of bounds
   */
  setVertices(mesh: Mesh): void {
    assert(
      mesh.vertices,
      "Mesh vertices not set. Ensure the mesh is initialized properly.",
    );

    this._vertices = this._vIndices.map((vIndex) => {
      assert(
        vIndex >= 0 && vIndex < mesh.vertices.length,
        `Vertex index ${vIndex} is out of bounds for the mesh vertices array.`,
      );
      return mesh.vertices[vIndex];
    });
  }

  /**
   * Set the neighbours based on a given mesh
   * @param mesh The mesh containing the list of polygons
   * @throws Will throw an error if the mesh polygons are not set or if any neighbour index is out of bounds
   */
  setNeighbours(mesh: Mesh): void {
    assert(
      mesh.polygons,
      "Mesh polygons not set. Ensure the mesh is initialized properly.",
    );

    let foundTrav = false;

    for (const nIndex of this._nIndices) {
      assert(
        nIndex >= -1 && nIndex < mesh.polygons.length,
        `Neighbour index ${nIndex} is out of bounds for the mesh polygons array.`,
      );

      const polygon = nIndex === -1 ? Obstacle : mesh.polygons[nIndex];
      this._neighbours.push(polygon);

      if (nIndex === -1) {
        continue;
      }

      if (foundTrav) {
        if (this._isOneWay) {
          this._isOneWay = false;
        }
      } else {
        foundTrav = true;
      }
    }
  }

  //#endregion
  //#region Getters
  /**
   * Get the ID of the polygon
   * @returns The ID of the polygon
   */
  get id(): number {
    return this._id;
  }

  /**
   * Get the indices of the vertices that make up the polygon
   * @returns The indices of the vertices
   */
  get vIndices(): number[] {
    return this._vIndices;
  }

  /**
   * Get the vertices of the polygon
   * @returns The vertices of the polygon
   */
  get vertices(): Vertex[] {
    return this._vertices;
  }

  /**
   * Get the indices of the neighbouring polygons
   * @returns The indices of the neighbouring polygons
   */
  get nIndices(): number[] {
    return this._nIndices;
  }

  /**
   * Get the neighbours of the polygon
   * @returns The neighbours of the polygon
   */
  get neighbours(): Polygon[] {
    return this._neighbours;
  }

  /**
   * Check if the polygon is one-way
   * @returns True if the polygon is one-way, false otherwise
   */
  get isOneWay(): boolean {
    return this._isOneWay;
  }
  //#endregion

  //#region Functions
  /**
   * Check if a point lies within the polygon
   * @param point The point to check if it lies within the polygon
   * @returns An object representing the containment type of the point in relation to the polygon
   * @todo Improve the for-loop by keeping a persistent vertex variable to avoid recalculating the same vertex multiple times
   */
  containsPoint(point: Point): PolyContainment {
    const v = (i: number) => this.vertices[i % this.vertices.length];

    let onEdge = false;

    for (let i = 0; i < this.vertices.length; ++i) {
      const vertex = v(i);
      const nextVertex = v(i + 1);

      // Check if the point is a vertex
      if (point.equals(vertex)) {
        return {
          type: PolyContainmentType.ON_VERTEX,
          adjPoly: Obstacle,
          verts: [vertex],
        };
      }

      // We've previously seen that it lied on an edge but it's not a vertex
      if (onEdge) {
        return {
          type: PolyContainmentType.ON_EDGE,
          adjPoly: this.neighbours[i],
          verts: [v(i - 1), vertex],
        };
      }

      // Idea taken from https://math.stackexchange.com/questions/4012834/checking-that-a-point-is-in-a-spherical-polygon
      // Logic: When running through the vertices in an anti-clockwise fashion, if the angle formed by any two adjacent vertices and the point is anticlockwise, then the point is inside the polygon. Otherwise, if the angle is clockwise, then the point is outside the polygon.
      const orientation = Point.getOrientation(vertex, nextVertex, point);

      if (
        orientation === Orientation.COLLINEAR &&
        point.isBounded(vertex, nextVertex)
      ) {
        onEdge = true;
      } else if (orientation === Orientation.CLOCKWISE) {
        return {
          type: PolyContainmentType.OUTSIDE,
          adjPoly: Obstacle,
          verts: [],
        };
      }
    }

    if (onEdge) {
      return {
        type: PolyContainmentType.ON_EDGE,
        adjPoly: this.neighbours[0],
        verts: [v(this.vertices.length - 1), v(0)],
      };
    }

    return {
      type: PolyContainmentType.INSIDE,
      adjPoly: Obstacle,
      verts: [],
    };
  }
  //#endregion
}

// Default polygon representing an obstacle

/**
 * A default polygon representing an obstacle
 * @remarks This polygon has an ID of -1, no vertices, and no neighbours.
 * @todo Make this an implements of the Polygon class
 */
export const Obstacle = new Polygon(-1, [], []);
