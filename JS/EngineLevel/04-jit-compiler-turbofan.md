# JIT Compiler (TurboFan)

> V8's optimizing compiler: it turns hot bytecode plus type feedback into fast native machine code — and gracefully unwinds when its assumptions turn out to be wrong.

## 1. What "Just-In-Time" really means

A traditional ahead-of-time compiler (like a C compiler) runs once, before the program ever executes, and has to produce code that's correct for every possible input. A **Just-In-Time (JIT)** compiler does something fundamentally different: it compiles code *while the program is running*, which means it gets to use information that an ahead-of-time compiler could never have — namely, what types of values actually flow through a function in practice.

That's the whole edge. By the time a function is hot, Ignition has already watched it run thousands of times and recorded "this argument has always been a small integer" or "this property is always read from objects of shape S." V8's optimizing compiler, **TurboFan**, takes that hot function's bytecode together with this accumulated **type feedback** and generates machine code that is *specialized* for the cases that actually occur, skipping the generic, defensive logic that would otherwise be needed to handle every theoretical possibility.

## 2. The tiers, briefly

TurboFan doesn't work alone. A function climbs a ladder of compilers as it gets hotter. Ignition interprets bytecode. Sparkplug compiles bytecode to simple machine code very quickly, removing interpreter overhead without doing real optimization. Maglev is a mid-tier optimizing compiler — faster to compile than TurboFan but producing good code. TurboFan sits at the top: it's the slowest to compile but produces the fastest code. The reason for the middle tiers is that TurboFan's compilation is expensive, and Maglev exists to close the gap so a function can get *some* optimization quickly while TurboFan works on the best version in the background.

## 3. Speculative optimization, concretely

TurboFan's power comes from **speculation**, and the easiest way to understand it is with an example.

```js
function sum(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i];
  }
  return total;
}
```

Suppose this function has been called many times, always with arrays of small integers (what `08-array-optimization.md` calls `PACKED_SMI_ELEMENTS`). The feedback says so. TurboFan can then generate code that *assumes* `arr` is a dense array of integers: it can read elements without checking the type of each one, it can use raw integer addition instead of the general `+` operator that has to consider strings and objects, and it can often eliminate per-iteration bounds checks because it can prove `i` stays within range.

But assumptions can be violated, so TurboFan protects each one with a cheap runtime check called a **guard**. At the top of the optimized `sum`, it inserts something morally equivalent to "if `arr`'s elements kind is not packed-integers, abandon this fast code." As long as that guard passes, the loop runs at near-native speed. The first time you call `sum([1.5, 2])`, the guard fails, and the engine **deoptimizes** — it throws away (or stops using) the specialized code and resumes in the interpreter, which re-collects feedback reflecting that doubles are now in play (see `09-deoptimization.md`). The crucial insight is that JIT code is fast *precisely because* it assumes things, and it stays fast only as long as those assumptions hold. Type instability is what turns this strength into a weakness.

## 4. The sea-of-nodes intermediate representation

To optimize aggressively, TurboFan doesn't reason about your function as a sequence of source lines. It builds an internal representation called a **"sea of nodes"** — a single graph in which nodes are operations (add, load, branch) and edges represent the *real* dependencies between them, both data dependencies and control dependencies. The key property is that nodes are only ordered by their genuine dependencies, not by the order you happened to write them. This looseness gives the optimizer enormous freedom to move operations around, combine them, and delete the ones that don't matter, because it isn't artificially constrained by source order.

The pipeline roughly proceeds like this:

```
bytecode + feedback
   → build the sea-of-nodes graph
   → typing and lowering   (JS-level ops → simpler ops → machine ops)
   → optimization passes    (inlining, redundancy elimination, escape analysis, …)
   → scheduling             (assign the floating nodes into ordered basic blocks)
   → register allocation
   → machine code + deopt metadata
```

The "lowering" step is worth noticing: a high-level JavaScript `+` gets gradually rewritten into simpler and simpler operations until it reaches actual machine instructions, and at each level the optimizer can apply more knowledge.

## 5. The optimizations that matter most

**Inlining** is the foundational one. When TurboFan inlines a function call, it replaces the call with a copy of the callee's body. This removes the overhead of the call itself, but far more importantly, it lets the optimizer see *across* the old boundary — constants from the caller can now propagate into the callee, redundant checks on both sides can be merged, and so on. Most other optimizations become far more effective once inlining has exposed more code to work with. Inlining is blocked, though, by things like very large function bodies and megamorphic call sites where the target isn't predictable.

