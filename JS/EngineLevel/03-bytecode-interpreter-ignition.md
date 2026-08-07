# Bytecode Interpreter (Ignition)

> V8's baseline tier: it turns the AST into compact bytecode, runs it, and quietly gathers the profiling data that makes everything faster later.

**Prerequisites:** `02-parser-and-ast` (Ignition consumes the AST).  
**After this chapter you will understand:** (1) why using an interpreter first is faster than compiling everything to machine code immediately, (2) what a feedback vector records and why it is critical for optimization, (3) how functions tier up to faster compilers and fall back on deoptimization.

## 1. Why an interpreter at all?

It's tempting to assume the fastest engine would compile every function straight to optimized machine code. In practice that would be a terrible default. Generating optimized machine code is slow and produces a lot of code in memory, and the overwhelming majority of functions in a program either run only a handful of times or never run at all. Spending heavy compilation effort on code that barely executes is wasted work, and it would make startup sluggish and memory usage balloon.

So V8 takes a more pragmatic path. It compiles the AST into a compact, portable **bytecode** and runs that bytecode in an interpreter called **Ignition**. This buys three things at once. Startup is fast, because generating bytecode is cheap. Memory stays low, because bytecode is far smaller than machine code. And — this is the subtle, important part — running in an interpreter gives V8 a natural place to *observe* what the program actually does and record that information for later. The right mental model for Ignition is: **run correctly first, collect evidence while running, and only optimize the code that proves it's worth it.**

## 2. Where Ignition sits among the tiers

Ignition is the baseline. Above it sit faster compilers that kick in only when a function gets "hot" (executed enough times to be worth optimizing):

```
   AST
    │
    ▼
 Ignition  ──────────  interpret bytecode  (also where deopts land)
    │ hot
    ▼
 Sparkplug  ─────────  quick, non-optimizing machine code
    │
    ▼
 Maglev  ────────────  mid-tier optimizing compiler
    │
    ▼
 TurboFan  ──────────  top-tier optimizing compiler (slowest to compile, fastest code)
```

The exact set of tiers and the thresholds between them have changed across V8 versions — Sparkplug and Maglev are relatively recent additions — but the philosophy is constant: start cheap, and invest more compilation effort only as a function demonstrates it's hot. When optimized code's assumptions break, execution falls all the way back down to Ignition (see `09-deoptimization.md`), which is why the baseline always has to be ready to run anything.

## 3. A register machine with an accumulator

Ignition is a **register-based** interpreter, which distinguishes it from stack-based virtual machines like the JVM. Each function gets a set of virtual registers (`r0`, `r1`, …) plus one special register called the **accumulator**. Many bytecode operations implicitly read from and write to the accumulator, which keeps the bytecode compact because those operations don't need to spell out where their result goes.

Consider `return a + b`. Conceptually, Ignition might produce something like:

```
Ldar a      ; load `a` into the accumulator
Add  b      ; accumulator = accumulator + b
Return      ; return whatever is in the accumulator
```

`Ldar` means "Load Accumulator from Register" and `Star` (not shown here) means "Store Accumulator to Register." Because `Add` already knows it operates on the accumulator, it only needs to name its second operand, `b`. This implicit-accumulator design is a big reason the bytecode stays small, which in turn keeps memory low and instruction-fetch fast.

## 4. Bytecode handlers

Each kind of bytecode has a **handler** — a small piece of pre-compiled machine code that performs the operation and then jumps to the next bytecode (a technique called threaded dispatch). The clever part is that these handlers are written once, in a portable low-level form (V8 uses CodeStubAssembler and Torque for this), and are *shared* across every function in the program. Your function doesn't get its own copy of the "add" logic; it just gets a bytecode array that says "do an add here," and the shared handler does the work. The per-function cost is therefore mostly just the bytecode array plus its feedback vector, which is exactly what keeps Ignition lightweight.

## 5. Feedback vectors: the hidden profiler

This is the most important job the interpreter does for long-term performance, and it's worth dwelling on. As bytecode runs, certain operations record what they actually encountered into a side structure attached to the function called the **feedback vector**. Think of it as a notebook where the interpreter jots down "every time I executed this property access, here's the kind of object I saw."

