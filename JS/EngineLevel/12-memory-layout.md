# Memory Layout

> Where JavaScript data actually lives — the split between stack and heap, how V8 organizes its heap into generations, and what a "memory leak" even means in a garbage-collected language.

**Prerequisites:** `01-js-value-representation` (Smis vs HeapObjects), `10-execution-context` (call stack).  
**After this chapter you will understand:** (1) what data lives on the stack versus the heap and why, (2) how V8's generational heap spaces map to different collection strategies, (3) why "memory leaks" in GC languages are about reachability, not missing frees.

## 1. Stack versus heap

The engine works with two fundamentally different regions of memory, and understanding the division explains a lot about lifetimes and performance.

The **stack** holds call frames. Each time a function is called, a frame is pushed containing things like the return address, the function's local primitive values, and references (pointers) to objects. When the function returns, its frame is popped and everything in it is gone instantly. The stack is extremely fast precisely because allocation and deallocation are just moving a pointer up and down, and its lifetime discipline is rigidly last-in-first-out. The trade-off is that it's small and roughly fixed in size — push too many frames (runaway recursion) and you get a stack overflow.

The **heap** holds everything that's dynamically sized or needs to outlive a single function call: all objects, arrays, strings, closures' captured environments — anything whose size isn't known at compile time or whose lifetime isn't tied to one call. Heap memory lives until it's no longer reachable, at which point the garbage collector reclaims it (see `13-garbage-collection.md`). The heap is large and can grow, but allocation and especially collection are more expensive than the stack's trivial pointer bumps.

The relationship between the two is captured in a single example:

```js
function f() {
  let n = 42;            // a Smi — can live directly in a register or stack slot
  let obj = { x: 1 };    // the object lives on the heap; `obj` holds a pointer to it
}
```

The primitive `42` can sit right in the frame, but `{ x: 1 }` is allocated on the heap and the variable `obj` merely holds a reference. When `f` returns, the frame (including the pointer) disappears, and the object becomes eligible for collection if nothing else references it.

## 2. The V8 heap is generational

V8 doesn't treat the heap as one undifferentiated pool. It splits it into several **spaces**, organized to support **generational garbage collection**, which is built on a well-supported empirical observation called the *generational hypothesis*: most objects die young. A function creates a temporary object, uses it, and abandons it almost immediately; only a minority of objects live a long time.

```
V8 Heap
├── Young generation (new space)
│     two semi-spaces, where new objects are allocated and the
│     fast Scavenger collector runs frequently
├── Old generation (old space)
│     objects that survived a few young-gen collections, promoted here;
│     collected by the slower Mark-Sweep-Compact major GC
├── Large Object Space
│     objects too big for normal pages (big arrays/buffers), never moved
├── Code space
│     JIT-generated machine code
└── Map space
      hidden classes (Maps)
```

The young generation is where everything starts. It's small, and it's collected often but cheaply by a copying collector called the **Scavenger**. Objects that survive a couple of young-generation collections are **promoted** into the old generation, on the theory that having lived a while, they'll probably keep living; the old generation is collected less frequently with the more thorough Mark-Sweep-Compact algorithm. Very large objects skip the normal flow and go straight into the Large Object Space, where they're never relocated. And there are specialized spaces for compiled code and for the Maps that describe object shapes. The algorithms behind all this are the subject of the next chapter; here the point is just the layout.

## 3. The shape of a heap object (recap)

Pulling together threads from earlier chapters, a typical heap object looks like this in memory:

```
[ Map pointer ][ properties pointer ][ elements pointer ][ in-object fields... ]
```

The **Map pointer** points to the hidden class (chapter `05`). The **properties** pointer leads to overflow named properties, and the **elements** pointer to indexed/array elements (chapters `07` and `08`). The first several fields are stored inline inside the object for speed. And as mentioned in `01-js-value-representation.md`, pointer compression can store these pointers as 32-bit offsets to save memory on 64-bit builds.

## 4. How allocation works

