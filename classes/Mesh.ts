import { assert } from "@std/assert/assert";
import {
  PointLocation,
  PointLocationType,
  PolyContainment,
  PolyContainmentType,
  PolygonIndex,
  VertexIndex,
} from "../types.ts";
import { debug, readlines } from "../utils.ts";
import { Vertex } from "./Vertex.ts";
import { Polygon } from "./Polygon.ts";
import { Point } from "./Point.ts";
import { EPSILON } from "../constants.ts";

export enum Orientation {
  CCW,
  COLINEAR,
  CW,
}

export class Mesh {
  vertices: Vertex[] = []; // array of vertices
  polygons: Polygon[] = []; // array of polygons

  bands: Map<number, PolygonIndex[]> = new Map();
  latArray!: number[];

  constructor() {}

  async read(file: string) {
    debug(`Reading mesh from ${file}`);

    const mapReader = readlines(file);
    const firstLine = (await mapReader.next()).value;

    assert(
      firstLine.toLowerCase() === "sph",
      `Invalid file format: expected 'sph' but got '${firstLine}'`,
    );

    const secondLine = (await mapReader.next()).value;
    const [V, P] = secondLine.split(" ").map(Number);

    assert(
      !isNaN(V) && !isNaN(P),
      `Invalid file format: expected two numbers but got '${secondLine}'`,
    );

    // Read vertices
    for (let i = 0; i < V; ++i) {
      const line = (await mapReader.next()).value;
      const [lat, lon, n, ...rest]: [
        number,
        number,
        number,
        ...PolygonIndex[],
      ] = line.split(" ").map(Number);

      assert(
        !isNaN(lat) && !isNaN(lon) && !isNaN(n),
        `Invalid vertex format: expected lat, lon, n but got '${line}'`,
      );

      assert(
        n === rest.length,
        `Invalid vertex format: expected ${n} polygons but got ${rest.length}`,
      );

      const vertex = new Vertex(lat, lon, rest);

      // Read the polygons for each vertex;
      for (let j = 0; j < n; ++j) {
        const pIndex = rest[j] as PolygonIndex;

        if (lat === 80.8908) {
          debug(`Vertex ${i} has a polygon index of ${pIndex}`);
        }

        assert(
          pIndex >= -1 && pIndex < P,
          `Invalid polygon index: ${pIndex}`,
        );
        
        if (pIndex === -1) {
          if (vertex.isCorner) {
            vertex.isAmbiguous = true;
          } else {
            vertex.isCorner = true;
          }
        }
      }

      // Check that there are no adjacent obstacles
      assert(
        vertex.polygons.findIndex((p, i) => {
          return p === -1 &&
            vertex.polygons[(i + 1) % vertex.polygons.length] === -1;
        }),
        `Vertex ${i} has adjacent obstacles`,
      );

      this.vertices.push(vertex);
    }

    // Read polygons
    for (let i = 0; i < P; ++i) {
      const line = (await mapReader.next()).value;
      const [n, ...rest]: [number, ...(VertexIndex | PolygonIndex)[]] = line
        .split(" ").map(Number);

      assert(
        !isNaN(n),
        `Invalid polygon format: expected n but got '${line}'`,
      );

      assert(
        2 * n === rest.length,
        `Invalid rest format: expected ${n} vertices and neighbours but got ${rest.length}`,
      );

      assert(
        n >= 3,
        `Invalid polygon size: expected at least 3 vertices but got ${n}`,
      );

      const polygon = new Polygon();

      let foundTrav = false; // traversable

      // Reading the vertices and neighbours for each polygon
      for (let j = 0; j < n; ++j) {
        // Vertex
        const vIndex = rest[j] as VertexIndex;

        assert(
          vIndex >= 0 && vIndex < V,
          `Invalid vertex index: ${vIndex}`,
        );

        // Set the bounds
        const lat = this.vertices[vIndex].lat;
        const lon = this.vertices[vIndex].lon;

        polygon.minLat = Math.min(polygon.minLat, lat);
        polygon.maxLat = Math.max(polygon.maxLat, lat);

        // If the vertex is on the pole, disregard the longitude
        if (Math.abs(lat) !== 90) {
          polygon.minLon = Math.min(polygon.minLon, lon);
          polygon.maxLon = Math.max(polygon.maxLon, lon);
        }

        polygon.vertices.push(vIndex);

        // Polygon
        const pIndex = rest[n + j] as PolygonIndex;

        assert(
          pIndex >= -1 && pIndex < P,
          `Invalid polygon index: ${pIndex}`,
        );

        if (pIndex !== -1) {
          if (foundTrav) {
            if (polygon.isOneWay) {
              polygon.isOneWay = false; // not one way
            }
          } else {
            foundTrav = true; // found an adjacent traversable polygon
          }
        }

        polygon.neighbours.push(pIndex);
      }

      polygon.setWrapsLon();

      this.polygons.push(polygon);
    }

    this.calculateBands();

    debug(
      `Generated mesh with ${this.vertices.length} vertices, ${this.polygons.length} polygons, and ${this.bands.size} bands`,
    );
    debug(this);

    this.test();
  }

