import { assert } from "@std/assert";
import { TextLineStream } from "@std/streams";
import { EPSILON } from "../src/constants.ts";

/**
 * Check if a number is close to zero based on a defined EPSILON value.
 * @param value A number to check if it is zero based on EPSILON
 * @returns True if the number is close to zero, false otherwise.
 */
export function isZero(value: number): boolean {
  assert(!isNaN(value), "Value must be a number");

  return Math.abs(value) < EPSILON;
}

/**
 * Check if two numbers are approximately equal based on a defined EPSILON value.
 * @param a The first number to compare
 * @param b The second number to compare
 * @returns True if the numbers are approximately equal, false otherwise.
 */
export function isEqual(a: number, b: number): boolean {
  assert(!isNaN(a) && !isNaN(b), "Both values must be numbers");

  return isZero(a - b);
}

/**
 * Create an async generator that reads lines from a file.
 * @param filename The name of the file to read lines from
 * @returns An async generator that yields lines from the file
 */
export async function* readLines(filename: string): AsyncGenerator<string> {
  using f = await Deno.open(filename);

  const readable = f.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream());

  for await (const line of readable) {
    yield line;
  }
}
