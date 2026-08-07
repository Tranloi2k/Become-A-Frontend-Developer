# JavaScript Engine-Level Knowledge

A topic-by-topic reference on how JavaScript actually runs — from raw source text to optimized machine code, memory, concurrency, and WebAssembly. The focus is primarily on **V8** (Chrome/Node), with notes on other engines where relevant.

Each topic is a standalone Markdown file written as a readable chapter: it starts from the intuition, explains the *why* in prose, grounds each idea in small code examples, and points you at the Node/V8 flags you can use to see the behavior yourself. The numbering follows a natural learning order: **representation → compilation pipeline → optimization → runtime semantics → memory → async/concurrency → ecosystem**.

Each chapter includes **Prerequisites**, **Learning goals**, and a **"Check your understanding"** section with three questions for active recall. Cover the answers and try to answer from memory — this is the most effective way to retain the material.

## Who this is for

This guide assumes you already write JavaScript confidently. You don't need to know systems programming or compiler theory. What you need is curiosity about *why* JavaScript behaves the way it does under load, and a willingness to run Node with a few flags.

## Contents

Reading times are estimates for focused reading. Allow extra time if you run the Node experiments.

### Foundations: how a value/program is represented
1. [JS Value Representation](./01-js-value-representation.md) — tagged values, Smi vs. HeapObject, strings, NaN-boxing. *(~15 min)*
2. [Parser & AST](./02-parser-and-ast.md) — lexing, parsing, the AST, lazy/streaming parsing. *(~10 min)*

### Compilation pipeline
3. [Bytecode Interpreter (Ignition)](./03-bytecode-interpreter-ignition.md) — register bytecode, type feedback, tiering. *(~10 min)*
4. [JIT Compiler (TurboFan)](./04-jit-compiler-turbofan.md) — speculative optimization, sea-of-nodes, key passes. *(~12 min)*

### Making dynamic code fast
5. [Hidden Class & Shapes](./05-hidden-class-and-shapes.md) — Maps/Shapes, transitions, dictionary mode. *(~10 min)*
6. [Inline Cache](./06-inline-cache.md) — mono/poly/megamorphic caching of lookups. *(~10 min)*
7. [Object Optimization](./07-object-optimization.md) — fast vs. dictionary properties, `Object` vs `Map`. *(~10 min)*
8. [Array Optimization](./08-array-optimization.md) — elements kinds, packed vs. holey, TypedArrays. *(~12 min)*
9. [Deoptimization](./09-deoptimization.md) — bailouts, deopt loops, how to avoid them. *(~10 min)*

### Runtime semantics
10. [Execution Context](./10-execution-context.md) — call stack, hoisting, TDZ, `this`. *(~10 min)*
11. [Closures & Scope Chain](./11-closures-and-scope-chain.md) — lexical scope, captured bindings. *(~10 min)*

### Memory
12. [Memory Layout](./12-memory-layout.md) — stack vs. heap, generational heap spaces. *(~10 min)*
13. [Garbage Collection](./13-garbage-collection.md) — Scavenger, Mark-Sweep-Compact, Orinoco, weak refs. *(~12 min)*

### Async & ecosystem
14. [Event Loop & Async Runtime](./14-event-loop-and-async-runtime.md) — micro/macrotasks, async/await, Node phases. *(~10 min)*
15. [Runtime APIs (Browser/Node)](./15-runtime-apis-browser-node.md) — engine vs. host, DOM/`fetch`/`fs`. *(~8 min)*
16. [Module System](./16-module-system.md) — ESM vs. CJS, module graph, dynamic import. *(~12 min)*
17. [Engine Threads & Concurrency](./17-engine-threads-and-concurrency.md) — workers, isolates, SharedArrayBuffer/Atomics. *(~10 min)*
18. [WebAssembly Integration](./18-webassembly-integration.md) — Liftoff/TurboFan, linear memory, JS interop. *(~10 min)*

## Study tips

- **Read actively, not passively.** Before turning the page, try to answer the "Check your understanding" questions from memory. If you can't, re-read the section that covers that concept.
- **Run the Node experiments.** The `--allow-natives-syntax` and `--trace-*` flags turn abstract concepts into concrete output you can observe. Seeing `%DebugPrint(42)` print "Smi" is worth more than re-reading the definition.
- **Connect the chapters.** The optimization story is one continuous thread: values (01) are observed by Ignition (03) into feedback vectors that TurboFan (04) uses to specialize code, keyed off hidden classes (05) via inline caches (06), and failures trigger deopts (09). Following this chain forward and backward is more valuable than reading each chapter in isolation.
- **Measure before optimizing.** Many of the patterns described here matter only in tight, frequently-executed code. The engine is very good. Read for understanding first; reach for these techniques only when profiling confirms you have a real bottleneck.

## Suggested reading paths

If this is your first pass or you're preparing for interviews, read in order: 01 → 02 → 03 → 04 → 10 → 11 → 14, which takes you from how values are stored through the compilation pipeline and into the runtime semantics you'll be asked about most. If you're chasing a performance problem, concentrate on 05 → 06 → 07 → 08 → 09 (shapes, inline caches, object and array layout, and deopts) together with the cheatsheet below. If you're debugging memory growth or out-of-memory crashes, read 12 → 13 → 11 (memory layout, garbage collection, and the closures that often cause leaks). To understand the differences between Node and the browser, follow 14 → 15 → 16 → 17. And if you're integrating WebAssembly, read 04 (for how guards and tiering work) then 17 (threads) then 18.

## How the pieces connect

```
Source text
   │  (02 Parser & AST)
   ▼
AST ──► (03 Ignition) Bytecode + Type Feedback ──► (04 TurboFan) Optimized machine code
                         │  feedback uses                 ▲   guards fail →
                         │  05 Hidden Classes              │   (09 Deoptimization)
                         │  06 Inline Caches               │
                         │  07 Object / 08 Array layout ───┘

   Values (01) live in memory (12), reclaimed by GC (13)
   Code runs in Execution Contexts (10) with Closures/Scopes (11)
   Async coordinated by the Event Loop (14); APIs from the host (15)
   Code organized via Modules (16); parallelism via Threads/Workers (17)
   Heavy compute can run as WebAssembly (18) in the same engine
```

## Quick experimentation cheatsheet (V8 / Node)

```bash
node --print-bytecode script.js            # Ignition bytecode (03)
node --trace-opt --trace-deopt script.js   # optimization & deopt decisions (04, 09)
node --trace-ic script.js                  # inline cache transitions (06)
node --trace-elements-transitions s.js     # array elements-kind changes (08)
node --allow-natives-syntax s.js           # %OptimizeFunctionOnNextCall, %DebugPrint, ...
node --max-old-space-size=4096 app.js      # raise heap limit (12)
node --expose-gc app.js                    # global.gc() for tests (13)
node --inspect app.js                      # DevTools: CPU/heap profiling (12, 13)
```

A quick orientation on what each one tells you: `--print-bytecode` shows how a function maps to Ignition's instructions and feedback slots; `--trace-ic` reveals when an access site degrades from monomorphic toward megamorphic; `--trace-deopt` tells you *why* optimized code bailed out; `%DebugPrint(x)` exposes whether a value is a Smi or a HeapNumber and what an object's Map and elements kind are; and Chrome's Performance panel shows where main-thread time goes.

> Tip: the engine is highly optimized and continually evolving (Sparkplug, Maglev, Orinoco, and so on). Treat these notes as a **mental model**, and **always measure** before optimizing real code.
