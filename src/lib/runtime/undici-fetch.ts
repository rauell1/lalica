/**
 * Stand-in for the `undici` package (next.config.ts resolveAlias).
 *
 * @vercel/blob, still used for media uploaded before the move to object
 * storage, imports `fetch` from undici. undici's HTTP client compiles
 * WebAssembly on its first request, which Cloudflare Workers forbid, so
 * opening or deleting those files failed. The platform fetch is used instead.
 */
export const fetch: typeof globalThis.fetch = (...args) => globalThis.fetch(...args);
