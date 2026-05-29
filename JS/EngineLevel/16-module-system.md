# Module System

> How JavaScript code gets split across files, linked together, and loaded — and why ES Modules behave differently from the older CommonJS in ways that actually matter.

## 1. Why modules exist

Before modules, JavaScript had no built-in way to split code across files with any kind of isolation. Everything a script declared at the top level became global, so two files could clobber each other's variables, and the order in which you included `<script>` tags became load-bearing and fragile. Modules fix this by giving each file three things: **encapsulation** (a private top-level scope, so your variables don't leak), **explicit dependencies** (you declare what you import and export instead of relying on global side effects), and **reusability** (a module is a self-contained unit you can pull in wherever you need it). Because the language originally lacked this, the community invented a series of patterns and formats to fill the gap, and understanding that history explains why there are several module systems in the wild today.

## 2. A brief history of formats

The earliest approach was just IIFEs and global namespaces — wrap your code in a function to avoid polluting globals, and hang your public API off a single global object. Then came **CommonJS (CJS)**, Node's original system built around `require()` and `module.exports`; it's synchronous and dynamic, which suited the server where files are read from a local disk. **AMD** (with `define`) was the browser-focused, asynchronous answer of the RequireJS era. **UMD** was a wrapper pattern that let a library work as CJS, AMD, or a global all at once. And finally **ES Modules (ESM)** arrived as the actual language standard, with `import`/`export` built into JavaScript itself — static, analysis-friendly, and working in both browsers and Node.

## 3. ES Modules: syntax and the rules that follow from it

```js
// math.js
export function add(a, b) { return a + b; }
export const PI = 3.14159;
export default function multiply(a, b) { return a * b; }

// main.js
import multiply, { add, PI } from "./math.js";
import * as math from "./math.js";
```

What makes ESM more than just new syntax is a set of semantic properties. ESM has a **static structure**: imports and exports are determined at parse time, must appear at the top level, and can't be hidden inside conditionals. That static-ness is what enables tooling to do **static analysis** and **tree shaking** (eliminating exports that are never imported), and to catch certain errors before any code runs. Modules are always in **strict mode**, and the top-level `this` is `undefined` rather than the global object. Each module has its own **module scope**, so top-level declarations are local to the file, not global. A module is a **singleton**: it's evaluated exactly once, and every subsequent import gets the same cached instance.

Two properties deserve special attention. ESM imports are **live bindings**, not value copies — an import is a read-only *view* of the exporter's variable, so if the exporter later changes an exported `let`, importers see the new value. And ESM permits **top-level `await`**, letting a module pause its evaluation to wait for something asynchronous.

The live-binding behavior is worth seeing directly, because it's a real difference from CommonJS:

```js
// counter.js
export let count = 0;
export function increment() { count++; }

// main.js
import { count, increment } from "./counter.js";
console.log(count);   // 0
increment();
console.log(count);   // 1 — the import reflects the exporter's current value
```

CommonJS would have copied the primitive value at the moment of `require`, so the importer would still see `0`. ESM gives you a live window into the exporter's binding instead.

## 4. The three phases of loading

The specification defines module loading in three distinct phases, and the separation between them is what makes live bindings and circular dependencies behave predictably.

```
1. Construction / Parsing
   Fetch each module's source, parse it into a Module Record, discover its
   imports, and recursively fetch dependencies — building the MODULE GRAPH.

2. Instantiation / Linking
   Allocate memory for all the exports, and wire up each import to point at
   the right export slot (this is what makes bindings "live").
   No module code has actually run yet.

3. Evaluation
   Run each module body exactly once, in dependency order, filling in the values.
```

The thing to notice is that **linking happens before evaluation**. The engine connects every import to the exact variable it refers to *before* any code runs, which is precisely why an import can be a live view of the exporter's binding — the connection exists independently of whether the value has been computed yet.

## 5. Circular dependencies

Because linking precedes evaluation, circular imports don't crash the way you might fear, but they can still surprise you. The modules get linked into the graph fine; the danger is if you *use* an imported value before the module that exports it has run the line that defines it.

```js
// a.js
import { b } from "./b.js";
export const a = 1;

// b.js
import { a } from "./a.js";
export const b = a + 1;   // if a.js hasn't evaluated `a` yet, this sees undefined / TDZ
```

ESM handles cycles in a defined, predictable way — far better than CommonJS, which can hand you a half-built `module.exports` — but cycles are still a code smell, and the cleanest fix is usually to restructure so the cycle disappears.

## 6. Static versus dynamic import

```js
import { x } from "./a.js";          // static: hoisted, analyzed at parse time

const mod = await import("./a.js");  // dynamic: runs at runtime, returns a Promise
```

Static `import` is resolved as part of building the module graph. Dynamic `import()` is a runtime operation that returns a promise resolving to the module, which unlocks two big capabilities: **code splitting and lazy loading** (you only fetch a chunk when it's actually needed), and conditional loading (importing different modules based on runtime decisions). Route-based code splitting in modern frameworks is built directly on dynamic `import()`.

## 7. CommonJS versus ESM, the differences that bite

The two systems differ in ways beyond syntax. CommonJS uses `require`/`module.exports` and loads synchronously and dynamically; ESM uses `import`/`export` over a static, asynchronously-loaded graph. CommonJS exports are **value copies** (for primitives), while ESM exports are **live, read-only bindings**. Top-level `this` is `module.exports` in CommonJS but `undefined` in ESM. Tree shaking is hard with CommonJS's dynamic nature but easy with ESM's static structure. Top-level `await` is unavailable in CommonJS but allowed in ESM. And in Node, the file extension or `package.json` `"type"` field signals which system a file uses (`.cjs` or `"type":"commonjs"` versus `.mjs` or `"type":"module"`). Interop exists in both directions — ESM can `import` CommonJS, and CommonJS can `await import()` ESM — but it has rough edges around named exports from CommonJS and the absence of `__dirname` in ESM.

## 8. Browsers and bundlers

Browsers support ESM natively through `<script type="module">`, which is deferred by default and subject to CORS rules for cross-origin modules. Yet bundlers like Vite, esbuild, Rollup, and webpack remain important in production, because they bundle many small files together (reducing network and HTTP overhead), perform tree shaking, transpile newer syntax, handle assets, and implement code splitting. The modern pattern that many dev servers (Vite especially) use is to serve native ESM during development for fast hot module replacement, while bundling for production. **Import maps** are a newer browser feature that lets you resolve bare specifiers like `import x from "lodash"` to actual URLs without a bundler doing the rewriting.

## 9. Who does what

It's worth being clear about the division of labor, because it mirrors the engine-versus-host theme from chapter `15`. The engine (V8) implements the Module Record machinery — parsing, linking, and evaluation per the spec — along with dynamic `import()` and `import.meta`. But the **host** (browser or Node) supplies **module resolution**, meaning the rules for how a specifier like `"./math.js"` or `"lodash"` maps to an actual file or URL, and it does the **fetching**. This is why resolution rules differ between browsers and Node even though the linking and evaluation semantics are standardized and identical.

## 10. Key takeaways

**ESM** is the language standard: static `import`/`export`, **live bindings**, single evaluation, and tree-shakeable structure. Loading proceeds through **construction → instantiation/linking → evaluation** over a module graph, and the fact that linking happens before evaluation is what makes live bindings and well-defined circular-dependency behavior possible. **Dynamic `import()`** enables lazy loading and code splitting. **CommonJS**, Node's legacy system, is synchronous and copies values, differing from ESM in bindings, timing, and analyzability. And the engine handles linking and evaluation while the **host** handles specifier resolution and fetching.
