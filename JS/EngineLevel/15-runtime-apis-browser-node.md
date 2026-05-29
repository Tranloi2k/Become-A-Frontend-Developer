# Runtime APIs (Browser / Node)

> The engine runs the *language*; the *host* provides the APIs you actually build with. Keeping this line clear explains a surprising amount about portability.

## 1. Engine versus runtime

There's a distinction here that, once it clicks, clears up a lot of confusion about why code works in one place and not another.

**The engine** — V8, SpiderMonkey, JavaScriptCore — implements the **ECMAScript language**. That's the syntax, the type system, and the built-in objects defined by the standard: `Object`, `Array`, `Promise`, `Math`, `JSON`, iterators, the garbage collector, and so on. What's striking is what the engine *doesn't* know about. It has no concept of the DOM, no idea what a file is, no notion of HTTP. A bare engine can run `[1,2,3].map(x => x*2)` all day but has no way to read a file or make a network request.

**The runtime**, or host environment — the browser, Node, Deno, Bun — embeds the engine and adds the **host APIs**: everything that lets JavaScript actually interact with the outside world.

```
┌─────────────────────────────────────────────┐
│ Runtime (Browser / Node / Deno / Bun)        │
│  ┌───────────────┐   ┌─────────────────────┐ │
│  │ JS Engine     │   │ Host APIs           │ │
│  │ (e.g. V8)     │   │ DOM, fetch, fs, …   │ │
│  │ ECMAScript    │   │ event loop impl.    │ │
│  └───────────────┘   └─────────────────────┘ │
└─────────────────────────────────────────────┘
```

So `Array.prototype.map` comes from the engine, but `document`, `setTimeout`, `fetch`, and `fs.readFile` all come from the host. This is why the same engine can power both a browser and a server: the language is shared, and the host decides what capabilities to bolt on.

## 2. Browser runtime APIs

The browser provides a large catalog of APIs, mostly specified by the WHATWG and W3C and exposed on `window` or `globalThis`. The DOM lets you query and manipulate the page and listen for events. Timers include `setTimeout`, `setInterval`, `queueMicrotask`, `requestAnimationFrame`, and `requestIdleCallback`. Networking is covered by `fetch`, the older `XMLHttpRequest`, `WebSocket`, `EventSource`, and the Beacon API. Storage spans `localStorage`, `sessionStorage`, `IndexedDB`, the Cache API, and cookies. There are `Worker`, `SharedWorker`, and Service Workers for offloading and offline behavior; Canvas, WebGL/WebGPU, Web Audio, and WebRTC for media and graphics; and a long tail of utilities like `URL`, `Blob`, `FileReader`, `crypto.subtle`, `navigator`, `history`, and `location`. Almost all of these coordinate with the browser's event loop (chapter `14`), and many do their real work off the JavaScript thread.

## 3. Node runtime APIs

Node embeds V8 and adds server- and system-oriented capabilities, largely through libuv and a set of core modules. The file system lives in `fs`, available in synchronous, callback, and promise-based (`fs/promises`) flavors. Networking spans `net`, `http`, `http2`, `https`, `dgram`, `tls`, and `dns`. For process and OS interaction there's `process` (with `argv`, `env`, `nextTick`, and streams), plus `os`, `child_process`, `cluster`, and `worker_threads`. Binary data and streaming are handled by `stream` and `Buffer` (the latter predating universal TypedArray support). And there's a broad utility set: `path`, `url`, `crypto`, `zlib`, `events` (the `EventEmitter` pattern), `util`, and `vm`. Node also has its own timer wrinkles — `setImmediate` and `process.nextTick` alongside the standard `setTimeout`/`setInterval` — and its I/O is asynchronous via libuv's event loop and thread pool (chapters `14` and `17`).

## 4. The global object differs

One concrete portability snag is that the global object has different names. In the browser it's `window` (and `self` inside workers); in Node it's `global`. The standardized, cross-platform alias is **`globalThis`**, which works everywhere, so portable code should use `globalThis` rather than assuming `window` or `global` exists.

## 5. Convergence toward web standards

A genuinely helpful trend is that modern Node has adopted many **web-platform APIs** that originated in browsers, so the same code increasingly runs in both places. Node now ships `fetch`, `Request`, `Response`, and `Headers` (built in since Node 18), along with `URL` and `URLSearchParams`, `TextEncoder`/`TextDecoder`, `AbortController`/`AbortSignal`, Web Streams, `structuredClone`, WebCrypto via `crypto.subtle`, and `performance`. It even offers `Worker` through `worker_threads` — a different API surface than the browser's `Worker`, but the same underlying idea. **Deno** and **Bun** push this even further, aiming to be browser-compatible by default. The upshot is that writing isomorphic code that runs on both client and server has gotten substantially easier than it used to be.

## 6. How host APIs connect to the engine

The host exposes its native (C++ or Rust) functionality to JavaScript through the engine's **embedding API** — V8's C++ API, or Node's N-API for addons. Native functions are wrapped so they appear as ordinary JavaScript callables. Objects like DOM nodes are backed by native C++ objects with thin JavaScript wrappers around them. And when an asynchronous native operation finishes, it queues a callback or microtask back into the event loop, which is how results from the outside world re-enter your JavaScript. This same machinery is what native addons and language bindings are built on.

## 7. Why the distinction is practically important

Keeping engine and host separate in your head pays off in a few concrete ways. It explains **portability**: language features work everywhere, but host APIs don't — reaching for `document` in Node or `fs` in the browser simply fails. It clarifies the difference between **polyfills and transpilation**: you *transpile* new syntax (with a tool like Babel) because syntax is a language-level thing, but you *polyfill* missing APIs because those are host-level. It motivates **feature detection** — checking `typeof fetch !== "undefined"` or probing `globalThis` — over assuming an environment. And it reminds you that the performance characteristics of host APIs (DOM operations, file I/O) are a separate concern from engine performance; a slow page might be bottlenecked on layout, not on JavaScript execution.

```js
// Detect the environment rather than assuming it.
if (typeof process !== "undefined" && process.versions?.node) {
  // Node-only code path
}
if (typeof fetch !== "undefined") {
  // fetch is available (any modern browser, or Node 18+)
}
```

## 8. Key takeaways

The **engine** provides the ECMAScript **language**, while the **runtime/host** provides the **APIs** — the DOM, `fetch`, `fs`, timers — plus the actual event loop implementation. Browser and Node expose different host APIs and different global objects (`window` versus `global`), so portable code should rely on **`globalThis`** and feature detection. Node increasingly implements **web-standard APIs** for isomorphic code, with Deno and Bun going further still. And under the hood, host APIs bridge to native code through the engine's embedding API and feed their results back through the event loop.
