/**
 * Coalesces short bursts of idempotent background work by key. Every caller
 * receives the same promise, while the worker sees only the latest payload.
 * It is intentionally process-local: correctness still comes from the
 * snapshot's optimistic version check, and this only reduces avoidable work.
 */
export function createLatestOnlyWorkQueue<Key, Value>(input: {
  delayMs: number;
  work: (value: Value) => Promise<void>;
}) {
  const pending = new Map<
    Key,
    { value: Value; promise: Promise<void>; resolve: () => void }
  >();

  return {
    enqueue(key: Key, value: Value): Promise<void> {
      const existing = pending.get(key);
      if (existing) {
        existing.value = value;
        return existing.promise;
      }

      let resolve!: () => void;
      const promise = new Promise<void>((done) => {
        resolve = done;
      });
      const item = { value, promise, resolve };
      pending.set(key, item);
      setTimeout(() => {
        const latest = pending.get(key);
        pending.delete(key);
        if (!latest) return;
        void input.work(latest.value).catch(() => undefined).finally(latest.resolve);
      }, input.delayMs);
      return promise;
    },
  };
}
