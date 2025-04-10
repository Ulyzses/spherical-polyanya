import { assert } from "@std/assert/assert";
import { debug } from "../utils.ts";

const top = 0;
const parent = (i: number) => ((i + 1) >>> 1) - 1;
const left = (i: number) => (i << 1) + 1;
const right = (i: number) => (i + 1) << 1;

export class PriorityQueue<T extends { toString: () => string }> {
  private _heap: T[];
  private _comparator: (a: T, b: T) => boolean;

  constructor(
    compare: (a: T, b: T) => boolean,
  ) {
    this._heap = [];
    this._comparator = compare;
  }

  get size(): number {
    return this._heap.length;
  }

  get isEmpty(): boolean {
    return this.size === 0;
  }

  get peek(): T | null {
    return this._heap[0] ?? null;
  }

  push(...values: T[]): number {
    for (const value of values) {
      this._heap.push(value);
      this._siftUp();
      debug(`Pushed ${value.toString()} to the queue`);
    }

    return this.size;
  }

  pop(): T {
    assert(this.size > 0, "Cannot pop from an empty priority queue");

    const poppedValue = this.peek as T;
    const bottom = this.size - 1;

    if (bottom > 0) {
      this._swap(top, bottom);
    }

    this._heap.pop();
    this._siftDown();

    debug(`Popped ${poppedValue.toString()} from the queue`);

    return poppedValue;
  }

  replace(value: T): T | null {
    const replacedValue = this.peek;

    this._heap[0] = value;
    this._siftDown();

    return replacedValue;
  }

  toString(): string {
    return `PriorityQueue(\n\t${
      this._heap.map((v) => v.toString()).join(",\n\t")
    }\n)`;
  }

  _greater(i: number, j: number): boolean {
    return this._comparator(this._heap[i], this._heap[j]);
  }

  _swap(i: number, j: number): void {
    [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
  }

  _siftUp(): void {
    let node = this.size - 1;

    while (node > 0 && this._greater(node, parent(node))) {
      this._swap(node, parent(node));
      node = parent(node);
    }
  }

  _siftDown(): void {
    let node = top;

    while (
      (left(node) < this.size && this._greater(left(node), node)) ||
      (right(node) < this.size && this._greater(right(node), node))
    ) {
      const maxChild =
        right(node) < this.size && this._greater(right(node), left(node))
          ? right(node)
          : left(node);

      this._swap(node, maxChild);
      node = maxChild;
    }
  }
}
