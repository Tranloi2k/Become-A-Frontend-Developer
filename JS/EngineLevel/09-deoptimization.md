# Deoptimization

> What happens the moment the JIT's optimistic assumptions break — and why the truly expensive thing isn't a single deopt but a deopt *loop*.

**Prerequisites:** `03-bytecode-interpreter-ignition`, `04-jit-compiler-turbofan`, `05-hidden-class-and-shapes`.  
**After this chapter you will understand:** (1) why deoptimization is first a correctness mechanism and only second a performance cost, (2) what a deopt loop is and how to identify one, (3) how to read `--trace-deopt` output to find the root cause.

## 1. Why deopt has to exist

The optimizing compiler makes code fast by speculating: it bets that a value is always a small integer, that an object always has a particular hidden class, that an array is always packed integers (see `04-jit-compiler-turbofan.md`). Those bets are only safe because each one is backed by a **guard** — a cheap runtime check. When a guard fails, the optimized code is no longer valid for the situation at hand, and the engine has to abandon it and continue executing correctly in the interpreter. That bailout is **deoptimization**.

It's worth holding two ideas in your head at once. Deopt is first and foremost a *correctness* mechanism: it's what lets the compiler speculate aggressively without ever producing wrong results, because if reality diverges from the assumption, the engine safely falls back. But each deopt is also a *performance event*, because falling back means discarding fast code and possibly recompiling later. A few deopts during warm-up are completely normal and nothing to worry about. Many deopts on a hot path, over and over, are a real problem. The skill is telling those two situations apart.

## 2. The bailout, step by step

Optimized machine code is peppered with **deopt points**, each carrying metadata that describes how to translate the optimized machine state back into the interpreter's state. When a guard fails, here's the sequence:

```
1. Optimized code is running.
2. A guard fails — an unexpected type, shape, or arithmetic overflow shows up.
3. The engine reads the deopt metadata at that point.
4. It reconstructs Ignition's registers and stack from that metadata.
5. It discards (or stops using) the optimized code.
6. Execution resumes in the interpreter at the equivalent bytecode.
```

After this, the function runs interpreted again, re-collects feedback that now reflects the new reality, and may be re-optimized later with that better information. The reconstruction in steps 3–4 is the clever part: the optimized code may have kept values in registers or even optimized some away entirely, so the metadata has to be detailed enough to rebuild exactly what the interpreter expects to see.

## 3. Eager versus lazy deopt

There are two flavors, distinguished by *when* the bailout is triggered. An **eager deopt** happens right now, in the currently executing function, because a guard it just checked failed. A **lazy deopt** is subtler: the optimized code is still running fine, but something it *depended on elsewhere* has changed — for example, a prototype it assumed was stable got mutated, or a function it inlined was redefined. The optimized code is marked invalid, and it deoptimizes the next time control reaches it.

```js
function read(o) { return o.x; }
// Suppose `read` was optimized assuming a particular prototype is stable.
Object.setPrototypeOf(someInstance, somethingNew);
// That invalidates the assumption; the next call to read() may lazy-deopt.
```

Lazy deopts are why "spooky action at a distance" — mutating a prototype somewhere far from your hot loop — can quietly slow down code that looks untouched.

## 4. The usual causes, and how to read them

Most deopts come from a handful of recurring situations, and the trace logs name them with short reason strings. **Type instability** is the big one: a variable or argument that was always a small integer suddenly becomes a double, a string, or an object, and you'll see reasons like "not a Smi." **Shape changes** — an object with an unexpected hidden class arriving at a site the compiler had specialized for one shape — show up as "wrong map." **Array elements-kind changes**, like a packed-integer array suddenly holding a double or a hole, are another frequent source. **Arithmetic overflow** can trigger a deopt with "lost precision" when a Smi operation produces a result that no longer fits in a Smi and has to become a double. Reading `undefined` or a hole where a value was expected does it too. And **prototype or Map mutation** — `Object.setPrototypeOf`, or adding methods to a prototype after optimization — invalidates assumptions broadly. (Older V8 also struggled with `arguments` misuse, `try/catch`, `with`, and `eval`; most of these have improved a lot, but extreme cases can still limit optimization.)

