interface HeapEntry<T> {
  item: T;
  seq: number;
}

export class MinHeap<T> {
  private readonly entries: HeapEntry<T>[] = [];
  private readonly compare: (a: T, b: T) => number;
  private nextSeq = 0;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  get size(): number {
    return this.entries.length;
  }

  peek(): T | undefined {
    const root = this.entries[0];
    return root === undefined ? undefined : root.item;
  }

  push(item: T): void {
    const entry: HeapEntry<T> = { item, seq: this.nextSeq };
    this.nextSeq += 1;
    this.entries.push(entry);
    this.siftUp(this.entries.length - 1);
  }

  pop(): T | undefined {
    const { length } = this.entries;
    if (length === 0) {
      return undefined;
    }
    const root = this.entries[0]!;
    const last = this.entries[length - 1]!;
    this.entries.pop();
    if (this.entries.length > 0) {
      this.entries[0] = last;
      this.siftDown(0);
    }
    return root.item;
  }

  private lessThan(a: HeapEntry<T>, b: HeapEntry<T>): boolean {
    return (this.compare(a.item, b.item) || a.seq - b.seq) < 0;
  }

  private siftUp(startIndex: number): void {
    let index = startIndex;
    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      const current = this.entries[index]!;
      const parent = this.entries[parentIndex]!;
      if (!this.lessThan(current, parent)) {
        break;
      }
      this.entries[index] = parent;
      this.entries[parentIndex] = current;
      index = parentIndex;
    }
  }

  private siftDown(startIndex: number): void {
    let index = startIndex;
    const { length } = this.entries;
    for (;;) {
      const leftIndex = index * 2 + 1;
      const rightIndex = leftIndex + 1;
      let smallest = index;
      const left = leftIndex < length ? this.entries[leftIndex]! : undefined;
      if (left !== undefined && this.lessThan(left, this.entries[smallest]!)) {
        smallest = leftIndex;
      }
      const right = rightIndex < length ? this.entries[rightIndex]! : undefined;
      if (right !== undefined && this.lessThan(right, this.entries[smallest]!)) {
        smallest = rightIndex;
      }
      if (smallest === index) {
        break;
      }
      const current = this.entries[index]!;
      const target = this.entries[smallest]!;
      this.entries[index] = target;
      this.entries[smallest] = current;
      index = smallest;
    }
  }
}
