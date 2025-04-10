import { Point } from "./Point.ts";
import { PolygonIndex } from "../types.ts";

// A point on the polygon mesh.
export class Vertex extends Point {
  isCorner: boolean = false; // adjacent to an obstacle polygon
  isAmbiguous: boolean = false; // adjacent to multiple obstacle polygons
  polygons: PolygonIndex[] = []; // indices of polygons adjacent to this vertex

  constructor(lat: number, lon: number, polygons: PolygonIndex[]) {
    super(lat, lon);
    this.polygons = polygons;
  }
}
