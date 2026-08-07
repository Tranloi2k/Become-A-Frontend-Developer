# Event Loop & Async Runtime

> How a single-threaded language manages to handle timers, network requests, and file I/O all at once without ever blocking.

**Prerequisites:** `10-execution-context` (the call stack is part of the model).  
**After this chapter you will understand:** (1) why a Promise callback always runs before a `setTimeout` callback, (2) how `async`/`await` maps to promise microtasks under the hood, (3) why a long synchronous loop freezes the browser's rendering.

## 1. The core model

JavaScript on the main thread runs on a **single thread** with a single **call stack**. That sounds limiting — how can one thread handle a network request, a timer, and user clicks simultaneously? The trick is that the JavaScript thread never *waits* for slow operations. When you start something slow (a timer, a fetch, a file read), the engine doesn't sit there blocking until it finishes. Instead, it hands the operation off to the **host environment** — the browser's Web APIs or Node's libuv — which performs the work elsewhere and, when it's done, places a **callback** into a queue. The **event loop** is the simple but crucial coordinator that takes callbacks off those queues and runs them, but only when the call stack is empty.

```
        ┌──────────────┐
        │  Call Stack  │   runs the current synchronous JS
        └──────┬───────┘
               │ when the stack is empty…
        ┌──────▼───────┐
        │  Event Loop  │
        └──┬────────┬──┘
   drains all      then takes one
   microtasks      macrotask
        │                │
 ┌──────▼──────┐   ┌──────▼────────┐
 │ Microtask Q │   │  Macrotask Q  │
 │ (promises)  │   │ (timers, I/O) │
 └─────────────┘   └───────────────┘
```

The mental model to hold onto: synchronous code runs to completion first, and only when the stack is clear does the event loop start pulling queued work.

## 2. Macrotasks and microtasks

Not all queued callbacks are equal. There are two queue *types* with different priorities, and the distinction matters constantly in practice.

**Macrotasks** (often just called tasks) include `setTimeout` and `setInterval` callbacks, I/O callbacks, UI events, `setImmediate` in Node, and message events. The defining rule is that the event loop runs **one** macrotask per iteration.

**Microtasks** include Promise reactions (`.then`, `.catch`, `.finally`), the continuations of `await`, `queueMicrotask` callbacks, and `MutationObserver` in the browser. The defining rule for microtasks is the important one: after the current synchronous script finishes, and after each macrotask, the engine **drains the entire microtask queue** before doing anything else — before taking the next macrotask, and before rendering. And microtasks scheduled *during* this draining also run before the engine yields, which means a microtask can schedule another microtask and keep the loop busy.

That asymmetry — one macrotask at a time, but *all* microtasks drained between them — is the key to predicting execution order.

## 3. The canonical ordering example

```js
console.log("1 sync");

setTimeout(() => console.log("2 timeout"), 0);          // a macrotask

Promise.resolve().then(() => console.log("3 promise")); // a microtask

console.log("4 sync");
```

The output is:

```
1 sync
4 sync
3 promise
2 timeout
```

Tracing it: both `console.log` calls are synchronous, so `1 sync` and `4 sync` print first, in order, as the script runs top to bottom. When the script finishes, the stack is empty, so the engine drains microtasks — the promise callback runs, printing `3 promise`. Only then does it take a macrotask from the timer queue, printing `2 timeout`. The promise "wins" over the timeout despite both being scheduled at essentially the same moment, purely because microtasks drain before the next macrotask.

## 4. `async`/`await` is promises plus microtasks

`async`/`await` can look like it introduces blocking, but it doesn't — it's syntactic sugar over promises and microtask continuations. The way to understand it is that `await` *splits* a function in two: everything after an `await` becomes a continuation that's scheduled as a microtask when the awaited promise settles.

```js
async function f() {
  console.log("a");
  await null;          // suspend here; the rest is queued as a microtask
  console.log("b");
}
f();
console.log("c");
```

This prints `a`, then `c`, then `b`. When `f` runs, it logs `a` and hits the `await`, which suspends the function and hands control back to the caller — so `c` logs next, synchronously. The `console.log("b")` part was queued as a microtask, so it runs once the synchronous code is done and the microtask queue drains. Critically, a long-running `await` does not block the thread; the engine returns to the event loop and resumes the continuation only when the awaited value is ready.