The fix for nearly all of these is the same theme repeated: keep types stable, keep shapes monomorphic, keep arrays packed and homogeneous, and don't mutate prototypes of objects that participate in hot code.

## 5. The real danger: deopt loops

A single deopt is relatively cheap. The thing that genuinely wrecks performance is a **deopt loop**: a hot function gets optimized, immediately hits the same failing guard, deopts, gets re-optimized because it's still hot, hits the same guard again, deopts again — burning CPU on compilation and bailout repeatedly without ever settling into fast code.

```
optimize → run → deopt → optimize → run → deopt → optimize → ...
```

V8 doesn't tolerate this forever. If a function deopts too many times, the engine may give up and mark it as permanently un-optimizable, leaving it stuck in the interpreter for the rest of the program's life. The symptom to watch for is high CPU together with `--trace-deopt` output that keeps naming the same function and bytecode offset. The cure is to find and remove whatever condition keeps changing — the type, the shape, or the array kind — or to split the code so the stable, hot path is separated from the unstable, cold one:

```js
function process(record) {
  if (record.kind === 'A') return fastPathA(record);   // stays monomorphic
  return slowGeneric(record);                           // the messy cases live here
}
```

## 6. Diagnosing deopts

```bash
node --trace-deopt --trace-opt bench.js
```

The log shows, for each deopt, the reason string ("wrong map," "not a Smi," "lost precision," and so on), the function involved, and the bytecode offset — which you can line up with `--print-bytecode` output to find the exact source construct. The "Deopt Explorer" VS Code extension presents this more visually, and Chrome DevTools performance profiles surface deopt information as well. With `--allow-natives-syntax` you can also probe a function's state directly:

```js
function fn(x) { return x + 1; }
%PrepareFunctionForOptimization(fn);
for (let i = 0; i < 1e5; i++) fn(i);
%OptimizeFunctionOnNextCall(fn);
fn(1);
console.log(%GetOptimizationStatus(fn));   // a bitmask telling you if it's optimized, deoptimized, etc.
```

## 7. A worked example of type instability

```js
function add(a, b) {
  return a + b;
}

for (let i = 0; i < 1e6; i++) add(1, 2);   // always Smi + Smi → optimizes nicely
add("x", "y");                              // suddenly string + string → deopt at the + site
for (let i = 0; i < 1e6; i++) add(1, 2);   // may re-optimize, or stay more generic now
```

The single string call is enough to invalidate the integer-specialized version. If both the numeric and the string usages are genuinely hot, the clean solution is to give them separate functions so each one's feedback — and therefore each one's optimized code — stays focused on a single case.

## 8. When deopt is perfectly fine

Don't treat every deopt as a defect. Deopt is a normal part of warm-up: code starts in the interpreter, gets optimized, and occasionally adjusts as it sees a slightly wider range of inputs. Rare edge cases — an error path, a logging branch, a one-time configuration step after startup — will deopt and it simply doesn't matter. You only need to care when deopts happen *repeatedly in steady state* on a path that runs constantly. Contorting your code to eliminate a harmless warm-up deopt is wasted effort; measure first, and act only on the deopts that show up hot.

## 9. Check your understanding

1. A function deopts once during startup, runs interpreted, and is later re-optimized. Is this a problem you should fix? When *does* a deopt become worth investigating?
2. `--trace-deopt` shows a function named `processRecord` deopting repeatedly with reason `"wrong map"`. What does this tell you about `processRecord`'s inputs, and what is the likely fix?
3. What is a deopt loop, and what is V8's ultimate response if a function keeps entering one?

## 10. Key takeaways

Deoptimization is the engine bailing out of optimized code back to the interpreter when a speculative guard fails — a correctness mechanism first, a performance event second. Its common causes are type instability, shape changes, elements-kind changes, prototype mutation, and arithmetic overflow, all of which trace back to the stability themes from earlier chapters. The thing that actually hurts is a **deopt loop**, which can get a function permanently marked un-optimizable, so the goal is to find and fix the root cause (using `--trace-deopt` to locate it) rather than scattering coercion tricks around. And occasional deopt during warm-up or on cold paths is normal and not worth chasing.
