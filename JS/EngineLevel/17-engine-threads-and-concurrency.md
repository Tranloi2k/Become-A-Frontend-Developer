# Engine Threads & Concurrency

> "JavaScript is single-threaded" is true in a precise and limited sense — your code runs on one thread, but the engine and host quietly use many.

## 1. What "single-threaded" actually means

The phrase "JavaScript is single-threaded" gets repeated so often that it's worth pinning down exactly what it claims and what it doesn't. What's true is that *your* JavaScript executes on **one main thread** with **one call stack**: within a single agent (V8 calls it an isolate), no two pieces of your JavaScript ever run truly in parallel. This is actually a feature — it means you never have to worry about two threads mutating the same JavaScript object at the same time, so there are no data races on ordinary JS objects and no locks to manage.

What's *not* true is that the whole process uses only one thread or one CPU core. "Single-threaded" describes only the execution of your application code. Underneath, both the engine and the host runtime make heavy use of background threads to do their work, so a modern JavaScript program routinely spreads across multiple cores even when your own code stays on one thread.

## 2. The threads inside V8

While the main thread is busy interpreting and running your JavaScript, V8 offloads several kinds of work to helper threads. JIT compilation runs on **background compiler threads** — TurboFan and Maglev optimize hot functions off to the side and install the result when ready, so optimization never blocks your code (chapter `04`). Garbage collection does much of its marking and sweeping on **GC helper threads** as part of the Orinoco design (chapter `13`). Parsing can happen on a background thread, including streaming a script's parse while it's still downloading (chapter `02`). And there's background work for code caching and snapshot deserialization. So even a program whose JavaScript is strictly single-threaded benefits from multiple CPU cores under the hood.

## 3. The threads in the host runtime

The host adds its own threads. Node, through libuv, maintains a **thread pool** — four threads by default, adjustable via `UV_THREADPOOL_SIZE` — that it uses for file I/O, DNS lookups, `crypto`, and `zlib` compression. (Network socket I/O is different: it typically uses the operating system's async facilities like epoll, kqueue, or IOCP rather than the pool.) Browsers go even further, running networking, rendering, compositing, and many Web APIs on their own separate threads or processes, with the JavaScript thread coordinating everything through the event loop.

## 4. Real parallelism: Workers

When you genuinely need to run JavaScript *in parallel* — not just overlap I/O, but use multiple cores for computation — you create additional **isolates**, separate instances of the engine each with its own heap and its own event loop. In the browser these are `Worker` (dedicated), `SharedWorker`, and Service Workers; in Node they're `worker_threads`, with `cluster` and `child_process` available for separate processes.

The defining characteristic of a worker is **isolation**: it shares no JavaScript objects and no scope with the main thread. Workers communicate by **message passing**, not by touching shared variables.

```js
// main.js
const worker = new Worker("./worker.js");
worker.postMessage({ cmd: "compute", n: 1e9 });
worker.onmessage = (e) => console.log("result", e.data);

// worker.js
onmessage = (e) => {
  postMessage(heavyComputation(e.data.n));
};
```

The natural use is to push heavy CPU work off the main thread so the UI or the server's event loop stays responsive while the worker grinds away on another core.

## 5. The cost of message passing

Communication between threads isn't free, and the default mechanism explains why. By default, messages are **structured-cloned** — deep-copied — so the cost scales with how much data you send. For large payloads this copy can dominate. The optimization is **transferable objects**: things like `ArrayBuffer` and `MessagePort` can be *transferred* rather than copied, meaning ownership moves to the receiver with zero copying, at the price of the sender no longer being able to use the object afterward.

```js
worker.postMessage(buffer, [buffer]);
// buffer is now "neutered" in the sender — its bytes moved to the worker
```

## 6. Shared memory: SharedArrayBuffer and Atomics

For genuine shared-state concurrency, there's a separate mechanism. A **`SharedArrayBuffer`** is a buffer whose underlying memory is actually shared across workers, with no copying — multiple threads can read and write the same bytes. To make that safe, **`Atomics`** provides atomic read-modify-write operations and primitives like `Atomics.wait`/`Atomics.notify` for synchronization, which prevent the data races that raw shared memory would otherwise allow.

```js
const sab = new SharedArrayBuffer(1024);
const view = new Int32Array(sab);
Atomics.add(view, 0, 1);   // an atomic increment visible across threads
```

Two important caveats. In browsers, `SharedArrayBuffer` requires **cross-origin isolation** (the COOP and COEP headers) because of Spectre-class side-channel mitigations. And only the *raw bytes* in the shared buffer are shared — ordinary JavaScript objects are never shared between agents, which preserves the no-data-races guarantee for everything except the explicit shared buffer.

## 7. The agent / isolate model

The specification models each thread of JavaScript as an **agent**, with its own heap, its own microtask queue, and its own event loop. V8 implements this as an **Isolate**, which can contain one or more **Contexts** (realms) inside it. Workers are separate agents, hence separate isolates. This model is the formal reason JavaScript avoids shared-memory data races by default: state simply isn't shared across agents unless you deliberately opt in with a `SharedArrayBuffer`. It's a clean mental model — think of each worker as its own little JavaScript universe that can only talk to others by sending messages.

## 8. Concurrency versus parallelism

These two words are often used loosely, but the distinction guides tool choice. **Concurrency** is interleaving — making progress on many tasks by switching between them — and JavaScript achieves it on a single thread through the event loop and async (chapter `14`). It's the right tool for I/O-bound work, where the bottleneck is waiting. **Parallelism** is simultaneous execution across multiple cores, which JavaScript achieves only through workers. It's the right tool for CPU-bound work, where the bottleneck is computation. The decision rule is simple: reach for async/await when you're waiting on I/O, and reach for workers when you're saturating a CPU.

```js
// Wrong tool — this blocks the only thread that runs your code:
for (let i = 0; i < 1e10; i++) sum += i;

// Right tool — move CPU-bound work to a worker; keep async for I/O.
```

## 9. Practical guidance

A few habits make concurrency work well in practice. Never block the main thread with long synchronous loops — offload them to a worker so the event loop keeps turning. Be mindful of message-passing cost, and use transferables or a `SharedArrayBuffer` when moving large data. In Node, tune `UV_THREADPOOL_SIZE` if you're doing a lot of concurrent file, crypto, or zlib work and the default of four is a bottleneck. And remember that workers have a real startup cost, so for frequent small tasks it's better to create a pool of workers and reuse them than to spawn a fresh one each time.

## 10. Key takeaways

Your JavaScript runs on **one main thread**, but V8 uses background threads for **JIT compilation, garbage collection, and parsing**, and the host uses threads for **I/O and rendering** — so the process is far from single-threaded overall. True parallel JavaScript comes from **Workers**, which are separate isolates/agents that communicate by **message passing** rather than shared state. **SharedArrayBuffer plus Atomics** enables real shared-memory concurrency (requiring cross-origin isolation in browsers). And the guiding principle is to use the **event loop** for I/O concurrency and **workers** for CPU parallelism.
