/**
 * Process-wide or per-request cache for connection-holding singletons.
 *
 * Cloudflare Workers forbids using a socket opened in one request from
 * another request, so anything that owns a database connection must not
 * outlive the request there. OpenNext publishes the current request's
 * execution context under a well-known symbol; when it is present the store
 * is keyed on it. On Node (local dev, scripts, tests) there is no such
 * context and a single process-wide store is used.
 */

const cloudflareContextSymbol = Symbol.for("__cloudflare-context__");
const perRequest = new WeakMap<object, Map<string, unknown>>();
const processWide = new Map<string, unknown>();

function currentStore(): Map<string, unknown> {
  const context = (globalThis as Record<symbol, unknown>)[cloudflareContextSymbol] as
    | { ctx?: object }
    | undefined;
  const scope = context?.ctx;
  if (!scope) return processWide;
  let store = perRequest.get(scope);
  if (!store) {
    store = new Map();
    perRequest.set(scope, store);
  }
  return store;
}

/** Return the cached value for `key` in the current scope, creating it once. */
export function scoped<T>(key: string, create: () => T): T {
  const store = currentStore();
  if (!store.has(key)) store.set(key, create());
  return store.get(key) as T;
}

/** Read a value from the current scope without creating it. */
export function peekScoped<T>(key: string): T | undefined {
  return currentStore().get(key) as T | undefined;
}

/** Set a value in the current scope. */
export function setScoped<T>(key: string, value: T): void {
  currentStore().set(key, value);
}
