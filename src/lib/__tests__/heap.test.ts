import { MinHeap } from '../heap';

const numeric = (a: number, b: number): number => a - b;

describe('MinHeap', () => {
  it('reports an empty heap as size 0 with undefined peek and pop', () => {
    const heap = new MinHeap<number>(numeric);
    expect(heap.size).toBe(0);
    expect(heap.peek()).toBeUndefined();
    expect(heap.pop()).toBeUndefined();
  });

  it('pops numbers in ascending order regardless of push order', () => {
    const heap = new MinHeap<number>(numeric);
    const input = [5, 3, 8, 1, 9, 2, 7, 4, 6, 0];
    for (const n of input) {
      heap.push(n);
    }

    const out: number[] = [];
    for (let i = 0; i < input.length; i += 1) {
      const value = heap.pop();
      if (value !== undefined) {
        out.push(value);
      }
    }

    expect(out).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('increments size on push and decrements it on pop', () => {
    const heap = new MinHeap<number>(numeric);
    expect(heap.size).toBe(0);

    heap.push(10);
    expect(heap.size).toBe(1);
    heap.push(20);
    expect(heap.size).toBe(2);

    heap.pop();
    expect(heap.size).toBe(1);
    heap.pop();
    expect(heap.size).toBe(0);
  });

  it('peeks the minimum without removing it', () => {
    const heap = new MinHeap<number>(numeric);
    heap.push(4);
    heap.push(1);
    heap.push(7);

    expect(heap.peek()).toBe(1);
    expect(heap.size).toBe(3);
    expect(heap.peek()).toBe(1);
  });

  it('returns items with equal keys in insertion order (FIFO among ties)', () => {
    const heap = new MinHeap<{ k: number; seq: number }>((a, b) => a.k - b.k);
    const items = [
      { k: 1, seq: 0 },
      { k: 1, seq: 1 },
      { k: 1, seq: 2 },
      { k: 1, seq: 3 },
    ];
    for (const item of items) {
      heap.push(item);
    }

    const seqs: number[] = [];
    for (let i = 0; i < items.length; i += 1) {
      const value = heap.pop();
      if (value !== undefined) {
        seqs.push(value.seq);
      }
    }

    expect(seqs).toEqual([0, 1, 2, 3]);
  });
});
