/**
 * Rebuilds a worklet the way the phone's UI thread sees it: from its code
 * string, with only the values it captured. Running the rebuilt function
 * catches what kills a release build but passes in a normal test, such as a
 * captured function that isn't a worklet, or a value the worklet can't see.
 *
 * Every shared value reads as `clock()`.
 */
export function onUiThread<T>(value: T, clock: () => number): T {
  return convert(value, clock, new Map()) as T;
}

type Worklet = ((...args: unknown[]) => unknown) & {
  __workletHash?: number;
  __initData?: { code: string };
  __closure?: unknown;
};

function convert(value: unknown, clock: () => number, seen: Map<unknown, unknown>): unknown {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return value;
  if (seen.has(value)) return seen.get(value);

  if (typeof value === 'function') {
    const fn = value as Worklet;
    if (fn.__workletHash === undefined || !fn.__initData) {
      const stub = () => {
        throw new Error(`${fn.name || 'A captured function'} is not a worklet, so it can't run on the UI thread`);
      };
      seen.set(value, stub);
      return stub;
    }
    // Built in the global scope, so it can't reach anything it didn't capture.
    const build = new Function(`return ${fn.__initData.code}`) as () => (...args: unknown[]) => unknown;
    let closure: unknown;
    const rebuilt = (...args: unknown[]) => {
      closure ??= convert(fn.__closure, clock, seen);
      return build().apply({ __closure: closure }, args);
    };
    seen.set(value, rebuilt);
    return rebuilt;
  }

  const object = value as Record<string, unknown>;
  if (typeof object.get === 'function' && typeof object.set === 'function') {
    const shared = { get: clock, get value() { return clock(); } };
    seen.set(value, shared);
    return shared;
  }
  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    seen.set(value, copy);
    value.forEach((item) => copy.push(convert(item, clock, seen)));
    return copy;
  }
  const copy: Record<string, unknown> = {};
  seen.set(value, copy);
  for (const [key, item] of Object.entries(object)) copy[key] = convert(item, clock, seen);
  return copy;
}
