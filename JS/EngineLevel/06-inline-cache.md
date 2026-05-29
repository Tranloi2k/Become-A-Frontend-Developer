# Inline Cache (IC)

> The mechanism that makes a repeated `obj.x` fast by remembering, right at that spot in the code, where `x` was found last time.

## 1. The idea

Imagine a line of code like `obj.x` sitting inside a function that runs millions of times. In the vast majority of real programs, the `obj` flowing through that particular line tends to have the *same shape* over and over — it's the same kind of object each time. So doing a full property lookup (consult the hidden class, find `x`, compute its offset) on every single execution is wasteful, because the answer is almost always identical to last time.

An **inline cache (IC)** is the optimization that exploits this. The engine caches the *result* of the property lookup directly at that call site, and reuses it as long as the object's hidden class still matches what it saw before. The name comes from the original technique (which dates back to the Smalltalk and Self languages) of patching the cached result "inline" into the generated code. In V8 the cached information lives in the function's feedback vector rather than literally in the instruction stream, but the concept is the same: remember the answer at the site, and skip the work when the situation repeats.

## 2. How it works for a property load

For a load like `obj.x`, the IC remembers a pair: a hidden class (Map) and the offset where `x` lives in objects of that class.

The first time the line executes, the cache is empty, so this is a "miss." The engine does the full lookup: it finds `obj`'s Map, locates property `x`, and discovers it's at, say, offset 0. It records "Map S → offset 0" into the feedback slot for this site.

On subsequent executions, the engine first checks: is `obj`'s Map still S? If yes — a "hit" — it reads directly from offset 0 with no lookup at all. That's the fast path. If `obj` has a different Map, that's a miss, and the IC updates itself to account for the new shape.

```
First execution (miss):
  look up x on obj's Map the slow way → record (Map S, offset 0)

Later executions:
  if obj.Map === S → read offset 0 directly      (fast, no lookup)
  else             → miss → record the new shape too
```

This feedback is exactly what Ignition populates (see `03-bytecode-interpreter-ignition.md`) and exactly what TurboFan reads to generate specialized, guarded machine code (see `04-jit-compiler-turbofan.md`). The IC is the connective tissue between the interpreter's observations and the compiler's optimizations.

## 3. The states an IC moves through

An inline cache site has a "temperature" based on how many distinct shapes it has encountered, and this directly determines how fast it is.

When it has never run, it's **uninitialized**. Once it has seen exactly one shape, it's **monomorphic** — this is the best case, because the generated code only needs a single Map check followed by an offset read. When it has seen a small number of distinct shapes (typically up to about four), it becomes **polymorphic**: the code now has to check the object against each remembered shape in turn, which is slower than monomorphic but still far better than a full lookup. And when it has seen too many shapes to track, it goes **megamorphic**, at which point V8 stops trying to cache per-shape and falls back to a generic global cache or a full lookup. A megamorphic site is the slow case, and it largely defeats the optimizer's ability to specialize that access.

The goal for any hot piece of code is to keep its IC sites monomorphic, or at worst low-degree polymorphic.

## 4. Seeing each state in code

```js
function getX(o) { return o.x; }   // exactly one IC site, at `o.x`
```

If every object you pass in shares one hidden class, the site stays monomorphic:

```js
class Point { constructor(x) { this.x = x; } }
for (let i = 0; i < 1e6; i++) getX(new Point(i));   // all Points share one shape
```

If you pass a couple of different shapes, the site becomes polymorphic — usually fine:

```js
getX({ x: 1 });
getX({ x: 1, y: 2 });   // a second, different shape → polymorphic
```

And if you funnel many different shapes through it, especially in a loop, it goes megamorphic:

```js
function logField(o) { return o.value; }
for (const row of thousandsOfDifferentlyShapedRows) logField(row);
```

That last pattern is the classic real-world cause of megamorphism: a generic utility — a logger, a serializer, some framework internal — that by its nature receives objects of countless shapes. It's not always avoidable, but it's worth knowing that such a function pays a real cost and shouldn't sit in your single hottest inner loop if you can help it.

## 5. Inline caches aren't just for property loads

The same caching strategy applies to many other operations, not only reads. A property *store* like `obj.x = v` caches the shape and offset too, and may also record the shape *transition* that the assignment triggers (since adding a new property changes the hidden class, per `05-hidden-class-and-shapes.md`). A method call like `obj.foo()` caches the resolved target and shape, which is what enables fast dispatch and, importantly, inlining. Element access like `arr[i]` caches the array's elements kind (see `08-array-optimization.md`). And the same type-feedback idea underlies prototype lookups, `instanceof` checks, comparisons, and arithmetic. Everywhere the engine has to make a runtime decision based on types or shapes, there's usually a feedback-driven cache making the common case fast.

## 6. Why it matters and what to do about it

Inline caches are genuinely the bridge between dynamic JavaScript and fast machine code — a monomorphic site is what lets TurboFan compile a property access down to a single offset read with one guard. Performance degrades gradually as a site goes polymorphic, and mostly collapses at megamorphic. Since the IC state is driven entirely by the *shapes* of the objects that flow through, keeping shapes stable (the whole point of chapter `05`) is what keeps ICs monomorphic.

In practice this means making the objects you pass to a given hot function shape-consistent: same fields, added in the same order. It means not funneling wildly different shapes through one hot generic function in a tight loop — and accepting the megamorphic cost when you genuinely must. It means not conditionally adding fields that cause instances used at the same site to diverge in shape. And for arrays, it means keeping a consistent elements kind so that element-access ICs stay fast.

## 7. Inspecting ICs

```bash
node --trace-ic script.js
```

This logs IC transitions, which are verbose but revealing — you'll see sites move from monomorphic to polymorphic to megamorphic, tagged with the function and location. Pairing it with `--print-bytecode --print-bytecode-filter=getX` lets you line up a bytecode offset with the source line, so you can tell exactly which access went megamorphic. The VS Code "Deopt Explorer" extension visualizes this data if you'd rather not read raw logs.

## 8. Common misconceptions

The most common one is thinking the IC caches the *value* of `x`. It doesn't — it caches *where to find* `x` (the Map plus offset), so the value can change freely between calls while the cache stays valid. Another is assuming any two objects with the same JSON-looking shape will share an IC; they only share if they share a hidden class, which (per the previous chapter) depends on construction order. And it's worth repeating that megamorphic isn't inherently a bug — for cold or genuinely generic code it's perfectly acceptable; it only hurts when it lands in your innermost hot loop.

## 9. Key takeaways

An inline cache records, at each property-access or call site, the result of the lookup as a mapping from hidden class to location or target. Sites progress through states — **monomorphic** (best) to **polymorphic** to **megamorphic** (worst) — based on how many distinct shapes they observe, and this state feeds directly into TurboFan's speculative specialization and inlining. The practical upshot is that stable object shapes keep ICs monomorphic and your code fast, and that the fix for a slow megamorphic site is shape discipline upstream, not more conditional logic at the site itself.
