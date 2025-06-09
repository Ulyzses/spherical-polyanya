import { assert } from "@std/assert/assert";
import { readLines } from "../utils.ts";
import Vertex from "./Vertex.ts";
import Point from "./Point.ts";
import Polygon from "./Polygon.ts";
import {
  PointLocation,
  PointLocationType,
  PolyContainmentType,
} from "../types.ts";

/** A class representing the mesh */
export default class Mesh {
  private _vertices: Vertex[] = [];
  private _polygons: Polygon[] = [];

  //#region Initialisers
  constructor() {}

  async read(filename: string): Promise<void> {
    const mapReader = readLines(filename);
    const firstLine = (await mapReader.next()).value;

    assert(firstLine, "File is empty or not readable");
    assert(
      firstLine.toLowerCase() === "sph",
      "Invalid file format: expected 'sph' header",
    );

    const secondLine = (await mapReader.next()).value;
    const [V, P] = secondLine.split(" ").map(Number) || [];

    assert(
      !isNaN(V) && !isNaN(P),
      "Invalid second line format: expected two numbers for vertices and polygons",
    );

    // Read vertices
    for (let i = 0; i < V; ++i) {
      const line = (await mapReader.next()).value;
      const [lat, lon, n, ...rest]: [number, number, number, ...number[]] = line
        .split(" ").map(Number);

      assert(
        !isNaN(lat) && !isNaN(lon) && !isNaN(n),
        `Invalid vertex format on line ${
          i + 3
        }: expected lat, lon, and n but got ${line}`,
      );
      assert(
        rest.length === n,
        `Invalid vertex format on line ${
          i + 3
        }: expected ${n} polygons but got ${rest.length}`,
      );

      const vertex = new Vertex(i, lat, lon, rest);
      this._vertices.push(vertex);
    }

    // Read polygons
    for (let i = 0; i < P; ++i) {
      const line = (await mapReader.next()).value;
      const [n, ...rest]: [number, ...number[]] = line.split(" ").map(Number);

      assert(
        !isNaN(n),
        `Invalid polygon format on line ${
          i + 3 + V
        }: expected n but got ${line}`,
      );
      assert(
        rest.length === 2 * n,
        `Invalid polygon format on line ${i + 3 + V}: expected ${
          2 * n
        } vertices and neighbours but got ${rest.length}`,
      );

      const polygon = new Polygon(i, rest.slice(0, n), rest.slice(n));
      this._polygons.push(polygon);
    }

    this._vertices.forEach((vertex) => vertex.setPolygons(this));
    this._polygons.forEach((polygon) => {
      polygon.setVertices(this);
      polygon.setNeighbours(this);
    });
  }
  //#endregion

  //#region Getters
  /**
   * Get the vertices of the mesh
   * @returns An array of vertices in the mesh
   */
  get vertices(): Vertex[] {
    return this._vertices;
  }

  /**
   * Get the polygons of the mesh
   * @returns An array of polygons in the mesh
   */
  get polygons(): Polygon[] {
    return this._polygons;
  }
  //#endregion

  //#region Functions
  /**
   * Get the location of a point in relation to the polygons in the mesh
   * @param p The point to check the location of
   * @returns An object describing the location of the point
   * @throws Will throw an error if the computed location type is unexpected
   * @todo Optimise this function by using spatial partitioning to reduce the number of polygon checks
   */
  getPointLocation(p: Point): PointLocation {
    for (const polygon of this._polygons) {
      const result = polygon.containsPoint(p);

      switch (result.type) {
        case PolyContainmentType.OUTSIDE:
          // The point is outside this polygon, continue checking others
          break;

        case PolyContainmentType.INSIDE:
          // The point is strictly inside this polygon
          return {
            type: PointLocationType.IN_POLYGON,
            polygons: [polygon],
            vertices: [],
          };

        case PolyContainmentType.ON_EDGE:
          // The point is on the edge of this polygon
          if (result.adjPoly.id === -1) {
            return {
              type: PointLocationType.ON_BORDER,
              polygons: [polygon],
              vertices: result.verts,
            };
          } else {
            return {
              type: PointLocationType.ON_EDGE,
              polygons: [polygon, result.adjPoly],
              vertices: result.verts,
            };
          }

        case PolyContainmentType.ON_VERTEX:
          return {
            type: (result.verts[0].isCorner)
              ? (result.verts[0].isAmbiguous)
                ? PointLocationType.ON_AMBIG_CORNER_VERTEX
                : PointLocationType.ON_UNAMBIG_CORNER_VERTEX
              : PointLocationType.ON_NON_CORNER_VERTEX,
            polygons: result.verts[0].polygons.filter((p) => p.id !== -1),
            vertices: result.verts,
          };

        default:
          throw new Error(`Unexpected containment type: ${result.type}`);
      }
    }

    // No polygon contains the point
    return {
      type: PointLocationType.IN_OBSTACLE,
      polygons: [],
      vertices: [],
    };
  }
  //#endregion

  toString(): string {
    let final = "Mesh {";

    for (const vertex of this._vertices) {
      final += `\n ${vertex.toString()},`;
    }

    for (const polygon of this._polygons) {
      final += `\n ${polygon}`;
    }

    final += "\n}";

    return final;
  }
}
