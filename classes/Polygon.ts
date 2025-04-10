import { PolygonIndex, VertexIndex } from "../types.ts";

// A polygon on the mesh
export class Polygon {
  vertices: VertexIndex[] = [];
  neighbours: PolygonIndex[] = [];

  isOneWay: boolean = true; // has only one adjacent polygon, assume true
  isPolar: boolean = false; // is a polar polygon
  wrapsLon: boolean = false; // crosses the -180/180 meridian

  // Set the initial value to the max/min possible values
  minLat: number = 90;
  maxLat: number = -90;
  minLon: number = 180;
  maxLon: number = -180;

  constructor() {}

  setWrapsLon() {
    this.wrapsLon = this.maxLon - this.minLon > 180;
  }

  // Getters
  get lonLength(): number {
    if (this.isPolar) {
      return 360;
    }

    if (this.wrapsLon) {
      return 360 - Math.abs(this.maxLon - this.minLon);
    }

    return Math.abs(this.maxLon - this.minLon);
  }

  get lonMidpoint(): number {
    if (this.isPolar) {
      return 0;
    }

    if (this.wrapsLon) {
      if (this.minLon < this.maxLon) {
        return (this.minLon + this.maxLon + 360) / 2;
      }

      return (this.minLon + this.maxLon - 360) / 2;
    }

    return (this.minLon + this.maxLon) / 2;
  }
}
