# Array Optimization

> How V8 represents arrays through "elements kinds," why packed integer arrays are the fastest thing going, and how a single careless line can permanently slow an array down.

**Prerequisites:** `01-js-value-representation` (Smi and unboxed doubles), `05-hidden-class-and-shapes` (elements store is separate from properties).  
**After this chapter you will understand:** (1) the elements kinds lattice and why transitions are one-way, (2) the specific operations that make an array holey or generic, (3) when TypedArrays are the right tool instead of regular arrays.

## 1. Arrays are objects, but their indices are special

A JavaScript array is, technically, an object — but its indexed elements (`arr[0]`, `arr[1]`, …) are not stored as ordinary named properties. They live in a dedicated **elements backing store**, separate from any named properties the array might also have. This separation lets V8 treat the indexed part with specialized, compact representations rather than the general property machinery. And to choose the best representation, V8 tracks the *kind* of elements an array currently holds.

## 2. Elements kinds form a one-way ladder

V8 tags each array with an **elements kind** that captures two things: how dense the array is, and what type of values it stores. These kinds form a lattice that an array can only ever move *down* — toward more general, slower representations — never back up.

```
PACKED_SMI_ELEMENTS        [1, 2, 3]            small integers, no gaps
        ↓
PACKED_DOUBLE_ELEMENTS     [1.1, 2.5]           doubles, no gaps
        ↓
PACKED_ELEMENTS            [1, 'a', {}]         any values, no gaps
        ↓   (a hole appears)
HOLEY_SMI_ELEMENTS         [1, , 3]
HOLEY_DOUBLE_ELEMENTS
HOLEY_ELEMENTS                                  the most general fast kind
        ↓   (too sparse / huge indices)
DICTIONARY_ELEMENTS                             a hash table — slow
```

There are really two independent axes at work here. One is **packed versus holey**: an array is packed if every index from `0` to `length - 1` actually holds a value, and holey if there are gaps. The other is the **value type**: smis (small integers), doubles, or fully general tagged values. More specific kinds are both faster and more memory-compact, and the critical rule is that transitions are *one-way*. Once an array becomes holey, or once it generalizes from integers to mixed values, it does not revert — even if you later remove the offending element. This is why a single operation can have lasting consequences.

## 3. Why packed integers are the fastest

The representations differ dramatically in how much work a read involves. `PACKED_SMI_ELEMENTS` is essentially a plain C array of small integers: there's no boxing, and because it's packed, there's no need to check for holes. `PACKED_DOUBLE_ELEMENTS` is a flat array of raw 64-bit doubles, stored unboxed — no per-element HeapNumber object, just the bits (this is the "double unboxing" mentioned in `01-js-value-representation.md`). `PACKED_ELEMENTS` stores general tagged values, which is flexible but means values may be boxed pointers.

The **holey** kinds add a cost on every read that's easy to underestimate: when you read `arr[5]` from a holey array, the engine has to check whether index 5 is an actual value or a hole. A hole reads as `undefined`, but producing that `undefined` correctly may require consulting the prototype chain (because someone could have defined `5` on `Array.prototype`). That per-access hole check is exactly the kind of thing that prevents the tight, branch-free loops the JIT loves. So "holey" isn't a minor label — it changes the code the engine can generate for every element access.

## 4. What creates holes (and you should avoid)

Holes appear whenever you leave a gap in the index sequence, and there are several common ways to do it, sometimes without realizing:

```js
const a = [1, 2, 3];   // PACKED_SMI
a[10] = 4;             // indices 3..9 are now holes → HOLEY_SMI

const b = new Array(100);   // a hundred holes from the very start

const c = [];
c[0] = 1;
c[2] = 3;              // skipped index 1 → HOLEY

delete a[0];           // punches a hole → HOLEY
a.length = 100;        // extends the array with holes
```

Every one of these transitions the array into a holey kind (and possibly a more general one), and it stays there. The `new Array(n)` case is a particularly common trap: people preallocate an array intending to fill it, but it begins life fully holey, and if you then fill it out of order or partially, it remains holey.

## 5. What generalizes the value type

Separately from holes, mixing value types pushes the array down the type axis:

```js
const a = [1, 2, 3];   // PACKED_SMI
a.push(1.5);           // now contains a double → PACKED_DOUBLE (still packed, still fast)
a.push('x');           // now contains a string → PACKED_ELEMENTS (general, boxed)
```

