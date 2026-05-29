# Hidden Class & Shapes

> How V8 gives dynamic, dictionary-like objects the same fast, struct-style property access you'd expect from a statically typed language.

## 1. The problem hidden classes solve

In a statically typed language like C++ or Java, a field access such as `point.x` compiles down to "read the memory at a fixed offset from `point`." The compiler knows the exact layout of a `Point` ahead of time, so `x` always lives at, say, byte offset 8, and the access is a single machine instruction.

JavaScript objects don't work that way, at least not on the surface. They are dynamic: you can add or remove properties at any time, any object can have any set of keys, and two objects that look similar might have been built completely differently. The naive way to implement this is to make every object a hash table mapping property names to values, and to do a hash lookup on every single property access. That works, but it's slow — hash lookups have a real constant-factor cost and they're unfriendly to the CPU cache, and property access is one of the most common operations in all of JavaScript.

V8's answer is the **hidden class**, internally called a **Map** (not to be confused with the `Map` collection you use in code). Other engines use the same idea under different names — SpiderMonkey calls them **Shapes**, JavaScriptCore calls them **Structures**. The core insight is this: even though objects *can* be arbitrary, in real programs huge numbers of objects share the same structure. Every `Point` you create has an `x` and a `y` in the same order. So V8 groups objects by their structure: all objects with the same properties added in the same order share one hidden class, and that hidden class records the fixed offset of each property. Property access then becomes "check the object's hidden class, then read at the known offset" — nearly as fast as the static-language case.

## 2. What a hidden class actually stores

A crucial point that trips people up: the hidden class describes the object's **shape**, not its **values**. The values live in the object itself; the shared hidden class is just metadata.

Specifically, a Map records which properties exist, the order in which they were added, the offset (the in-object slot index) where each property's value is stored, and each property's attributes (writable, enumerable, configurable). It also records what kind of storage the object uses (fast in-object properties versus slow dictionary mode), and it holds pointers used for **transitions**, which we'll get to next. Because all of this is about structure rather than data, thousands of objects of the same shape can share a single Map, and each object only has to store its own values plus a pointer to that shared Map.

## 3. Transitions: how shapes evolve

Objects aren't usually born with all their properties; they accumulate them. V8 models this with a **transition tree** of hidden classes. Each time you add a property, the object moves from its current hidden class to a new one that includes the additional property.

```js
const p = {};   // hidden class C0: the empty shape
p.x = 1;        // transition C0 → C1, where C1 means "has x at offset 0"
p.y = 2;        // transition C1 → C2, where C2 means "has x@0, y@1"
```

The beautiful part is that this chain is reused. When you build another object the same way, it walks the exact same transitions:

```js
const q = {};
q.x = 5;        // reuses the C0 → C1 transition
q.y = 6;        // reuses the C1 → C2 transition
```

After this, `p` and `q` point to the *same* hidden class C2. That shared identity is precisely what makes optimization possible: a function that reads `.x` and `.y` can be specialized once for shape C2 and then run fast for every object of that shape. This is the foundation that inline caches build on (see `06-inline-cache.md`).

## 4. Why property order matters so much

Here is the detail that surprises almost everyone the first time. Because hidden classes are built up through ordered transitions, adding the same properties in a *different order* produces *different* hidden classes:

```js
const a = {};
a.x = 1;
a.y = 2;        // shape: x at offset 0, y at offset 1

const b = {};
b.y = 2;
b.x = 1;        // shape: y at offset 0, x at offset 1 — a DIFFERENT hidden class
```

Even though `a` and `b` end up with the same keys and even the same values, they do *not* share a hidden class, because the transition paths differ. A function that reads from both of them now sees two different shapes at the same property-access site, which makes that site **polymorphic** instead of the ideal **monomorphic**. Multiply this across a codebase that constructs similar objects inconsistently, and you get a slow, hard-to-diagnose drag on performance. The fix is simply to be consistent about the order in which you assign properties.

## 5. The practical pattern

The advice that flows from all this is concrete. Initialize all of an object's properties in one place, in the same order, every time — a constructor is the natural home for this:

```js
class Point {
  constructor(x, y) {
    this.x = x;   // always assigned first
    this.y = y;   // always assigned second
  }
}
```

Every `Point` then shares one hidden class, and any code touching `point.x` stays monomorphic. The patterns to avoid are the mirror image of this: don't add properties conditionally or late, because that splits your instances across multiple shapes; and avoid `delete`, because removing a property can force the object out of fast mode entirely. If you need to "clear" a property, assigning `null` or `undefined` keeps the shape intact, whereas `delete` does not.

```js
const u = {};
if (cond) u.name = "a";   // some instances get `name`, some don't → divergent shapes
u.id = 1;                 // and `id` lands at a different offset depending on the branch
delete u.name;            // worst of all — can drop the object into dictionary mode
```

## 6. Dictionary mode: when V8 gives up on shapes

If an object's structure becomes too unpredictable — many properties being added and removed, very large numbers of properties, sparse and chaotic usage — V8 concludes that maintaining a hidden class is no longer worth it and switches the object into **dictionary mode**. In this mode the object's properties really do live in a hash table, access is genuinely slower, and inline caches stop applying to it because there's no stable shape to cache against. This isn't a bug; it's the engine protecting memory and sanity when an object is being used in a fundamentally dynamic way. The lesson is just to keep your *hot* objects out of dictionary mode by treating them as stable records, and to use a real `Map` when you actually need dynamic, arbitrary keys (see `07-object-optimization.md`).

## 7. How this connects to everything else

Hidden classes are the linchpin that several other chapters depend on. Inline caches (`06`) work by keying off the hidden class to cache where a property lives. Object optimization (`07`) is largely the art of keeping objects on stable, fast hidden classes. And TurboFan (`04`) specializes property access based on the shapes it sees in the feedback — which only stays clean if your shapes stay consistent. So while "hidden class" sounds like deep internals trivia, it's actually the concept that most directly connects how you write object-manipulating code to how fast that code runs.

## 8. Try it yourself

```bash
node --allow-natives-syntax
```

```js
const a = { x: 1, y: 2 };
const b = { y: 2, x: 1 };
%DebugPrint(a);
%DebugPrint(b);
```

Compare the `map` (hidden class) addresses printed for `a` and `b`. Despite having identical keys and values, they have different Maps because the properties were declared in a different order — the order lesson from section 4 made visible.

## 9. A few misconceptions

People often assume that two objects with the same keys automatically share a hidden class. They don't, unless they were built along the same transition path — order and construction history are what count. It's also a myth that you need `class` syntax to get shapes; a plain object literal or consistent field-by-field construction produces stable shapes just fine. And the idea that you can freely `delete` and re-add properties without consequence is wrong: `delete` is one of the most reliable ways to push a hot object into slow dictionary mode.

## 10. Key takeaways

Objects that have the same properties added in the same order share a **hidden class** (V8 calls it a Map; other engines call it a Shape or Structure), and that hidden class records each property's fixed offset, turning dynamic property access into something close to a static struct read. Shapes evolve through a reusable tree of **transitions**, and because those transitions are ordered, **property order and consistency** determine whether your code stays monomorphic. `delete` and overly dynamic structures can drop objects into slow **dictionary mode**. The single most useful habit is to initialize a complete, consistently ordered set of fields up front — usually in a constructor — so all your instances of a given "type" share one shape.
