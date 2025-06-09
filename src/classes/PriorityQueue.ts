import { assert } from "@std/assert/";

const top = 0;
const parent = (i: number) => ((i + 1) >>> 1) - 1;
const left = (i: number) => (i << 1) + 1;
const right = (i: number) => (i + 1) << 1;

/** A standard binary min-heap priority queue */
export default class PriorityQueue<T extends { toString: () => string }> {
  private _heap: T[];
  private _comparator: (a: T, b: T) => boolean;

  /**
   * Create a new priority queue
   * @param compare A comparison function that determines the order of elements in the queue.
   */
  constructor(
    compare: (a: T, b: T) => boolean,
  ) {
    this._heap = [];
    this._comparator = compare;
  }

  /**
   * Get the number of elements in the queue
   * @returns The size of the queue
   */
  get size(): number {
    return this._heap.length;
  }

  /**
   * Check if the queue is empty
   * @returns True if the queue is empty, false otherwise
   */
  get isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Get the element at the top of the queue without removing it
   * @returns The top element of the queue, or null if the queue is empty
   */
  get peek(): T | null {
    return this._heap[0] ?? null;
  }

  /**
   * Add one or more values to the queue
   * @param values The values to add to the queue
   * @returns The new size of the queue after adding the values
   */
  push(...values: T[]): number {
    for (const value of values) {
      this._heap.push(value);
      this._siftUp();
      // console.debug(`Pushed ${value.toString()} to the queue`);
    }

    return this.size;
  }

  /**
   * Remove and return the top element of the queue
   * @returns The top element of the queue, or throws an error if the queue is empty
   * @throws Will throw an error if the queue is empty
   */
  pop(): T {
    assert(this.size > 0, "Cannot pop from an empty priority queue");

    const poppedValue = this.peek as T;
    const bottom = this.size - 1;

    if (bottom > 0) {
      this._swap(top, bottom);
    }

    this._heap.pop();
    this._siftDown();

    // console.debug(`Popped ${poppedValue.toString()} from the queue`);

    return poppedValue;
  }

  /**
   * Check if the element at index i is greater than the element at index j
   * @param i The index of the first element
   * @param j The index of the second element
   * @returns True if the element at index i is greater than the element at index j, false otherwise
   */
  _greater(i: number, j: number): boolean {
    return this._comparator(this._heap[i], this._heap[j]);
  }

  /**
   * Swap the elements at indices i and j
   * @param i The index of the first element
   * @param j The index of the second element
   */
  _swap(i: number, j: number): void {
    [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
  }

  /**
   * Sift up the last element to maintain the heap property
   */
  _siftUp(): void {
    let node = this.size - 1;

    while (node > 0 && this._greater(node, parent(node))) {
      this._swap(node, parent(node));
      node = parent(node);
    }
  }

  /**
   * Sift down the top element to maintain the heap property
   */
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

  toString(): string {
    return `PriorityQueue(\n\t${
      this._heap.map((v) => v.toString()).join(",\n\t")
    }\n)`;
  }
}