Allocation in the young generation is about as cheap as allocation gets: it's **bump-pointer** allocation, meaning V8 keeps a pointer to the next free byte and simply moves it forward by the object's size. No searching for a free slot, no bookkeeping — just advance a pointer. When the young space fills up, a **scavenge** runs: the live objects are copied into the other semi-space, and the dead ones are abandoned wholesale (reclaiming them costs nothing, since the engine just stops looking at the old semi-space). Objects that keep surviving scavenges eventually get promoted to old space. This is why creating lots of short-lived objects is individually cheap but collectively drives up how often the Scavenger has to run.

## 5. Strings and buffers

Strings use the specialized layouts described in `01` — sequential, cons, sliced, external — so a string's memory footprint depends on how it was built. `ArrayBuffer` and TypedArray data is a contiguous block of backing memory, and large buffers are often allocated outside the normal object heap (in large-object or external memory). This external memory still counts against your process's limits even though it isn't in the regular JS object heap, which is something to keep in mind when working with big binary data.

## 6. Memory limits

Node and V8 impose a default cap on the old-space size — historically somewhere around 1.5 to 2 GB on 64-bit, though it varies by version — and you can raise it with `--max-old-space-size=<MB>`. Blowing past the limit produces the dreaded `FATAL ERROR: ... JavaScript heap out of memory`. TypedArray, buffer, and other external memory is tracked separately and is also bounded, so a program can run into memory trouble through large buffers even if its object heap looks modest.

## 7. What "leaks" mean here

In a garbage-collected language you don't leak memory by forgetting to call `free()` — there is no `free()`. You leak by keeping objects **reachable** when you no longer need them. The collector can only reclaim what's unreachable, so as long as some live reference points at an object, it stays, even if your program will never use it again.

The recurring sources are worth internalizing. Forgotten **timers and intervals** keep their callbacks (and everything those callbacks close over) alive. Un-removed **event listeners** do the same. **Global** caches, arrays, or maps that only ever grow and are never pruned accumulate forever. **Closures** holding large captured data keep that data alive (see `11-closures-and-scope-chain.md`). **Detached DOM nodes** that are still referenced from JavaScript can't be collected. The general fix is to drop references when you're done — clear timers, remove listeners, prune caches — and to use weak references (`WeakMap`, `WeakRef`) for caches and metadata where appropriate, so the collector is free to reclaim entries once nothing else needs them.

## 8. Inspecting memory

```bash
node --expose-gc script.js            # exposes global.gc() for manual collection in tests
node --max-old-space-size=4096 app.js # raise the old-space limit to ~4 GB
node --inspect app.js                 # attach Chrome DevTools for the Memory tab
```

Chrome and Node DevTools can take **heap snapshots** that show retained sizes and, importantly, the *retainer chains* — the references keeping an object alive — which is how you actually track down a leak. In Node, `process.memoryUsage()` reports `rss` (total process memory), `heapTotal` and `heapUsed` (the V8 object heap), and `external` (C++ memory bound to JS, like Buffers), giving you a quick programmatic read on where memory is going.

## 9. Check your understanding

1. `function f() { let n = 42; let obj = { x: 1 }; }` — where does `n` live, where does `obj` live, and what happens to each after `f` returns?
2. Why is allocation in the young generation (bump-pointer allocation) so much faster than `malloc` in C?
3. A Node server's `process.memoryUsage().heapUsed` keeps growing over 24 hours despite no obvious object retention in the code. What are the three most common root causes to investigate first?

## 10. Key takeaways

The **stack** holds call frames, primitive locals, and references, with a rigid per-call lifetime; the **heap** holds all dynamically-sized objects and lives until they become unreachable. V8's heap is **generational** — cheap, frequent young-generation scavenges plus occasional, more thorough old-generation collections — and allocation is fast bump-pointer work, with survivors getting promoted to old space. Memory "leaks" come from unintended **reachability**, not from missing manual frees, so the cures are dropping references, cleaning up listeners and timers, and using weak references for caches.
