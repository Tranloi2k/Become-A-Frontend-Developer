# WebAssembly Integration

> How WebAssembly runs side by side with JavaScript inside the very same engine — what it's good for, and where the boundary between the two costs you.

**Prerequisites:** `04-jit-compiler-turbofan` (Wasm also uses TurboFan), `17-engine-threads-and-concurrency` (Wasm threads require SharedArrayBuffer).  
**After this chapter you will understand:** (1) how V8 runs Wasm with the same Liftoff → TurboFan tiering as JavaScript, (2) why only numbers cross the JS/Wasm boundary directly and everything else goes through linear memory, (3) which kinds of work are better suited to Wasm versus JavaScript.

## 1. What WebAssembly is

**WebAssembly (Wasm)** is a portable **binary instruction format** for a stack-based virtual machine. It's not a language you typically write by hand; it's a *compilation target* for languages like C, C++, Rust, and Go, designed to run at **near-native speed** inside a safe, sandboxed environment — originally in the browser, and increasingly elsewhere. The crucial framing is that Wasm **complements** JavaScript rather than replacing it: the two are designed to work together, with each doing what it's best at.

Its design goals are worth keeping in mind because they explain its shape: Wasm aims to be **fast** (close to native performance), **safe** (sandboxed and memory-isolated), **portable** (runs anywhere there's a Wasm runtime), and **compact** (a small binary `.wasm` file that's quick to transmit and decode).

## 2. Why it exists

JavaScript is fast, but its dynamic nature puts a ceiling on *peak* and especially *predictable* performance for heavy computation — think codecs, cryptography, physics simulation, image and video processing, games, and emulators. The JIT does wonders, but it speculates and can deoptimize, so worst-case performance is hard to guarantee. Wasm offers a different bargain. Because it's statically typed and compiled ahead of (or just in) time without JavaScript's deopt machinery, it gives **predictable performance**. It lets you **reuse existing native code** — decades of battle-tested C, C++, and Rust libraries can be ported to the web instead of rewritten. And its **compact binary** is faster to decode than parsing an equivalently large blob of JavaScript.

## 3. How V8 runs Wasm

V8 hosts Wasm in the **same engine** as JavaScript, sharing infrastructure, and it uses a tiered approach that parallels the JavaScript story. **Liftoff** is a fast baseline compiler that turns Wasm into machine code quickly so the module starts running with minimal delay. **TurboFan** then re-optimizes the hot Wasm functions for peak performance — the same tiering idea as JS, where you start cheap and invest more in the code that proves it's hot. Wasm shares the engine's memory management and threading, and it runs on the same main thread and event loop as your JavaScript.

```
.wasm bytes → validate → Liftoff (fast baseline) → run
                              │ (function gets hot)
                              └── TurboFan (optimized)
```

The validation step at the front is part of the safety guarantee: a Wasm module is verified to be well-formed and type-correct before it's ever allowed to run.

## 4. The Wasm memory model

A Wasm module's memory is a single **linear memory**: one contiguous, resizable block of raw bytes, exposed to JavaScript as an `ArrayBuffer` (or a `SharedArrayBuffer` when threads are involved). This is fundamentally different from JavaScript's object heap. It's **sandboxed** — Wasm code can only read and write within its own linear memory and cannot reach arbitrary JavaScript objects or the rest of the process, with bounds enforced by the runtime. Wasm also has its own small set of value types — `i32`, `i64`, `f32`, `f64`, plus `v128` for SIMD and reference types — rather than JavaScript's single dynamic value type. The linear-memory model is part of why Wasm is both fast (it's just raw bytes you index into) and safe (it can't escape that block).

## 5. Interop between JavaScript and Wasm

JavaScript is in charge of loading, compiling, and instantiating a Wasm module, and then calling the functions the module exports.

```js
const result = await WebAssembly.instantiateStreaming(
  fetch("module.wasm"),
  { env: { log: (x) => console.log(x) } }   // imports JS provides to the module
);
const { add, memory } = result.instance.exports;
add(2, 3);                                    // call into Wasm from JS
```

The interface has two sides. **Exports** are the Wasm functions, memories, tables, and globals that the module exposes to JavaScript. **Imports** are the JavaScript functions and values the Wasm module needs from its host — callbacks, system-call-like helpers, and so on. The subtle and important part is what happens when data crosses the boundary: **numbers pass directly**, but **strings, objects, and structs do not**. Anything beyond a number has to be encoded into the linear memory (the shared `ArrayBuffer`) and addressed by offset and length. In practice, toolchains generate the marshalling glue so you rarely hand-write it, but understanding the cost is what leads to the key performance rule below. (`instantiateStreaming` is also worth noting because it compiles the module *while it downloads*, shaving startup time.)

