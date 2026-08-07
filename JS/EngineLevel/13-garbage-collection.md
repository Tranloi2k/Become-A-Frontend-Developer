# Garbage Collection

> How V8 automatically figures out which memory is no longer needed and reclaims it — and why modern GC manages to do this without freezing your program.

**Prerequisites:** `12-memory-layout` (heap layout and generational spaces).  
**After this chapter you will understand:** (1) why reachability — not "done using it" — is the criterion for collection, (2) how the Scavenger's copying algorithm makes its cost proportional to *live* data, not dead data, (3) what Orinoco does to keep GC pauses short.

## 1. Reachability, not "done with it"

The first thing to get right about garbage collection is what it actually measures. The collector frees objects that are **unreachable**, meaning there's no way to get to them by following references starting from a set of **roots** — the global object, the values on the current call stack, active closures, and various engine-internal handles. It does *not* free objects just because your program has logically "finished" with them. If a live root can still reach an object through some chain of references, that object stays alive, even if you never intend to use it again.

```
Roots (stack, globals, ...) ──► A ──► B ──► C
                                  └──► D        (A, B, C, D all reachable → kept)

                       X ──► Y                  (nothing reachable points here → collected)
```

This distinction is the entire explanation for memory leaks in JavaScript: a leak is an object that's still *reachable* (so the GC can't touch it) but is no longer *useful* (so your program shouldn't be holding it). Keeping reachability in mind reframes "why isn't this being collected?" into "what is still pointing at it?"

## 2. The generational hypothesis

V8's whole strategy is shaped by an empirical fact: **most objects die young**. The temporary object you create inside a function, use, and discard is the common case; the object that lives for the entire program is the exception. V8 leans into this by dividing the heap into a **young generation**, which it collects frequently and cheaply, and an **old generation**, which it collects rarely with a more thorough (and more expensive) algorithm. The bet is that focusing collection effort on the young generation, where almost everything is already dead, gives the best return for the least work.

## 3. Minor GC: the Scavenger

The young generation is collected by a **copying** (semi-space) collector, an implementation of Cheney's algorithm. The young space is split into two equal halves, conventionally called "From" and "To." Here's the cycle:

```
1. Allocate new objects into the "From" space (cheap bump-pointer allocation).
2. When "From" fills up, run a scavenge.
3. Copy every LIVE object from "From" into "To".
4. Whatever remains in "From" is dead — and is reclaimed for free by simply ignoring it.
5. Swap the roles of "From" and "To".
6. Objects that survive enough scavenges are PROMOTED to the old generation.
```

The genius of this scheme is that its cost is proportional to the *live* data, not the dead data. If 90% of young objects are already dead when a scavenge runs — which the generational hypothesis says is typical — then the collector only has to copy the surviving 10% and pays nothing for the rest. As a bonus, copying naturally **compacts** memory: the survivors are packed tightly into the destination space, so fragmentation never builds up in the young generation.

## 4. Major GC: Mark-Sweep-Compact

The old generation can't use a copying collector economically (it's large and mostly live), so it uses **Mark-Sweep-Compact** instead. Marking traverses the object graph starting from the roots and marks everything it can reach as live. Sweeping then walks the heap and reclaims the space occupied by everything that *wasn't* marked, building free lists of the reclaimed regions. Occasionally a compaction step moves the surviving objects together to squeeze out the fragmentation that sweeping leaves behind. This is inherently more expensive than a scavenge, which is exactly why V8 runs it infrequently and works hard to make it non-disruptive.

## 5. Orinoco: keeping GC off the main thread

The reason major GC doesn't produce the long, janky freezes you might expect is a body of work in V8 called **Orinoco**, whose goal is to make major collection mostly **concurrent, parallel, and incremental** so that main-thread pause times stay short.

**Incremental marking** breaks the marking work into small slices interleaved with normal JavaScript execution, rather than one long stop-the-world pause — with write barriers (below) tracking any pointer changes the program makes in between slices. **Concurrent marking and sweeping** push much of the work onto background helper threads that run while your JavaScript keeps executing. And **parallel** collection lets multiple threads share the work of a single GC phase. The combined result is that instead of one long freeze, you get short, infrequent main-thread pauses — which is what makes smooth animation and responsive servers possible even with a tracing GC.