The move from integers to doubles is often unavoidable and not catastrophic, since `PACKED_DOUBLE` is still a fast, unboxed representation. The move to fully general `PACKED_ELEMENTS` is the bigger drop, because now elements are tagged values that may require boxing. The practical guidance is to keep numeric arrays numeric — don't stash strings or objects in an array you're treating as a hot numeric buffer.

## 6. The rules for fast arrays

Pulling this together into habits: prefer array literals with the actual values when you can, like `[1, 2, 3]`, so the array starts in the most specific kind. Build arrays contiguously by pushing in order rather than assigning to far-flung indices. Be wary of `new Array(n)` for preallocation if you're going to fill it index-by-index out of order — it starts holey, and you only stay fast if you fill `0` through `n-1` completely. Don't `delete` elements; use `splice`, or store a sentinel value, depending on what you actually need. Keep element types homogeneous in hot numeric arrays — all integers, or all doubles. And don't write loops that read past `length` or that rely on holes returning `undefined`, because those patterns force the slow holey paths.

## 7. TypedArrays for serious numeric work

When you're doing heavy numeric or binary work, regular arrays — even packed ones — aren't the ideal tool, and **TypedArrays** are. A `Float64Array`, `Int32Array`, `Uint8Array`, and friends have a fixed element type, contiguous storage, and crucially *no* boxing, *no* holes, and *no* elements-kind transitions to worry about. They're backed by an `ArrayBuffer`, which makes them perfect for math-heavy code, graphics, audio, and interop with WebAssembly (see `18-webassembly-integration.md`). Their memory layout and performance are predictable in a way that ordinary arrays, with their lurking risk of going holey or generic, simply can't match.

```js
const v = new Float64Array(1000);   // a flat block of unboxed doubles, fixed forever
```

## 8. Iteration

A plain indexed `for` loop over a packed array is the most optimizable iteration pattern there is, because the engine can prove so much about it. `for...of`, `forEach`, and `map` are usually optimized well too, but they're more sensitive to the array being holey and to callbacks that introduce unstable types. Sparse arrays defeat fast iteration almost entirely, since every step has to deal with the possibility of holes. The summary is that the iteration construct matters less than keeping the array itself packed and homogeneous.

## 9. Inspecting elements kinds

```bash
node --allow-natives-syntax
node --trace-elements-transitions script.js
```

```js
const arr = [1, 2, 3];
%DebugPrint(arr);    // shows PACKED_SMI_ELEMENTS
arr.push(1.5);
%DebugPrint(arr);    // now shows PACKED_DOUBLE_ELEMENTS
```

`--trace-elements-transitions` is especially useful because it logs the exact moment an array changes kind, so you can catch the line in your code that turned a fast array holey or generic.

## 10. A couple of misconceptions

Empty slots are not free placeholders — they create the HOLEY kind, which slows down every read of that array, so `arr[1000] = x` on a short array is more expensive than it looks. And setting `length = 0` does not "reset" an array back to a pristine packed-integer kind; the elements kind doesn't revert. Finally, TypedArrays aren't automatically faster for tiny arrays — for a handful of elements an ordinary `Array` can be perfectly fine, so reserve TypedArrays for genuinely large or performance-critical numeric data, and measure.

## 11. Check your understanding

1. `const a = [1, 2, 3]; a.push(1.5);` — what elements kind transition occurs? Is the resulting array still considered "fast"?
2. `const b = new Array(1000); b[0] = 1; b[999] = 2;` — what elements kind does `b` have, and why does this matter for iteration performance?
3. You are writing a function that applies a matrix multiplication over 1,000,000 `float64` values in a tight loop. Should you use `Array` or `Float64Array`? What are the concrete advantages of `Float64Array` in this scenario?

## 12. Key takeaways

Arrays carry an **elements kind** describing both their density (packed versus holey) and their value type (smi, double, or general), and packed integer or double arrays are dramatically faster than holey or generic ones. The transitions between kinds are **one-way** toward slower representations, so a single hole or type mix can permanently degrade an array. The common footguns are sparse indices, `delete`, `new Array(n)`, extending `length`, and mixing types. For heavy numeric data, skip the risk entirely and use a **TypedArray**.
