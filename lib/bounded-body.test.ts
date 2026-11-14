import { describe, expect, it } from 'vitest';

import { readBodyWithinLimit } from './bounded-body';

describe('readBodyWithinLimit', () => {
  it('joins streamed chunks when the total body is within the limit', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3]));
        controller.close();
      },
    });

    await expect(readBodyWithinLimit(stream, 3)).resolves.toEqual(new Uint8Array([1, 2, 3]));
  });

  it('cancels the stream when its total size exceeds the limit', async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3, 4]));
      },
      cancel() {
        cancelled = true;
      },
    });

    await expect(readBodyWithinLimit(stream, 3)).resolves.toBeNull();
    expect(cancelled).toBe(true);
  });
});
