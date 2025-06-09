import { assert } from "@std/assert";
import { EPSILON, TO_DEG, TO_RAD } from "../constants.ts";
import { Orientation } from "../types.ts";
import { isEqual, isZero } from "../utils.ts";
import Vector from "../classes/Vector.ts";

/**
 * A class representing a point on the sphere
 * @extends Vector
 */
export default class Point extends Vector {
  private _lat: number;
  private _lon: number;

  //#region Initialisers
  /**
   * Create a point
   * @param lat The latitude of the point in degrees
   * @param lon The longitude of the point in degrees
   * @param vector Optional vector to create the point from
   * @throws Will throw an error if latitude is not between -90 and 90 or longitude is not between -180 and 180
   */
  constructor(lat: number, lon: number, vector?: Vector) {
    assert(
      !isNaN(lat) && !isNaN(lon),
      "Latitude and longitude must be numbers",
    );
    assert(
      lat >= -90 && lat <= 90,
      "Latitude must be between -90 and 90 degrees",
    );
    assert(
      lon >= -180 && lon <= 180,
      "Longitude must be between -180 and 180 degrees",
    );

    let x: number, y: number, z: number;

    if (vector) {
      ({ x, y, z } = vector);
    } else {
      // Convert latitude and longitude to radians
      const latRad = lat * TO_RAD;
      const lonRad = lon * TO_RAD;

      // Calculate the Cartesian coordinates
      const cosLat = Math.cos(latRad);
      const sinLat = Math.sin(latRad);
      const cosLon = Math.cos(lonRad);
      const sinLon = Math.sin(lonRad);

      x = cosLat * cosLon;
      y = cosLat * sinLon;
      z = sinLat;
    }

    super(x, y, z);

    this._lat = lat;
    this._lon = lon;
  }

  /**
   * Create a point from a vector
   * @param vector The vector to create the point from
   * @param normalise Whether to normalise the vector (default: true)
   * @returns A new Point instance
   * @throws Will throw an error if the vector is zero
   * @throws Will throw an error if latitude or longitude is NaN
   */
  static fromVector(vector: Vector, normalise: boolean = true): Point {
    assert(!isZero(vector.norm), "Cannot create a point from a zero vector");

    const lat = Math.asin(vector.z / vector.norm) * TO_DEG;
    const lon = Math.atan2(vector.y, vector.x) * TO_DEG;

    assert(
      !isNaN(lat) && !isNaN(lon),
      "Latitude and longitude must be valid numbers",
    );

    return new Point(lat, lon, normalise ? vector.normalise() : vector);
  }
  //#endregion

  //#region Getters
  /**
   * Get the latitude of the point
   * @returns The latitude in degrees
   */
  get lat(): number {
    return this._lat;
  }

  /**
   * Get the longitude of the point
   * @returns The longitude in degrees
   */
  get lon(): number {
    return this._lon;
  }

  /**
   * Get the quantised key of the point
   * @returns A string representation of the point in the format "P(lat, lon)"
   * @remarks The latitude and longitude are quantised to avoid floating point precision issues.
   */
  get asKey(): string {
    const quantise = (val: number): number => Math.round(val / EPSILON);

    return `P(${quantise(this.lat)}, ${quantise(this.lon)})`;
  }
  //#endregion

  //#region Comparators
  /**
   * Check if two points are equal
   * @param other The other point to compare with
   * @returns True if the points are equal, false otherwise
   * @remarks This method uses the latitude and longitude to determine equality and overrides the default equals method from Vector as the norms could be different.
   */
  override equals(other: Point): boolean {
    if (isZero(this.lat - other.lat)) {
      return Point.isPolar(this) || isZero(this.lon - other.lon);
    }

    return false;
  }

  /**
   * Check if a point is polar
   * @param point A point to check if it is polar
   * @remarks A point is considered polar if its latitude is exactly 90 or -90 degrees.
   * @returns True if the point is polar, false otherwise
   */
  static isPolar(point: Point): boolean {
    return isEqual(Math.abs(point.lat), 90);
  }
  //#endregion