## 6. Toolchains

You generally produce Wasm from another language using a toolchain. **Emscripten** compiles C and C++ to Wasm, emulating parts of POSIX and generating JavaScript glue. For **Rust**, `wasm-pack` and `wasm-bindgen` produce ergonomic JavaScript bindings. **AssemblyScript** is a TypeScript-like language that compiles directly to Wasm, which is appealing if you want to stay in a familiar syntax. And `wasm-bindgen` together with emerging interface standards (WIT, the component model) generate the marshalling glue needed to pass richer types across the boundary cleanly.

## 7. The cost of the bridge

Crossing between JavaScript and Wasm has overhead — both the boundary crossing itself and the marshalling of any non-number data through linear memory. This single fact drives the most important best practice: make calls **chunky, not chatty**. You want to cross the boundary rarely, handing Wasm a big workload each time, rather than calling into Wasm in a tight per-element loop where the crossing overhead dwarfs the actual work. Keep the hot data resident inside linear memory and minimize copying. The idiomatic division of labor is to use Wasm for the **compute kernel** — the heavy inner computation — and JavaScript for orchestration, glue, and UI.

## 8. Capabilities and evolving features

Wasm has grown well beyond its initial version. **SIMD** (`v128`) enables data-parallel math. **Threads**, via `SharedArrayBuffer` plus atomics, allow parallel Wasm (with the same cross-origin isolation requirement discussed in chapter `17`). **Bulk memory** operations speed up large copies and fills. There are also **reference types**, **multi-value** returns, **tail calls**, and **exception handling**. Particularly significant is **Wasm GC**, which lets managed languages like Java, Kotlin, and Dart target Wasm without having to ship their own garbage collector. And **WASI** — the WebAssembly System Interface — standardizes a syscall-like interface so Wasm can run *outside* the browser entirely, on servers, at the edge, and in plugin systems, via runtimes like Wasmtime and Wasmer.

## 9. Where Wasm fits

The practical decision of when to use Wasm comes down to the nature of the work. Use **JavaScript** for the DOM, application logic, glue, and the overwhelming majority of your code — it's more productive and more than fast enough. Reach for **Wasm** when you have a CPU-heavy kernel: codecs, encryption, compression, image/video/audio processing, physics, machine-learning inference, emulators, games, or when you want to port an existing native library rather than rewrite it. And beyond the browser, Wasm via WASI is increasingly used for serverless and edge compute, plugin architectures, and sandboxed extensions, precisely because its sandboxing and portability make it a safe way to run untrusted or third-party code.

```
┌─────────────────────────────────────┐
│             V8 isolate              │
│  ┌─────────────┐  ┌──────────────┐  │
│  │ JavaScript  │  │ WebAssembly  │  │
│  │ heap, objs  │  │ linear mem   │  │
│  └──────┬──────┘  └──────┬───────┘  │
│         │   imports /     │          │
│         └──── exports ────┘          │
└─────────────────────────────────────┘
```

## 10. Check your understanding

1. V8 compiles a Wasm module with Liftoff first, then re-optimizes hot functions with TurboFan. Why not compile with TurboFan immediately, given that Wasm is already typed and predictable?
2. You call a Wasm function 10 million times in a loop, passing a JavaScript string each time. Where is the performance cost, and how would you restructure the code to minimize it?
3. Your team is choosing between rewriting a video codec in pure JavaScript or compiling the existing C implementation to Wasm. What arguments favor Wasm here, and what additional complexity does Wasm introduce?

## 11. Key takeaways

WebAssembly is a **safe, fast, portable, compact binary format** that runs in the **same engine** as JavaScript — in V8 via a Liftoff baseline compiler and TurboFan optimizer, mirroring the JS tiering model. It uses a **sandboxed linear memory** (an `ArrayBuffer`) and its own static type system, isolated from the JavaScript heap. JavaScript and Wasm interoperate through **imports and exports**, but only numbers cross the boundary directly — everything else travels through shared linear memory, which is why you should **minimize boundary crossings** and keep calls chunky. Use Wasm for compute-heavy kernels and for reusing native code, and remember that **WASI** extends its reach well beyond the browser.
