import { assert } from "@std/assert";
import { isZero } from "../utils.ts";

/** A class representing 3D vectors */
export default class Vector {
  private _x: number;
  private _y: number;
  private _z: number;

  /**
   * Create a point
   * @param x The x component of the vector
   * @param y The y component of the vector
   * @param z The z component of the vector
   * @throws Will throw an error if any of the components are not numbers
   */
  constructor(x: number, y: number, z: number) {
    assert(
      !isNaN(x) && !isNaN(y) && !isNaN(z),
      "Vector components must be numbers",
    );

    this._x = x;
    this._y = y;
    this._z = z;
  }

  //#region Getters
  /**
   * Get the x component of the vector
   * @returns The x value
   */
  get x(): number {
    return this._x;
  }

  /**
   * Get the y component of the vector
   * @returns The y value
   */
  get y(): number {
    return this._y;
  }

  /**
   * Get the z component of the vector
   * @returns The z value
   */
  get z(): number {
    return this._z;
  }

  /**
   * Get the norm of the vector
   * @returns The norm of the vector
   */
  get norm(): number {
    return Math.sqrt(this._x ** 2 + this._y ** 2 + this._z ** 2);
  }
  //#endregion

  //#region Comparators
  /**
   * Check if this vector is equal to another vector
   * @param other The other vector to compare with
   * @returns True if the vectors are equal, false otherwise
   * @throws Will throw an error if the argument is not an instance of Vector
   */
  equals(other: Vector): boolean {
    assert(other instanceof Vector, "Argument must be an instance of Vector");

    return this.x === other.x && this.y === other.y && this.z === other.z;
  }
  //#endregion

  //#region Operators
  /**
   * Get the cross product of this vector with another vector
   * @param other The other vector to cross with
   * @returns A new vector representing the cross product
   * @throws Will throw an error if the argument is not an instance of Vector
   */
  cross(other: Vector): Vector {
    assert(other instanceof Vector, "Argument must be an instance of Vector");

    return new Vector(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x,
    );
  }

  /**
   * Get the dot product of this vector with another vector
   * @param other The other vector to dot with
   * @returns The dot product as a number
   * @throws Will throw an error if the argument is not an instance of Vector
   */
  dot(other: Vector): number {
    assert(other instanceof Vector, "Argument must be an instance of Vector");

    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  /**
   * Scale the vector by a given factor
   * @param factor The factor by which to scale the vector
   * @returns A new vector scaled by the given factor
   * @throws Will throw an error if the factor is not a number
   */
  scale(factor: number): Vector {
    assert(!isNaN(factor), "Scale factor must be a number");

    return new Vector(this.x * factor, this.y * factor, this.z * factor);
  }

  /**
   * Subtract another vector from this vector
   * @param other The vector to subtract from this vector
   * @returns A new vector representing the result of the subtraction
   * @remarks This vector is the result of `this - other`
   * @throws Will throw an error if the argument is not an instance of Vector
   */
  subtract(other: Vector): Vector {
    assert(other instanceof Vector, "Argument must be an instance of Vector");

    return new Vector(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  /**
   * Negate this vector
   * @returns A new vector that is the negation of this vector
   */
  negate(): Vector {
    return new Vector(-this.x, -this.y, -this.z);
  }

  /**
   * Normalise this vector to a unit vector
   * @returns A unit vector in the same direction as this vector
   * @throws Will throw an error if the vector is zero (norm is zero)
   */
  normalise(): Vector {
    assert(!isZero(this.norm), "Cannot normalise a zero vector");

    return this.scale(1 / this.norm);
  }
  //#endregion

  /**
   * Convert the vector to a string representation
   * @returns A string representation of the vector in the format "(x, y, z)"
   */
  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z})`;
  }
}