Concretely, a property load like `obj.x` records the **hidden class (Map)** of the objects it sees — this is the inline cache mechanism covered in `06-inline-cache.md`. An arithmetic operation records whether its operands were small integers, doubles, or strings. A function call records which target was actually invoked. Each of these "interesting" bytecodes has a slot in the feedback vector where this observed behavior accumulates.

```js
function readX(obj) {
  return obj.x;   // this property-load bytecode has a feedback slot
}
```

The first time `readX` runs, the slot is empty, so the interpreter does a full lookup and records the result. On later calls, if the same shape shows up, it's a cheap cache hit. If many different shapes flow through, the slot records that the site has become polymorphic or even megamorphic.

Why does this matter so much? Because the optimizing compiler is *speculative* — it makes its code fast by betting on facts like "this `.x` access is always on shape S." Without the feedback vector, the compiler would have no idea what's actually true at runtime and would be forced to assume the worst case for every operation, defeating the whole point of optimization. The feedback vector is the bridge between "dynamic JavaScript" and "fast specialized machine code."

## 6. Tiering up and down

V8 counts how often each function is invoked and how many times its loops iterate. When those counts cross thresholds, the function is considered hot. At that point it may first be handed to Sparkplug, which quickly turns the bytecode into straightforward (non-optimizing) machine code to shave off interpreter overhead. If it stays hot, Maglev and/or TurboFan optimize it using the feedback that Ignition gathered.

The reverse can also happen. If optimized code makes a speculative assumption that later turns out to be wrong — say, a function that always received integers suddenly gets a string — the optimized code can no longer run safely, and execution **deoptimizes** back down to Ignition. The interpreter picks up exactly where the optimized code left off, re-collects feedback reflecting the new reality, and the function may be re-optimized later with better information. This up-and-down movement is normal and is covered in detail in `09-deoptimization.md`.

## 7. Inspecting bytecode yourself

You can see the actual bytecode V8 generates, which is a great way to make all of this concrete:

```bash
node --print-bytecode --print-bytecode-filter=add your-script.js
```

with, for example:

```js
function add(a, b) { return a + b; }
add(1, 2);
```

The output shows the function's register count, how parameters map to registers, each bytecode instruction with its operands, and — importantly — the **feedback slot indices** attached to operations like property loads. Being able to read this is what lets you connect a source line to its bytecode and then to the entries you'll later see in `--trace-ic` or `--trace-deopt` output. It turns abstract talk of "feedback slots" into something you can point at.

## 8. How this connects to writing fast code

Everything Ignition records becomes the raw material for optimization, so the quality of that recorded feedback directly limits how well TurboFan can do its job. If a hot function always receives arguments of the same type, its arithmetic feedback stays clean and the optimizer can specialize. If the same object shape always flows into `obj.prop`, the load stays monomorphic and can be compiled to a single offset read. But if a generic utility function receives objects of a hundred different shapes, the feedback at that site goes megamorphic, and the optimizer essentially gives up on specializing it. In other words, the discipline you'll read about in the next several chapters — stable types, stable object shapes, stable array kinds — is really about feeding Ignition good data.

## 9. A couple of misconceptions

"Interpreted means permanently slow" is wrong: Ignition is highly tuned, and any code that runs enough to matter quickly leaves the interpreter for compiled tiers. "Bytecode is just a debugging artifact" is also wrong — it is the primary execution form for cold code and the landing pad after every deoptimization. And no, adding TypeScript types does not make V8 faster; types are erased before execution, and the engine optimizes purely on the runtime values it observes.

## 10. Check your understanding

1. Why does V8 use an interpreter at all, rather than compiling every function directly to optimized machine code at startup?
2. A property access `obj.x` has a feedback slot. What does that slot record, and how does TurboFan later use that information?
3. You run `node --print-bytecode --print-bytecode-filter=add script.js`. What does the output tell you, and what would you look for to understand the function's type feedback?

## 11. Key takeaways

Ignition compiles the AST into compact, register-based bytecode and interprets it, serving as V8's cheap, fast-starting, low-memory baseline tier. Its accumulator-plus-registers design and shared bytecode handlers are what keep it lightweight. Most importantly, while it runs your code it fills in **feedback vectors** that record the types, shapes, and call targets actually seen — and that feedback is what makes the speculative optimizing compilers possible. Hot functions tier up through Sparkplug, Maglev, and TurboFan; when speculation fails, they tier back down to Ignition. If you want to see the real instructions, `--print-bytecode` shows you exactly what your functions compile to.
