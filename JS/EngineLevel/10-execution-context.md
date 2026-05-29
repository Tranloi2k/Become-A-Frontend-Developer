# Execution Context

> The internal environment a piece of JavaScript runs inside — the concept that explains hoisting, the temporal dead zone, `this`, and the call stack all at once.

## 1. What an execution context is

Whenever the engine runs a piece of code, it does so inside an **execution context**: an internal bookkeeping structure that tracks *where we are* in the program and *what is currently in scope*. You never touch an execution context directly — it's part of the engine's machinery — but almost every "why does JavaScript behave like this?" question about variables and `this` has its answer here.

There are three kinds. The **global execution context** is created once when a program or module starts running; it's the outermost environment. A **function execution context** is created fresh every time you call a function. And an **`eval` execution context** is created for code run through `eval`, which is rare and best avoided. Most of the interesting behavior lives in the function execution context, since that's what's created and destroyed constantly as your program runs.

## 2. What a context holds

The ECMAScript specification describes each context as holding a few key pieces. There's a **LexicalEnvironment**, which stores the bindings for `let`, `const`, and `class` declarations, and — crucially — holds a link to the *outer* environment, which is how scopes chain together. There's a **VariableEnvironment**, which holds `var` and function declarations. There's the **`this` binding**, the value `this` refers to in that context. And there's a reference to the **Realm** — the global object and the set of built-in intrinsics like `Array` and `Promise` — along with the current code being executed.

A historical note that clears up a lot of confusion: older teaching materials talk about a "Variable Object," a "Scope Chain," and "this" as the three components of a context. The modern specification reorganized this into **Environment Records** and an **outer environment** pointer. The names changed, but the concepts map onto each other directly — environment records *are* the variable storage, and the outer pointer *is* the scope chain. If you read an old article and a new one, they're describing the same thing.

## 3. The call stack

Execution contexts are managed on a **call stack**, which operates last-in-first-out. When a function is called, its context is pushed onto the top of the stack; when the function returns, its context is popped off. Whatever is on top is what's currently running.

```js
function a() { b(); }
function b() { c(); }
function c() { /* we are here */ }
a();
```

At the moment `c` is executing, the stack looks like this, top to bottom:

```
│ c() context     │  ← currently running
│ b() context     │
│ a() context     │
│ Global context  │  ← the bottom, created at startup
```

This is exactly the structure you see in a stack trace, listed from the innermost call outward. It also explains stack overflows: if recursion (or mutual recursion) keeps pushing contexts without ever returning, the stack eventually exceeds its size limit and you get `RangeError: Maximum call stack size exceeded`.

## 4. Two phases: creation, then execution

This is the part that demystifies hoisting and the temporal dead zone. When a context is created, the engine does a **creation (setup) phase** *before* it runs the code line by line.

During the creation phase, the environment records are set up and declarations are processed in a specific way. `var` declarations are registered and immediately initialized to `undefined` — which is why you can reference a `var` before its line and get `undefined` rather than an error. Function declarations are *fully* hoisted, meaning both the name and the complete function body are available before the declaration line, which is why you can call a function declared further down. But `let` and `const` declarations are registered *without* being initialized: the binding exists, but touching it before its declaration line throws a `ReferenceError`. That uninitialized window is the **Temporal Dead Zone (TDZ)**. Also during this phase, `this` is determined, and for functions the parameters and the `arguments` object are bound.

Then the **execution phase** runs the code top to bottom: assignments happen, expressions evaluate, and calling other functions creates and pushes new contexts.

The classic demonstration:

```js
console.log(x);   // undefined — `var x` was hoisted and initialized to undefined
console.log(y);   // ReferenceError — `y` exists but is in the TDZ
var x = 1;
let y = 2;
```

The difference isn't that `let` "isn't hoisted" — it *is* registered during the creation phase — it's that `let` is left uninitialized until its declaration actually runs, whereas `var` is pre-filled with `undefined`.

## 5. The `this` binding

`this` is part of the execution context, and the rule that governs it for ordinary functions is: `this` is determined by *how the function is called*, not by where it was defined. This is the source of most `this`-related confusion, and it has a few cases. A plain function call `fn()` sets `this` to the global object in non-strict mode, or `undefined` in strict mode. A method call `obj.fn()` sets `this` to `obj`. Construction with `new Fn()` sets `this` to the freshly created object. And calling through `fn.call(x)`, `fn.apply(x)`, or a function created by `fn.bind(x)` sets `this` to `x`.

Arrow functions are the deliberate exception. An arrow function has no `this` of its own; instead it captures `this` from the enclosing lexical context at the point where it's defined. This is why arrows are so convenient for callbacks — they don't lose track of `this` the way a plain function passed as a callback would.

```js
const obj = {
  value: 42,
  regular() { return this.value; },        // `this` is obj when called as obj.regular()
  arrow:   () => this?.value,              // `this` comes from the surrounding scope, not obj
};
obj.regular();   // 42
obj.arrow();     // not 42 — the arrow's `this` is the outer (often module/undefined) `this`
```

## 6. How contexts chain into scope and closures

The `outer` pointer of each LexicalEnvironment links a context to the environment that lexically encloses it, and that chain of links *is* the scope chain (covered in `11-closures-and-scope-chain.md`). When a function is created, it captures a reference to the environment in which it was defined — and that captured reference is the foundation of closures. So the execution context isn't just about the function that's running right now; it's also the thing that, by being referenced from an inner function, can outlive its own call and keep variables alive.

## 7. The spec model versus what the engine really does

It's useful to know that "execution context" is a *specification* concept — an abstract model that defines correct behavior. The real V8 implementation doesn't allocate a heavyweight object for every call. Instead it uses machine **stack frames** that hold registers, locals, and return addresses, and it only allocates a separate heap-resident environment object when one is actually needed — for instance, when a closure captures a variable so that variable has to survive past the function's return. So the spec says "every call has an execution context," and the engine honors the *behavior* of that model while implementing it as efficiently as possible, allocating real environment objects lazily.

## 8. Why all of this matters

Understanding execution contexts pays off because it unifies a set of behaviors that otherwise feel like unrelated quirks. Hoisting and the TDZ stop being arbitrary rules once you see the creation phase. The differences between `var`, `let`, and `const` follow from how each is treated during that phase. The surprises around `this`, and why arrow functions fix so many of them, come straight from the binding rules. The call stack explains stack traces and stack overflows. And the outer-environment link is the bridge to scope chains and closures, which is where the next chapter picks up.

## 9. A few misconceptions

It's commonly said that `let` "is not hoisted." More precisely, it *is* hoisted — the binding is created during the creation phase — but it stays uninitialized until its declaration runs, which is what produces the TDZ. It's also tempting to think `this` refers to where a function was written; that's only true for arrow functions, while regular functions decide `this` from the call site. And the `var`-versus-`let` loop difference (each `let` iteration gets a fresh binding, while `var` shares one) is really a scoping detail that becomes vivid with closures, as the next chapter shows.

## 10. Key takeaways

An execution context is the environment in which a chunk of code runs — global, function, or eval — and contexts are pushed and popped on the **call stack** in last-in-first-out order. Each context goes through a **creation phase** (where hoisting happens, the TDZ is set up, and `this` is determined) followed by an **execution phase** that runs the statements. `this` for ordinary functions depends on how they're called, while arrow functions capture it lexically. And the **outer environment** link that chains contexts together is exactly what forms the scope chain and makes closures possible.