**Type specialization** is the payoff of all that feedback: where the compiler can prove a value is, say, always a 32-bit integer or always a double, it uses raw machine integers and floats instead of tagged, boxed JavaScript values, eliminating both the tagging overhead and the type checks.

**Escape analysis** is one of the most satisfying. If TurboFan can prove that an object created inside a function never "escapes" — it's never stored somewhere outside the function or returned — then it doesn't actually need to allocate that object on the heap at all. It can keep the object's fields in registers, a transformation called scalar replacement. An allocation that would have pressured the garbage collector simply vanishes.

On top of these, TurboFan does the classic compiler optimizations: **redundancy elimination** (computing a common subexpression once, removing repeated map checks), **bounds-check elimination** (dropping array bounds checks it can prove are always safe), **loop-invariant code motion** (hoisting computations that don't change out of loops), and **constant folding** (evaluating constant expressions at compile time).

A small illustration of inlining plus constant folding working together:

```js
function double(x) { return x + x; }
function use()     { return double(21); }
// After inlining, `use` may effectively become `return 21 + 21`,
// and after constant folding, simply `return 42` — the call to
// `double` disappears entirely.
```

## 6. Guards and the path back

Every speculative decision leaves behind a guard in the generated code, something like "if this object's Map isn't the expected one, deoptimize." For deoptimization to work, the optimized code carries **deopt metadata** that describes how to reconstruct the interpreter's view of the world — which bytecode register holds which value — at every point a guard might fail. When a guard does fail, the engine uses that metadata to rebuild Ignition's state and resume interpreting as if the optimized code had never run. This is what makes speculation safe: correctness is never sacrificed, only speed, and only temporarily.

## 7. Compilation runs off the main thread

TurboFan (and Maglev) compile on **background threads** inside V8. This means optimizing a hot function does not block your JavaScript from continuing to run on the main thread. When the background compilation finishes, the freshly optimized code is installed, and the next call into the function jumps into the fast version. This concurrency is part of why modern V8 can optimize aggressively without introducing visible pauses, and it ties into the broader threading story in `17-engine-threads-and-concurrency.md`.

## 8. Watching it work

You can observe the optimizer's decisions directly:

```bash
node --trace-opt --trace-deopt script.js     # logs tier-ups and deopts with reasons
node --print-opt-code --print-opt-code-filter=sum script.js   # the actual machine code (advanced)
```

And with `--allow-natives-syntax` you can drive it manually in experiments:

```js
function hot(x) { return x * 2; }
%PrepareFunctionForOptimization(hot);
for (let i = 0; i < 1e5; i++) hot(i);
%OptimizeFunctionOnNextCall(hot);
hot(1);
console.log(%GetOptimizationStatus(hot));   // a bitmask describing optimized/deoptimized state
```

Reading `--trace-opt` you'll see lines indicating a function is being optimized; `--trace-deopt` will tell you the *reason* a bailout happened — phrases like "wrong map" or "not a Smi" — which is gold when you're chasing down a performance problem.

## 9. Writing code the JIT can keep fast

The guidance here follows directly from how speculation works, and it can be summed up as: be predictable on hot paths. Keep argument and variable types stable — don't pass integers on one call and objects on the next, and don't flip a loop variable between integer and float. Keep object shapes monomorphic at hot property accesses (chapters `05` and `06`). Keep arrays packed and homogeneous (`08`). Avoid the specific patterns that force deoptimization in tight loops, such as changing an array's element kind, reading holes, or `delete`-ing object properties. And don't deliberately make functions un-inlinable for no reason. The historical advice about `try/catch` and `arguments` hurting optimization has largely been addressed in modern V8, so don't cargo-cult old rules — but do keep types and shapes steady. Above all, profile before micro-optimizing, because the engine is genuinely very good and readable code usually wins.

## 10. Key takeaways

TurboFan is V8's top-tier optimizing JIT, driven entirely by the type feedback Ignition collected. It represents your function as a sea-of-nodes graph that frees it to reorder and eliminate operations, and it applies inlining, type specialization, escape analysis, and the classic compiler optimizations to produce tight machine code. Every speculation is protected by a cheap guard, and a failed guard triggers deoptimization back to the interpreter — so the practical lesson is that **type and shape stability are what keep you in fast code**. Compilation happens concurrently off the main thread, so your job isn't to outsmart the compiler with syntax tricks; it's to give it predictable runtime behavior to work with.