## 5. The browser event loop and rendering

In a browser, rendering is woven into the event loop, which is why long tasks cause visible jank. A simplified slice of the browser's loop looks like:

```
run a task → drain all microtasks → run requestAnimationFrame callbacks → style/layout/paint → repeat
```

`requestAnimationFrame` runs right before the browser paints, which is exactly why it's the correct place to do animation work — your updates land in sync with the display refresh. The flip side is that a flood of microtasks or a single long synchronous task **blocks rendering entirely**, because paint can't happen until the call stack clears. That's the mechanism behind a frozen, unresponsive page. For low-priority background work that shouldn't compete with rendering, `requestIdleCallback` schedules it during idle gaps.

## 6. Node's event loop phases

Node's event loop, built on libuv, is organized into ordered **phases**, each with its own queue of callbacks:

```
   timers          → setTimeout / setInterval callbacks
   pending callbacks
   idle, prepare   (internal)
   poll            → I/O callbacks (fs, network); may block here waiting for I/O
   check           → setImmediate callbacks
   close callbacks → 'close' events
```

The loop moves through these phases in order, processing the callbacks queued for each. Two Node-specific details matter. First, **microtasks** (promise callbacks) and **`process.nextTick`** run *between* phases (and after each individual callback), not as a phase of their own — and `process.nextTick` has even higher priority than the promise microtask queue. Second, the relationship between `setImmediate` (the check phase) and `setTimeout(…, 0)` (the timers phase) depends on context: their relative order isn't guaranteed at the top level, but *inside* an I/O callback, `setImmediate` reliably fires first because the loop reaches the check phase before looping back to timers.

## 7. Starvation and other pitfalls

A few traps follow directly from how the loop works. **Microtask starvation** happens when a microtask keeps scheduling more microtasks (or `process.nextTick` recurses endlessly) — because the engine fully drains microtasks before moving on, this can prevent macrotasks, I/O, and rendering from *ever* running. **Blocking the loop** with a long synchronous computation freezes everything, since the single thread is busy; heavy CPU work belongs in a Web Worker or Node worker thread (see `17-engine-threads-and-concurrency.md`). And `setTimeout(fn, 0)` is misleadingly named: it doesn't run in zero milliseconds, but "after the current task plus a minimum delay" — and browsers clamp nested timers to at least about 4ms.

## 8. Where the async work actually happens

It's worth being precise about this, because it's a common misunderstanding: the single JavaScript thread does *not* perform the I/O itself. The host does it elsewhere. In the browser, Web APIs — the networking stack, timers, DOM event machinery — run outside the JS thread and queue callbacks when they complete. In Node, libuv provides both the event loop and a **thread pool** (four threads by default, configurable via `UV_THREADPOOL_SIZE`) used for file I/O, DNS, crypto, and compression, while network I/O typically uses the operating system's async mechanisms (epoll, kqueue, IOCP) rather than the pool. Either way, your JavaScript only runs the callback once the underlying work is finished — the waiting happens somewhere else.

## 9. Check your understanding

1. `setTimeout(() => console.log('A'), 0)` and `Promise.resolve().then(() => console.log('B'))` are queued at the same time. Which runs first, and exactly why?
2. An `async` function hits `await somePromise`. Trace what happens to the function's execution: where does control go, when does the rest of the function resume, and on which queue does the continuation land?
3. You have a loop that synchronously processes 500,000 array items. The page is completely unresponsive during that time. What is the mechanism causing the freeze, and what are two strategies to fix it?

## 10. Key takeaways

JavaScript is single-threaded, and the **event loop** runs queued callbacks whenever the call stack is empty. **Microtasks** (promises and `await` continuations) drain completely before the next **macrotask** (timers and I/O) and before rendering, which is the rule that lets you predict ordering. `async`/`await` is just promises and microtask continuations — it never blocks the thread. Node organizes its work into ordered **libuv phases**, with `nextTick` and microtasks running between them. And the golden rules are: don't block the loop with long synchronous work, and don't starve it with runaway microtasks — offload heavy CPU work to workers instead.
