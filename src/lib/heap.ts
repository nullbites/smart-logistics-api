export class MinHeap<T> {
  constructor(_compare: (a: T, b: T) => number) {
    throw new Error('not implemented');
  }

  get size(): number {
    throw new Error('not implemented');
  }

  push(_item: T): void {
    throw new Error('not implemented');
  }

  pop(): T | undefined {
    throw new Error('not implemented');
  }

  peek(): T | undefined {
    throw new Error('not implemented');
  }
}
