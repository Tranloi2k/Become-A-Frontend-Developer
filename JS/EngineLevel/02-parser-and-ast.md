# Parser & AST

> How raw source text becomes a structured tree the engine can execute — and why this stage quietly shapes your app's startup time.

**Prerequisites:** `01-js-value-representation` (understanding HeapObjects helps).  
**After this chapter you will understand:** (1) what the scanner and parser each do, (2) why V8 lazy-parses most functions to speed up startup, (3) how the parser builds scope information that enables closures.

## 1. From text to structure

When the engine receives your JavaScript, all it has is a flat sequence of characters — bytes, really. Before a single line can run, the engine must answer some questions: Is this valid JavaScript at all? Where does each function begin and end? Which variables are declared, and in which scopes? None of that is visible in raw text; it has to be *recovered* by analyzing the characters.

This recovery happens in two cooperating stages. First the **scanner** (also called the lexer or tokenizer) groups characters into **tokens** — the indivisible "words" of the language. Then the **parser** consumes those tokens and assembles them into an **Abstract Syntax Tree (AST)**, a tree that captures the grammatical structure of the program. Only once the AST exists can the bytecode generator (Ignition, see `03-bytecode-interpreter-ignition.md`) turn it into something executable.

```
your-file.js  →  Scanner  →  tokens  →  Parser  →  AST  →  (Ignition emits bytecode)
```

It helps to think of it like reading a sentence in a foreign language: the scanner identifies the individual words, and the parser figures out which word is the subject, which is the verb, and how clauses nest.

## 2. Scanning: characters into tokens

The scanner walks through the source and emits tokens such as keywords (`function`, `return`, `const`), identifiers (`x`, `myFunction`), literals (`42`, `"hello"`, `true`), and punctuation (`{`, `=>`, `;`, `(`). Along the way it discards whitespace and comments, because those don't affect meaning — with one important caveat about line breaks that we'll get to with semicolons.

This stage is deceptively tricky. The scanner has to handle the full range of Unicode, escape sequences like `\u{1F600}`, and genuinely ambiguous characters. The classic example is the slash: in `a / b` it's division, but in `/ab+c/` it's the start of a regular expression literal. The scanner cannot always decide this on its own; it sometimes needs hints from the parser's current state. Because scanning touches every single byte of your source, it's one of the most performance-sensitive parts of the whole pipeline, and engines optimize it heavily — including fast paths for one-byte (Latin1) source text.

## 3. Parsing: tokens into an AST

The parser takes the token stream and applies the rules of the ECMAScript grammar to build the tree. Each node in the tree represents one syntactic construct: a function declaration, an `if` statement, a binary expression, an identifier, and so on. Crucially, the AST encodes *structure*, not execution — it says "here is a function named `add` that returns the sum of `a` and `b`," but it doesn't run anything.

Take this small function:

```js
function add(a, b) {
  return a + b;
}
```

The parser produces a tree shaped like this:

```
Program
└── FunctionDeclaration  (name: "add")
    ├── params: [ Identifier "a", Identifier "b" ]
    └── BlockStatement
        └── ReturnStatement
            └── BinaryExpression  (operator: +)
                ├── left:  Identifier "a"
                └── right: Identifier "b"
```

JavaScript's grammar is not trivial to parse. It requires lookahead and disambiguation in several places — distinguishing an arrow function `(a, b) => a + b` from a parenthesized expression `(a, b)`, handling `async` as either a keyword or an identifier, and dealing with automatic semicolon insertion. The parser has to make these decisions while reading left to right.

It's worth knowing that ASTs are not unique to engines. Tools like Babel, ESLint, Prettier, and TypeScript all parse your code into ASTs and operate on them — Babel transforms the tree and prints new code, ESLint inspects it for rule violations, Prettier reprints it with consistent formatting. Many of these tools use parsers like Acorn or `@babel/parser` that follow the ESTree node format. V8's internal AST isn't byte-for-byte identical to ESTree, but the concept is the same.

## 4. Automatic Semicolon Insertion (ASI)

The grammar formally requires semicolons to terminate many statements, but JavaScript lets you omit a lot of them because the parser will *insert* semicolons in well-defined situations — usually where a line break makes continuing the statement impossible. This is convenient, but it occasionally bites:

```js
function broken() {
  return
    42;
}
```

