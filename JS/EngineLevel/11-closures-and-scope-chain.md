# Closures & Scope Chain

> How JavaScript decides which variable a name refers to across nested functions, and how closures keep variables alive long after the function that created them has returned.

**Prerequisites:** `10-execution-context` (closures depend on the outer-environment link).  
**After this chapter you will understand:** (1) what lexical scoping means and how it differs from dynamic scoping, (2) why closures capture *bindings* not values — the key to the `var`-loop puzzle, (3) how to prevent closures from creating memory leaks.

## 1. Lexical scope

JavaScript uses **lexical scoping**, also called static scoping, and the word "lexical" is the key: where a variable can be accessed is determined by *where it is physically written in the source code*, not by where or how a function is later called. An inner function can see the variables of the functions that textually surround it, because that relationship is fixed at authoring time.

```js
function outer() {
  const x = 10;
  function inner() {
    console.log(x);   // resolves to outer's x, because inner is written inside outer
  }
  inner();
}
```

This matters because it means you can determine a variable's resolution just by reading the code's structure, without running it. The engine takes advantage of exactly this during parsing (see `02-parser-and-ast.md`), when it figures out the scope structure ahead of execution.

## 2. The scope chain

When a function is created, it gets a link to the environment in which it was defined. Looking up a variable means walking this chain of environment records *outward* — from the innermost scope toward the global scope — until the name is found, or until the chain runs out.

```js
let g = "global";
function a() {
  let av = "a";
  function b() {
    let bv = "b";
    console.log(bv, av, g);   // bv found in b, av found in a, g found in global
  }
  b();
}
```

The lookup for that `console.log` proceeds in order: check `b`'s own environment (finds `bv`), then `a`'s environment (finds `av`), then the global environment (finds `g`). If a name isn't found anywhere along the chain, you get a `ReferenceError` — or, in non-strict mode, an assignment to an undeclared name accidentally creates a global variable, which is a notorious bug source and one of the reasons strict mode exists.

## 3. What a closure is

A **closure** is a function bundled together with references to its surrounding lexical environment. The defining property — and the reason closures are powerful — is that because the inner function holds a reference to the outer environment, that environment *survives* even after the outer function has returned and its stack frame is gone.

```js
function makeCounter(start) {
  let count = start;          // a local variable in makeCounter
  return function () {
    count += 1;               // still reachable after makeCounter has returned
    return count;
  };
}

const c = makeCounter(10);
c();   // 11
c();   // 12 — the same `count` persists between calls
```

Walking through what happens: `makeCounter` runs and creates `count`. It returns an inner function that references `count`. Normally, when `makeCounter` returns, its local variables would vanish along with its stack frame — but here the returned function still holds a reference to the environment containing `count`, so the engine keeps that environment alive. Each call to `c()` reaches into that same surviving environment and increments the same `count`. The function has "closed over" `count`.

## 4. Closures capture bindings, not values

This is the single most important subtlety, and the source of a famous interview question. A closure captures the *binding* — the variable itself — not a snapshot of the value at the moment the closure was created.

```js
// With var: one shared binding for the whole loop.
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Logs: 3, 3, 3

// With let: a fresh binding each iteration.
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Logs: 0, 1, 2
```

In the `var` version there is exactly one `i` shared across all iterations. By the time the timeouts fire, the loop has finished and `i` is `3`, so all three callbacks see `3`. In the `let` version, the language creates a new `i` binding for each iteration, so each callback closes over a different `i` holding the value it had during that iteration. Mentally, the `let` loop behaves as if each iteration wrapped its body in its own little function scope capturing its own copy of `i`.

## 5. How the engine implements closures

The engine doesn't pay the cost of closures for every variable — it's more surgical than that. During parsing, V8 records which variables are actually *captured* by inner functions. Variables that are never captured can stay in fast machine stack frames or registers and disappear when the function returns, just like in a language without closures. But variables that *are* captured are allocated in a heap-resident **context object** so they can outlive the call, and the closure (internally a `JSFunction`) stores a pointer to that context.

```
A closure (JSFunction)
   └── [[Environment]] → Context { count: 12, ... }   (lives on the heap)
```

This is why closures have a small, real cost: the captured environment is heap-allocated and stays alive as long as the closure is reachable. For normal code this cost is negligible, but it's the mechanism behind the memory considerations below.

## 6. What closures are good for

Closures aren't an academic curiosity — they're behind a huge amount of everyday JavaScript. They provide **data privacy**: a factory function can keep state in a closed-over variable and expose only a controlled API, with no way for outside code to touch the private state directly (the classic module pattern). They enable **function factories and currying**, where you partially apply some arguments and return a function that remembers them. They make **callbacks and event handlers** work, by letting a handler remember context across an asynchronous gap. They power **memoization**, caching results in a captured variable. And React's hooks like `useState` lean heavily on closures to associate state with a component across renders.

## 7. The memory pitfall

The flip side of "closures keep their environment alive" is that a closure keeps its *entire* captured environment reachable — not just the one variable it happens to use. If a long-lived closure captures a large object, that object can't be garbage-collected for as long as the closure exists. This is a common source of memory leaks.

```js
function attach(element, hugeData) {
  element.addEventListener("click", () => {
    console.log(hugeData.length);   // captures hugeData
  });
  // If this listener is never removed, hugeData stays alive forever.
}
```

The mitigations are practical: remove event listeners when you're done with them, clear timers and intervals, null out references you no longer need, and be especially careful with closures captured by long-lived things like global timers. If you only need a small piece of a large object, extract that piece into a local variable and capture *it* rather than the whole object. For associating data with an object without preventing its collection, a `WeakMap` (see `13-garbage-collection.md`) is the right tool.

## 8. Performance notes

Don't avoid closures out of performance fear — V8 optimizes them well, and they're idiomatic. The one habit worth keeping is to define methods that don't need per-instance state on the prototype or in a class body, where they're shared, rather than creating a fresh closure for every instance, which costs memory (this echoes the advice in `07-object-optimization.md`). Deeply nested scope chains add a tiny lookup cost, but it's almost always negligible and not worth restructuring code over.

## 9. A few misconceptions

The biggest one is believing a closure copies the variable's value at the moment it's created; it actually captures a reference to the binding, so the value it sees can change afterward — which is the whole `var`-loop lesson. Another is thinking an inner function closes over *all* of the outer function's variables; the engine only allocates a context for the variables that are genuinely captured. And while arrow functions and regular functions differ in how they treat `this` and `arguments`, they use the exact same closure mechanism for ordinary variables.

## 10. Check your understanding

1. Three `setTimeout(() => console.log(i), 0)` callbacks in a `var` loop all log `3`. Three in a `let` loop log `0`, `1`, `2`. Explain exactly why, in terms of bindings and closures.
2. `function attach(el, data) { el.addEventListener('click', () => process(data)); }` — under what condition does this code cause a memory leak, and what are two ways to prevent it?
3. Does an inner function close over *all* of its outer function's variables, or only the ones it uses? What is the practical implication for memory?

## 11. Key takeaways

JavaScript is **lexically scoped**, so variable lookup walks the **scope chain** outward through the environments that textually enclose the code. A **closure** is a function together with its captured lexical environment, and that environment persists after the outer function returns — which is what lets closures hold state. Closures capture **bindings, not values**, the detail behind the `var`-versus-`let` loop behavior. Captured variables are **heap-allocated**, so long-lived closures that hold large data are a real memory-leak risk; clean up listeners and timers, and capture only what you need.
