# Object Optimization

> How V8 physically stores an object's properties, what keeps an object on the fast path, and what quietly drops it onto the slow one.

## 1. Two ways to store properties

Every object in V8 stores its named properties in one of two modes, and which mode it's in makes a large difference to how fast property access is.

The default and desirable mode is **fast properties**, sometimes called in-object or fast mode. Here the object's properties live at fixed offsets described by its hidden class (chapter `05`), so reading a property is a direct memory access at a known location. This is the path that inline caches and the JIT can optimize.

The fallback is **dictionary mode**, also called slow properties. Here the properties live in an actual hash table attached to the object. This mode exists for objects whose structure is too dynamic to describe with a stable hidden class. Access is slower because it involves hashing and probing, and — importantly — inline caches don't apply, because there's no stable shape to cache against. Once an object goes slow, it usually stays slow, so the whole game on hot paths is to keep objects in fast mode.

## 2. Where fast-mode properties actually live

For a fast-mode object, V8 doesn't put every property in the same place. It reserves a number of slots *directly inside the object* — these are the **in-object properties**, and they're the fastest to access because they require no extra indirection. If an object ends up with more properties than the reserved in-object slots, the overflow goes into a separate **properties backing store** (an array hanging off the object). Properties there are still fast — they're still at known offsets — but reaching them costs one extra pointer hop. Separately, an object's indexed/array-like elements live in yet another store, the **elements backing store** (covered in `08-array-optimization.md`).

```
A fast-mode object:
  ├── Map pointer        → its hidden class (shapes, offsets)
  ├── in-object slot 0   → e.g. the value of `x`
  ├── in-object slot 1   → e.g. the value of `y`
  ├── properties pointer → [ overflow named properties, if any ]
  └── elements pointer   → [ indexed elements, if any ]
```

How many in-object slots get reserved depends on how the object was first constructed, which is one more reason that constructing objects consistently — ideally through a constructor that sets a known set of fields — leads to efficient layouts.

## 3. What pushes an object into dictionary mode

A few specific behaviors are the usual culprits. **Deleting** properties with `delete obj.x` is the most reliable way to trigger the switch, because it punches a hole in the otherwise orderly offset layout. Adding a **very large number** of properties can do it. So can **highly dynamic, unpredictable** property structures that differ from instance to instance. And the big one in practice: using a plain object as an **ad-hoc map** with arbitrary, externally-determined string keys.

```js
const cache = {};
for (const key of userProvidedKeys) {
  cache[key] = computeValue(key);   // arbitrary keys → trends toward dictionary mode
}
```

Because the transition to dictionary mode is essentially one-directional in effect, the guidance is to avoid these patterns specifically on the objects that show up in your hot paths.

## 4. The rules for keeping objects fast

The advice is short and follows directly from how hidden classes and storage modes work.

Initialize all of an object's properties in the constructor, in the same order, every single time. Don't add properties conditionally or after construction if you can avoid it, because that fragments your instances across multiple shapes (and possibly toward dictionary mode). Avoid `delete` — assign `null` or `undefined` instead, or design the data so you never need to remove a key. Keep each property's *type* stable, meaning don't store a number in a field on one instance and a string in the same field on another, because that undermines the type feedback the JIT relies on. And don't press plain objects into service as dynamic dictionaries; that's what `Map` is for.

```js
// Good: a stable shape, fast properties throughout.
class User {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.active = true;   // declare it even if it's usually the same default
  }
}

// Risky: shape diverges across instances and may go slow.
const u = {};
if (cond) u.name = "a";   // conditional property
u.id = 1;                 // assignment order varies relative to other objects
delete u.name;            // forces dictionary mode
```

## 5. When to reach for `Map` instead of an object

The decision between a plain object and a `Map` comes down to whether your keys are known and fixed, or dynamic and arbitrary. When you're modeling a record with a known set of fields — a user, a point, a configuration — a plain object or class instance is exactly right, and it'll sit happily in fast mode. But when your keys are dynamic, numerous, or come from outside your code (caches, lookup tables, anything keyed by user input or IDs), a real `Map` is the better tool. `Map` is built for frequent insertion and deletion of arbitrary keys, it accepts keys of any type rather than coercing everything to strings, and it sidesteps the prototype-pollution and key-collision hazards that plague objects-as-maps (think of the trouble a key named `__proto__` can cause). The short version: objects for fixed-shape records, `Map` for dynamic key/value collections.

## 6. Prototypes and methods

Property lookups don't stop at the object itself — if a property isn't found, the search walks up the prototype chain, and each prototype object has its own hidden class too. So the same stability advice extends to prototypes. Don't mutate an object's prototype after the object has been created; `obj.__proto__ = ...` and `Object.setPrototypeOf` are slow and they invalidate assumptions the engine had made, often triggering deoptimization (see `09-deoptimization.md`).

There's also a memory-and-speed reason to define methods on the prototype (or in a class body) rather than as per-instance closures. A method defined on the prototype is created once and shared by every instance. A method assigned as a closure in the constructor creates a brand-new function object for every single instance, which costs memory and gives up the sharing. Unless you specifically need a per-instance bound function, prefer the prototype.

```js
class Service {
  handle() { /* shared by all instances — defined once */ }
}

class Wasteful {
  constructor() {
    this.handle = () => { /* a new closure allocated per instance */ };
  }
}
```

## 7. Frozen and sealed objects

`Object.freeze` and `Object.seal` lock down an object's shape — freeze prevents any changes to properties, seal prevents adding or removing them. Beyond their semantic value for modeling immutable data, these can enable additional engine optimizations, because once the engine knows the properties can't change, it can reason more aggressively about them. Use them where they fit your data model (immutable configuration is a good candidate) rather than sprinkling them everywhere as a reflexive micro-optimization.

## 8. The memory angle

It's worth remembering that hidden classes themselves cost memory. Each distinct shape needs a Map, so a program that creates millions of differently-shaped objects bloats the space V8 uses for Maps — another argument for shape consistency. In-object properties save an allocation compared to the overflow backing store. And shared prototype methods, as just discussed, avoid duplicating function objects across instances. None of these are reasons to obsess prematurely, but they explain why "lots of unique shapes" and "a closure per instance" can quietly add up.

## 9. Try it yourself

```js
// node --allow-natives-syntax
const fast = { x: 1, y: 2 };
const slow = { x: 1, y: 2 };
delete slow.x;
%DebugPrint(fast);   // fast properties
%DebugPrint(slow);   // note the shift toward dictionary/slow properties after delete
```

## 10. Key takeaways

Objects are fastest in **fast-property mode**, where their properties sit at fixed offsets described by a stable hidden class, split between quick in-object slots and an overflow backing store. The behaviors that push objects into slow **dictionary mode** — `delete`, conditional or late properties, and using objects as arbitrary-key dictionaries — should be kept away from hot data. Initialize a complete, consistently ordered shape in the constructor, avoid mutating prototypes, define methods on the prototype rather than per instance, and reach for `Map` when you genuinely need dynamic keys.