  // BUG: Bands not sorting correctly due to polygons that pass the -180/180
  // meridian. Need to sort it out first. In the meantime, search for the
  // containing polygon will be done optimally via the latitudes only.
  calculateBands() {
    debug("Calculating bands");

    // Create a new band for each observed latitude
    for (const v of this.vertices) {
      const lat = v.lat;

      if (!this.bands.has(lat)) {
        this.bands.set(lat, []);
      }
    }

    this.latArray = Array.from(this.bands.keys()).sort((a, b) => a - b);
    debug(`Found ${this.latArray.length} bands`);

    // For each polygon, check if it intersects with the bands
    // and add the polygon index to the corresponding band
    for (let i = 0; i < this.polygons.length; ++i) {
      const p = this.polygons[i];

      for (const lat of this.latArray) {
        if (lat >= p.minLat && lat <= p.maxLat) {
          this.bands.get(lat)!.push(i);
        }
      }
    }

    // Check if any polygon is polar
    const maxKey = Math.max(...this.latArray);
    const minKey = Math.min(...this.latArray);

    if (maxKey !== 90) {
      // No need to check for a case where max lat is 90 because it means a
      // polygon with a vertex on the pole already exists

      const northBand = this.bands.get(maxKey);
      assert(northBand, `North band not found`);

      for (const pIndex of northBand) {
        const p = this.polygons[pIndex];
        const type = this.polyContainsPoint(pIndex, new Point(90, 0)).type;

        if (type === PolyContainmentType.INSIDE) {
          // Only one polygon can be entirely polar
          p.isPolar = true;
          p.maxLat = 90;
          this.bands.set(90, [pIndex]);
          this.latArray.push(90);
          break;
        } else if (type === PolyContainmentType.ON_EDGE) {
          // More than one polygon can be polar
          p.maxLat = 90;

          if (this.bands.has(90)) {
            this.bands.get(90)!.push(pIndex);
          } else {
            this.bands.set(90, [pIndex]);
            this.latArray.push(90);
          }
        }

        if (type === PolyContainmentType.ON_VERTEX) {
          // Should have already been taken into consideration
          assert(false, `Polygon ${pIndex} has a vertex on the north pole.`);
        }
      }
    }

    if (minKey !== -90) {
      // No need to check for a case where max lat is 90 because it means a
      // polygon with a vertex on the pole already exists

      const southBand = this.bands.get(minKey);
      assert(southBand, `South band not found`);

      for (const pIndex of southBand) {
        const p = this.polygons[pIndex];
        const type = this.polyContainsPoint(pIndex, new Point(-90, 0)).type;

        if (type === PolyContainmentType.INSIDE) {
          // Only one polygon can be entirely polar
          p.isPolar = true;
          p.minLat = -90;
          this.bands.set(-90, [pIndex]);
          this.latArray.unshift(-90);
          break;
        } else if (type === PolyContainmentType.ON_EDGE) {
          // More than one polygon can be polar
          p.minLat = -90;

          if (this.bands.has(-90)) {
            this.bands.get(-90)!.push(pIndex);
          } else {
            this.bands.set(-90, [pIndex]);
            this.latArray.push(-90);
          }
        }

        if (type === PolyContainmentType.ON_VERTEX) {
          // Should have already been taken into consideration
          assert(false, `Polygon ${pIndex} has a vertex on the north pole.`);
        }
      }
    }

    this.bands.forEach((pInds) => {
      pInds.sort((a, b) => {
        const ap = this.polygons[a];
        const bp = this.polygons[b];

        // If midpoints are the same, sort based on longitude width
        if (ap.lonMidpoint === bp.lonMidpoint) {
          return ap.lonLength - bp.lonLength;
        }

        return ap.lonMidpoint - bp.lonMidpoint;
      });
    });

    debug(`Generated ${this.bands.size} bands`);
    debug(this.bands);
  }