You might expect this to return `42`, but it returns `undefined`. The parser sees `return` at the end of a line and inserts a semicolon right after it, because `return` followed by a newline is a complete statement. The `42;` on the next line becomes unreachable dead code. The same trap applies to `throw`, `break`, `continue`, and postfix `++`/`--`. The practical rule is simple: keep the value on the same line as `return`, and if you're returning an object literal, put the opening brace on that line too — `return { x: 1 };`.

## 5. Lazy parsing: why huge bundles still start quickly

Here is the single most important performance idea in this chapter. A real-world bundle might define thousands of functions, but only a handful actually run during startup. Fully parsing and compiling every function up front would waste enormous amounts of CPU and memory on code that may never execute.

V8 sidesteps this with a two-tier strategy. The first time it encounters a function, it does a **pre-parse**: a fast, shallow pass that checks the syntax is valid and records just enough metadata — where the function starts and ends, its parameters, and whether it references variables from enclosing scopes. It deliberately does *not* build a full AST or emit bytecode. Only when the function is actually called does V8 go back and do a **full parse**, building the complete AST and generating bytecode.

The payoff is dramatically faster startup and lower memory use, because most of your code only ever gets the cheap shallow treatment. The trade-off is that a function which *is* eventually called gets parsed twice — once shallowly, once fully. For the overwhelming majority of code this is a great deal.

There's an old optimization trick that exploits this. If you wrap a function in parentheses and call it immediately — the IIFE pattern `(function(){ ... })()` — you signal to V8 that this function runs right now, so it skips the lazy pre-parse and goes straight to a full parse, avoiding the double work. Tools like the historical "optimize-js" did this automatically. In modern apps it rarely matters compared to bundling and code caching, but it's a nice illustration of how parsing strategy interacts with how you write code.

## 6. Scope information is built here too

While parsing, the engine simultaneously builds a picture of your program's **scopes**: which variables are declared where, which ones are `var` versus `let`/`const`, and — critically — which inner functions *capture* variables from outer functions. That last point is the seed of closures (see `11-closures-and-scope-chain.md`): if the parser notices that an inner function references an outer variable, it marks that variable as captured so the engine knows it must outlive the outer function's call.

```js
function outer() {
  let x = 1;
  return function inner() {
    return x;   // parser flags `x` as captured by inner
  };
}
```

The parser also detects `eval` and `with`. These two constructs are poison for optimization because they can introduce or rename variables in ways the engine cannot determine statically. Once the parser sees `eval` or `with` in a scope, it can no longer be sure which variable any given name refers to, so it falls back to slower, fully dynamic variable resolution. This is a big reason both are discouraged.

## 7. Caching and streaming

Two more techniques reduce the cost of this stage in practice. **Code caching** lets V8 serialize the result of compilation (the bytecode) so that the next time the same script loads, parsing can be skipped entirely — browsers do this per-script across page loads, and Node uses similar mechanisms via the `vm` module and snapshots. **Streaming compilation** lets the browser begin parsing a script *while it is still downloading*, overlapping network time with parsing time so the script is ready sooner after the last byte arrives.

## 8. Why this matters for performance

The headline is that parsing and compiling are not free, and on large applications they can account for a meaningful chunk of cold-start time — sometimes hundreds of milliseconds before any of your logic runs. Smaller, simpler functions pre-parse and full-parse faster. Avoiding the eager parse of large bodies you don't need at startup helps. And keeping `eval` and `with` out of hot scopes keeps the door open for later optimizations. None of this means you should contort your code, but it explains why bundle size and code splitting (see `16-module-system.md`) affect not just download time but startup CPU as well.

## 9. Check your understanding

1. What is the difference between pre-parsing and full-parsing, and which functions get each treatment? Why is this a performance win?
2. Why does `return` followed by a newline return `undefined` instead of the value on the next line?
3. Why does the presence of `eval` inside a function scope disable optimizations for variables in that scope?

## 10. Key takeaways

The pipeline is scanner → tokens → parser → AST, and the AST is the canonical structured form of your program that everything downstream consumes. V8's lazy pre-parsing is the key to fast startup: most functions only get a cheap shallow pass until they're actually invoked. Automatic semicolon insertion, scope construction, and `eval`/`with` detection all happen during this stage, which is why they have effects that feel "spooky" until you know parsing is where they're decided. And streaming compilation plus code caching are the reasons large applications still manage to start in a reasonable amount of time.
