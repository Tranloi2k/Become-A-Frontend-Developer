# JS Value Representation

> How a JavaScript engine (primarily V8) stores values in memory, and why that single design decision ripples through everything else.

**Prerequisites:** None — start here.  
**After this chapter you will understand:** (1) why every JS value is stored as a single tagged machine word, (2) when a number requires a heap allocation versus staying in a register, (3) how V8 avoids copying strings on every concatenation.

## 1. The core problem

JavaScript is dynamically typed. A single variable can hold a number on one line, a string on the next, and an object after that. There are no type declarations telling the engine "this slot is always a 32-bit integer." Yet the engine still has to give every variable a home in memory — a slot of some fixed size — because it cannot resize storage on every assignment.

This creates a genuine tension. If the engine reserved a full object on the heap for *every* value, then even `let x = 1` would mean a heap allocation, and `x + 1` would mean chasing a pointer, reading memory, computing, and allocating again. That would be unbearably slow and would flood the garbage collector with tiny short-lived objects.

The solution that essentially all modern engines converge on is a **tagged representation**: every JavaScript value is squeezed into one machine word (64 bits on a 64-bit CPU), and a few bits of that word act as a **tag** telling the engine how to interpret the rest. A value is either a small immediate (stored directly, no heap involved) or a pointer to something larger living on the heap. Understanding this one idea is what makes concepts like "Smi vs HeapNumber" or "why mixing types hurts the JIT" finally click.

## 2. Tagged values in V8

On a 64-bit system, V8 stores a JavaScript value in a single machine word and uses the **lowest bit** as the primary tag.

If that bit is `0`, the word is a **Smi** — a "Small Integer." The actual integer is stored right there in the upper bits of the word. Nothing lives on the heap; the value *is* the bits. Because one bit is stolen for the tag, the usable range is a 31-bit signed integer, roughly from `-2^30` to `2^30 - 1` (about ±1 billion). Inside that range, integer arithmetic is essentially free: no allocation, no pointer dereference, just register math.

If the lowest bit is `1`, the word is a **pointer to a HeapObject**. Everything that is not a small integer — strings, objects, arrays, doubles that don't fit in a Smi, and so on — lives on the heap, and the value word just points at it.

Visually:

```
Smi:         [ ........ 31-bit signed integer ........ ][ 0 ]
HeapObject:  [ ............. heap address ............ ][ 1 ]
```

The reason this works so well is that the two most common things a JS program does — small-integer arithmetic and passing around references to objects — both get the fast path. Loop counters, array indices, lengths, and the like all stay as Smis and never touch the heap.

### Pointer compression

Modern V8 adds an extra trick called **pointer compression**. On a 64-bit build, full 64-bit pointers waste a lot of memory in pointer-heavy programs (which most JS programs are). So V8 stores heap pointers as 32-bit *offsets* from a fixed base address (the "cage"), reconstructing the full pointer when needed. You still think of "one value = one word," but the memory footprint for all those references roughly halves. The exact mechanics differ across V8 versions, but the mental model — "Smi inline, everything else is a (possibly compressed) pointer" — stays accurate.

## 3. Numbers in depth

This is where the tagged design has the most visible performance consequences, so it's worth slowing down.

When you write `let n = 42`, the literal fits comfortably in Smi range. The engine never allocates anything: `n` holds the tagged bits directly, and an operation like `n = n + 1` can happen entirely in CPU registers as long as the result stays in range.

When you write `let n = 0.5`, the value is *not* a small integer. It must be represented as an IEEE-754 double, and a raw double is 64 bits with no room left for a tag. So V8 boxes it: it allocates a **HeapNumber** object on the heap to hold the double, and `n` becomes a pointer to that HeapNumber. Now `n + 1` may involve loading the double out of the heap, doing floating-point math, and potentially allocating *another* HeapNumber to hold the result.

This is the deep reason that float-heavy hot loops can be slower than integer loops, and why a counter that accidentally drifts out of Smi range or into floating point can quietly start allocating. Consider:

```js
let sum = 0;
for (let i = 0; i < 1e6; i++) {
  sum += 0.1;   // sum is a double almost immediately → HeapNumber territory
}
```

Each iteration potentially produces a new boxed double. The engine is clever and uses techniques to avoid the worst of it, but the principle holds: staying in the integer/Smi world is cheaper than living in boxed doubles.

V8 also fights back against boxing with **double unboxing**. Inside arrays and inside object fields, when the engine is confident a slot always holds a double, it can store the raw 64-bit double directly in the backing store instead of a pointer to a HeapNumber. This is why an array of all-floating-point numbers (`PACKED_DOUBLE_ELEMENTS`, see `08-array-optimization.md`) is far more efficient than an array that mixes types and forces every element to be a tagged pointer. The catch is that unboxing only survives as long as the shape or elements kind stays stable; the moment a string sneaks into that numeric array, the engine has to fall back to boxed, tagged storage.

## 4. Oddballs

A handful of special singleton values — `undefined`, `null`, `true`, `false`, and an internal marker called `the_hole` — are represented as **Oddball** heap objects. They are created once per isolate and shared everywhere, so checking `x === undefined` is just a pointer comparison against the single canonical `undefined` object.

`the_hole` is worth knowing about even though you never see it directly: it is how V8 marks an "empty" array slot or an uninitialized `let` binding (the Temporal Dead Zone, see `10-execution-context.md`). It is deliberately distinct from `undefined` so the engine can tell "this slot was never filled" apart from "this slot explicitly contains `undefined`."

## 5. Strings