## 6. Write barriers and remembered sets

There's a technical problem hiding in generational GC: to collect the young generation on its own, the collector needs to know about every reference *into* the young generation, including references held by old-generation objects. But scanning the entire old generation on every minor GC would destroy the performance advantage. V8 solves this with **write barriers**: whenever the running program stores a pointer from an old-generation object to a young-generation object, a small piece of instrumentation records that fact into a **remembered set**. The Scavenger then consults the remembered set instead of scanning all of old space, so it knows which young objects are kept alive by old-generation references. This is invisible to you, but it's what makes cheap minor GC possible at all.

## 7. Weak references

Sometimes you want to reference an object *without* keeping it alive — and JavaScript offers a few tools for exactly that. A **`WeakMap`** or **`WeakSet`** holds its keys weakly: an entry vanishes automatically once its key is otherwise unreachable, which makes them ideal for associating metadata or caches with objects without leaking when those objects go away. A **`WeakRef`** is a direct weak reference you can dereference with `.deref()`, which may return `undefined` if the target has already been collected. And a **`FinalizationRegistry`** lets you register a cleanup callback to run *after* an object is collected — but it's explicitly best-effort and non-deterministic, so you must not build core logic on its timing. The rule of thumb is to use these for caches and external-resource cleanup, and never to rely on finalizer timing for correctness.

## 8. What you can and can't control

You **cannot** force a precise, immediate collection from ordinary JavaScript — there's no real `free()`, and that's by design. What you **can** do is make objects collectable by dropping the references that keep them reachable: null out variables, remove event listeners, clear timers, and prune caches. The `global.gc()` function exists only when you run with `--expose-gc`, and it's meant for tests and benchmarks, not for production logic — reaching for it in real code is almost always a sign of a reachability problem that should be fixed directly instead.

## 9. Reducing GC pressure

Because the frequency of minor GC is driven by your allocation rate, the most effective lever is allocating less in hot paths. Avoid creating large numbers of short-lived objects inside tight loops — each one is cheap individually but collectively they make the Scavenger run more often. Where it genuinely helps (and profiling confirms it), reuse objects, arrays, or buffers rather than reallocating, or use an object pool for very hot paths. Avoid the accidental retention discussed in chapters `11` and `12` — long-lived closures and ever-growing globals. Prefer TypedArrays for large numeric data, since they avoid per-element object churn. And as always, don't micro-optimize prematurely: the GC is fast and clever, so measure before restructuring.

```js
// High allocation pressure: a million short-lived objects feed the Scavenger.
for (let i = 0; i < 1e6; i++) {
  process({ x: i });
}
```

## 10. Testing with manual GC

```bash
node --expose-gc test.js
```

```js
global.gc();   // force a collection — for benchmarks and leak tests only
```

This is handy for measurements: force a collection, take a baseline, run your workload, force another collection, and compare — a simple way to check whether something is leaking.

## 11. Check your understanding

1. The Scavenger's cost is proportional to *live* data, not dead data. Walk through why: what does the algorithm actually do with dead objects, and what does it do with live ones?
2. What is a write barrier, and why does generational GC require one? What problem would occur without it?
3. You cache API responses with `const cache = new Map()` and the map grows without bound. Rewrite the cache using `WeakRef` to allow entries to be collected when memory is tight. What is the trade-off?

## 12. Key takeaways

Garbage collection frees **unreachable** objects, found by tracing from a set of **roots**, which is why leaks are about lingering reachability rather than missing frees. V8 is **generational**: a fast copying **Scavenger** handles the young generation where most objects die, while **Mark-Sweep-Compact** handles the long-lived old generation. **Orinoco** makes major GC incremental, concurrent, and parallel so main-thread pauses stay short. Use **`WeakMap`**, **`WeakRef`**, and `FinalizationRegistry` to avoid leaks without manual management, and the most practical performance lever you control is reducing the rate of allocation in hot code.