  getPointLocation(p: Point): PointLocation {
    debug(`Getting point location for ${p}`);
    const IN_OBSTACLE = {
      type: PointLocationType.IN_OBSTACLE,
      polygons: [],
      vertices: [],
    };

    // Find the latitude band just above the point
    const bandIndex = this.latArray.findIndex((lat) => lat >= p.lat);

    if (bandIndex === -1) {
      return IN_OBSTACLE;
    }

    // Find the polygons closest to the point via latitude
    const polys = bandIndex === 0 || p.lat === this.latArray[bandIndex]
      ? this.bands.get(this.latArray[bandIndex])!
      : this.bands.get(this.latArray[bandIndex - 1])!;

    // ONGOING BUGFIX: Use the zigzag search algorithm to find the polygon
    // closest to the point via longitude, cannot implement due to the fact that
    // the polygons are not sorted by. Portugal has a working implementation of
    // this. For now, just use a linear search.
    for (const pIndex of polys) {
      const result = this.polyContainsPoint(pIndex, p);

      switch (result.type) {
        case PolyContainmentType.OUTSIDE:
          // Does not contain the point
          break;

        case PolyContainmentType.INSIDE:
          // Strictly contains the point
          return {
            type: PointLocationType.IN_POLYGON,
            polygons: [pIndex],
            vertices: [],
          };

        case PolyContainmentType.ON_EDGE:
          // The point is on the edge of the polygon
          if (result.adjPoly !== -1) {
            return {
              type: PointLocationType.ON_EDGE,
              polygons: [pIndex, result.adjPoly],
              vertices: result.verts,
            };
          } else {
            return {
              type: PointLocationType.ON_MESH_BORDER,
              polygons: [pIndex],
              vertices: result.verts,
            };
          }

        case PolyContainmentType.ON_VERTEX: {
          debug(`Point ${p} is on vertex ${result.verts}`);
          // The point is on a vertex of the polygon
          const vertex = this.vertices[result.verts[0]];
          debug(`Polygons: ${vertex.polygons}`);

          return {
            type: (vertex.isCorner)
              ? (vertex.isAmbiguous)
                ? PointLocationType.ON_AMBIG_CORNER_VERTEX
                : PointLocationType.ON_UNAMBIG_CORNER_VERTEX
              : PointLocationType.ON_NON_CORNER_VERTEX,
            polygons: vertex.polygons.filter((p) => p !== -1),
            vertices: result.verts,
          };
        }

        default:
          // Should not be reachable
          assert(false, `Invalid polygon containment type: ${result.type}`);
      }
    }

    // No polygon contains the point
    return IN_OBSTACLE;
  }