Strings are heap objects, and they are **immutable** — once created, their characters never change. Any operation that looks like it modifies a string actually produces a new string. To make this affordable, V8 uses several internal string layouts and picks whichever is cheapest for the situation.

The straightforward layout is a **SeqString**: a contiguous buffer of characters, stored either as one byte per character (Latin1, for strings that happen to be ASCII-ish) or two bytes per character (UTF-16) when needed. The one-byte path is a real optimization because so much real-world text is ASCII.

The interesting layouts exist to *avoid copying*. When you concatenate two strings with `a + b`, V8 often does not immediately build a new flat buffer. Instead it creates a **ConsString** — a small node that just holds pointers to `a` and `b` and remembers "I represent these two joined together." This makes `+` cheap even for large strings. The cost is deferred: the first time something needs the actual contiguous characters (for example, indexing into the string or hashing it), V8 **flattens** the ConsString into a SeqString, and *that* is where the copy happens.

```js
let s = "";
for (let i = 0; i < 1000; i++) s += "x";  // builds a tree of ConsStrings, cheaply
console.log(s.length);                      // may trigger one flatten here
```

There are two more layouts worth naming. A **SlicedString** represents a substring as an offset and length into a parent string, so `bigString.slice(10, 20)` doesn't copy 10 characters — it just points into the original. An **ExternalString** is used when the characters are owned by C++ code outside the V8 heap (for example, source text the embedder hands in). And a **ThinString** is a forwarding pointer used during string internalization (deduplication of identical strings).

The practical takeaway is gentle: for moderate string building, trust the engine — ConsStrings make `+` perfectly reasonable. Only for very large or pathological build-then-randomly-index patterns should you reach for an array plus `join`, and even then, measure first.

## 6. Symbols and BigInt

A **Symbol** is a heap object used primarily as a unique property key. Two symbols are never equal unless they are literally the same object, which is exactly why they're useful for collision-free keys.

A **BigInt** is also a heap object, storing a sign plus an array of digits, giving it arbitrary precision. Unlike regular numbers, a BigInt never silently collapses into a Smi or a double — it is its own type, with its own (heavier) arithmetic.

## 7. Objects (a preview)

A plain JavaScript object is a HeapObject that points to three important things: its **Map** (also called the hidden class — this describes the object's *shape*, including which properties exist and at what offset), its **in-object and overflow properties** (the actual named values), and its **elements** store (indexed/array-like values). The values live in the object; the shape description lives in the shared Map. This separation is the entire foundation of fast property access and is covered in `05-hidden-class-and-shapes.md` and `07-object-optimization.md`.

```js
const o = { x: 1 };
// `o` is a tagged pointer to a HeapObject whose Map says
// "objects of this shape store property x at in-object slot 0",
// and whose slot 0 contains the Smi 1.
```

## 8. How other engines solve the same problem

V8's Smi tagging is not the only approach. **JavaScriptCore** (Safari) uses **NaN-boxing**: it treats every value as a 64-bit IEEE-754 double, and exploits the fact that doubles have an enormous number of unused bit patterns that all mean "NaN." Those spare patterns are repurposed to encode pointers and integers, so a value is always a double *unless* its bits fall into the special ranges that mean "this is actually a pointer." **SpiderMonkey** (Firefox) has historically used tagged-union layouts in a similar spirit. The details differ, but the goal is identical: pack any possible JavaScript value into one small, uniform cell that the engine can move around cheaply.

You don't need to memorize each scheme. The point is that "one tagged word per value" is a near-universal idea, and the differences are implementation flavor.

## 9. Try it yourself

V8 exposes internal inspection helpers when you pass `--allow-natives-syntax`:

```bash
node --allow-natives-syntax
```

```js
%DebugPrint(42);        // shows it as a Smi
%DebugPrint(3.14);      // shows a HeapNumber
%DebugPrint("hello");   // shows the string layout (SeqOneByteString, etc.)
%DebugPrint({ a: 1 });  // shows the Map, properties, and elements
```

Reading the output trains your intuition: you'll literally see when something is a Smi versus a boxed HeapNumber, and you'll see the Map pointer that the next chapter is all about.

## 10. A few common misconceptions

It's often said that "primitives live on the stack." That's only partly true. A small integer can live inline in a register or stack slot as a Smi, but a fractional number is a HeapNumber on the heap; the variable on the stack merely holds a pointer to it. Likewise, "strings copy on every `+`" is wrong in the common case — a ConsString defers the copy, and flattening only happens when the flat characters are actually needed. Finally, TypeScript types have nothing to do with any of this: types are erased before the code runs, so the engine optimizes based on the *runtime* values it observes, not on annotations.

## 11. Check your understanding

1. Why can Smi arithmetic (e.g., adding two small integers) skip heap allocation entirely, while adding two floating-point numbers often cannot?
2. When V8 evaluates `let s = ""; for (...) s += "x"`, it does not copy characters on every `+`. What data structure defers the copy, and when does the actual copy occur?
3. A loop accumulates `sum += 0.1` a million times. Why does this create significantly more GC pressure than a loop that sums integers?

## 12. Key takeaways

Every JavaScript value is one tagged machine word: either an inline **Smi** or a (possibly compressed) **pointer** to a heap object. Small integers are effectively free because they require no allocation, while other numbers become boxed **HeapNumbers** on the heap, which is why staying in integer range matters in hot loops. Strings, objects, symbols, BigInts, and oddballs all live on the heap with specialized layouts designed to avoid unnecessary copying. And the reason this chapter comes first is that almost every later optimization — hidden classes, inline caches, the JIT's type specialization — is ultimately about *keeping a value in one consistent representation* so the engine can generate tight, predictable code.
