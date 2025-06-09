import { assert } from "@std/assert";
import Mesh from "./Mesh.ts";
import Point from "./Point.ts";
import { default as Polygon, Obstacle } from "./Polygon.ts";

/**
 * A class representing a vertex on the mesh
 * @extends Point
 */
export default class Vertex extends Point {
  private _id: number;
  private _isCorner: boolean = false;
  private _isAmbiguous: boolean = false;

  private _pIndices: number[] = [];
  private _polygons: Polygon[] = []; // Will be set later once the mesh is available

  //#region Initialisers
  /**
   * Create a vertex
   * @param lat The latitude of the vertex in degrees
   * @param lon The longitude of the vertex in degrees
   * @param polygons The indices of the polygons the vertex belongs to
   * @throws Will throw an error if polygons array is empty
   */
  constructor(id: number, lat: number, lon: number, polygons: number[]) {
    super(lat, lon);

    this._id = id;
    assert(polygons.length > 1, "Vertices must have at least 2 polygons");

    this._pIndices = polygons;
  }

  /**
   * Set the polygons based on a given mesh
   * @param mesh The mesh containing the list of polygons
   * @throws Will throw an error if mesh polygons are not set
   * @remarks This method also sets whether the vertex is a corner or ambiguous based on its polygons
   */
  setPolygons(mesh: Mesh): void {
    assert(
      mesh.polygons,
      "Mesh polygons not set. Ensure the mesh is initialized properly.",
    );

    for (const pIndex of this._pIndices) {
      assert(
        pIndex >= -1 && pIndex < mesh.polygons.length,
        `Polygon index ${pIndex} is out of bounds for the mesh polygons array.`,
      );

      const polygon = pIndex === -1 ? Obstacle : mesh.polygons[pIndex];
      this._polygons.push(polygon);

      if (pIndex === -1) {
        if (this.isCorner) {
          this._isAmbiguous = true;
        } else {
          this._isCorner = true;
        }
      }
    }
  }
  //#endregion

  //#region Getters
  /**
   * Get the ID of the vertex
   * @returns The ID of the vertex
   */
  get id(): number {
    return this._id;
  }

  /**
   * Get whether the vertex is a corner
   * @returns True if the vertex is a corner, false otherwise
   */
  get isCorner(): boolean {
    return this._isCorner;
  }

  /**
   * Get whether the vertex is ambiguous
   * @returns True if the vertex is ambiguous, false otherwise
   */
  get isAmbiguous(): boolean {
    return this._isAmbiguous;
  }

  /**
   * Get the indices of the polygons the vertex belongs to
   * @returns An array of polygon indices
   */
  get pIndices(): number[] {
    return this._pIndices;
  }

  /**
   * Get the polygons the vertex belongs to
   * @returns An array of Polygon objects
   * @throws Will throw an error if polygons are not set
   */
  get polygons(): Polygon[] {
    assert(this._polygons, "Polygons not set. Call setPolygons() first.");

    return this._polygons;
  }
  //#endregion

  override toString(): string {
    return `Vertex(${this._id}, (${+this.lat.toFixed(2)}, ${+this.lon.toFixed(
      2,
    )}))`;
  }
}