  //#region Operators
  /**
   * Get the intersection of two great circles on the sphere
   * @param p1 Point 1 of Circle 1
   * @param p2 Point 2 of Circle 1
   * @param p3 Point 1 of Circle 2
   * @param p4 Point 2 of Circle 2
   * @returns The antipodal points of the intersection if they exist, otherwise false if they are the same great circle
   * @remarks This method relies on the fact that a great circle is defined by the cross product of two points on a sphere. The intersection of two great circles can be found by taking the cross product of their defining vectors. If the two circles overlap, then the cross product will be zero.
   */
  static getIntersection(
    p1: Point,
    p2: Point,
    p3: Point,
    p4: Point,
  ): [Point, Point] | false {
    const c1 = p1.cross(p2);
    const c2 = p3.cross(p4);

    const c3 = c1.cross(c2);

    // Check if they are the same circle
    if (isZero(c3.norm)) {
      return false;
    }

    const int = Point.fromVector(c3, false);
    const negInt = Point.fromVector(c3.negate(), false);

    return [int, negInt];
  }

  static getOrientation(p1: Point, p2: Point, p3: Point): Orientation {
    if (p1.equals(p2) || p1.equals(p3) || p2.equals(p3)) {
      return Orientation.COLLINEAR;
    }

    const c1 = p1.cross(p2);
    const dot = c1.dot(p3);

    if (dot > EPSILON) {
      return Orientation.ANTICLOCKWISE;
    } else if (dot < -EPSILON) {
      return Orientation.CLOCKWISE;
    }

    return Orientation.COLLINEAR;
  }

  /**
   * Check if the point is bounded by two other points
   * @param r The right point
   * @param l The left point
   * @returns True if the point is bounded by the two points, false otherwise
   */
  isBounded(r: Point, l: Point): boolean {
    if (this.equals(r) || this.equals(l)) {
      return true;
    }

    const negated = this.negate();

    if (negated.equals(r) || negated.equals(l)) {
      return false;
    }

    const rp = r.cross(this);
    const rl = r.cross(l);

    const lp = l.cross(this);
    const lr = l.cross(r);

    return rp.dot(rl) >= -EPSILON && lp.dot(lr) >= -EPSILON;
  }

  /**
   * Get the antipodal point
   * @returns The antipodal point
   */
  override negate(): Point {
    return Point.fromVector(super.negate());
  }

  /**
   * Reflect a point across the great circle defined by two points
   * @param r The right point
   * @param l The left point
   * @returns The reflected point
   */
  reflectPoint(r: Point, l: Point): Point {
    const c1 = r.cross(l);
    const dot = this.dot(c1);
    const double = c1.scale(2 * dot);
    const reflected = this.subtract(double);

    return Point.fromVector(reflected);
  }
  //#endregion

  //#region Distance
  cosDistance(other: Point): number {
    const lat1 = this.lat * TO_RAD;
    const lat2 = other.lat * TO_RAD;
    const dLon = (this.lon - other.lon) * TO_RAD;

    const a = Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon);

    return Math.acos(a) * TO_DEG;
  }

  havDistance(other: Point): number {
    const lat1 = this.lat * TO_RAD;
    const lon1 = this.lon * TO_RAD;
    const lat2 = other.lat * TO_RAD;
    const lon2 = other.lon * TO_RAD;

    const dLat = Math.abs(lat1 - lat2);
    const dLon = Math.abs(lon1 - lon2);

    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);

    const a = sinLat * sinLat +
      Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

    return 2 * Math.asin(Math.sqrt(a)) * TO_DEG;
  }

  distance(other: Point): number {
    if (this.equals(other)) {
      return 0;
    }

    return this.cosDistance(other);
  }
  //#endregion

  override toString(): string {
    return `Point(${+this.lat.toFixed(6)}, ${+this.lon.toFixed(6)})`;
  }
}