  polyContainsPoint(polyIndex: PolygonIndex, p: Point): PolyContainment {
    // debug(`Checking if polygon ${polyIndex} contains point ${p}`);
    const poly = this.polygons[polyIndex];
    const nVertices = poly.vertices.length;

    let onEdge = false;
    let vertex = this.vertices[poly.vertices[0]];

    for (let i = 0; i < nVertices; ++i) {
      // debug(`Checking vertex ${i} ${vertex}`);
      const nextVertex = this.vertices[poly.vertices[(i + 1) % nVertices]];

      if (p.eq(vertex)) {
        debug(`Point ${p} is a vertex of polygon ${polyIndex}`);
        return {
          type: PolyContainmentType.ON_VERTEX,
          adjPoly: -1,
          verts: [poly.vertices[i]],
        };
      }

      // We've previously seen that it lied on an edge but is not a vertex
      if (onEdge) {
        return {
          type: PolyContainmentType.ON_EDGE,
          adjPoly: poly.neighbours[i],
          // Safe to assume that i - 1 >= 0 for the index
          verts: [poly.vertices[i - 1], poly.vertices[i]],
        };
      }

      // Idea taken from https://math.stackexchange.com/questions/4012834/checking-that-a-point-is-in-a-spherical-polygon
      // Logic: When running through the vertices in an anti-clockwise fashion,
      // if the angle formed by any two adjacent vertices and the point is
      // anticlockwise, then the point is inside the polygon. Otherwise, if the
      // angle is clockwise, then the point is outside the polygon.
      const orientation = Mesh.getOrientation(vertex, nextVertex, p);

      if (
        orientation === Orientation.COLINEAR &&
        Point.isPointBounded(p, vertex, nextVertex)
      ) {
        onEdge = true;
      } else if (orientation === Orientation.CW) {
        return {
          type: PolyContainmentType.OUTSIDE,
          adjPoly: -1,
          verts: [],
        };
      }

      vertex = nextVertex;
    }

    if (onEdge) {
      return {
        type: PolyContainmentType.ON_EDGE,
        adjPoly: poly.neighbours[0],
        verts: [poly.vertices[nVertices - 1], poly.vertices[0]],
      };
    }

    return {
      type: PolyContainmentType.INSIDE,
      adjPoly: -1,
      verts: [],
    };
  }

  static getOrientation(p1: Point, p2: Point, p3: Point): Orientation {
    if (p1.eq(p2) || p1.eq(p3) || p2.eq(p3)) {
      return Orientation.COLINEAR;
    }

    const dot = Point.crossThenDot(p1, p2, p3);

    if (dot > EPSILON) {
      return Orientation.CCW;
    } else if (dot < -EPSILON) {
      return Orientation.CW;
    }

    return Orientation.COLINEAR;
  }

  static reflectPoint(p: Point, right: Point, left: Point) {
    const N = right.cross(left);
    const dot = p.dot(N);
    const double = N.scale(2 * dot);

    const reflected = p.subtract(double);

    return reflected;
  }

  test() {
    debug("Testing mesh");
    // const p1 = new Point(90, 0);
    // const p2 = new Point(0, 0);
    // const p3 = new Point(45, 10);
    // const p4 = new Point(-13, -38);

    // debug(this.getPointLocation(p1));
    // debug(this.polyContainsPoint(0, p1));
    // debug(this.polyContainsPoint(1, p1));
    // debug(this.polyContainsPoint(2, p1));

    // debug(Mesh.reflectPoint(p3, p2, p1));
    // debug(this.getPointLocation(p4));

    // const poly6 = this.polygons[6];

    const p1 = new Point(-45, -154);
    debug(this.polyContainsPoint(6, p1));
    debug(Point.isPointBounded(p1, this.vertices[3], this.vertices[4]))

    const p2 = new Point(-10, 90);
    debug(this.polyContainsPoint(1, p2));

    debug("Finished testing mesh");
  }
}

// ampanget mo marius - pix
