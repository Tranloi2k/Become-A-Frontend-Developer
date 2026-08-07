# JavaScript Interview Study Guide

> Covers: Prototypes & `this` · Event Loop & Concurrency · Memory & Performance · React Performance · React Rendering Deep Dive · State Management · requestAnimationFrame · useSyncExternalStore · Accessibility · Hydration & RSC · Next.js App Router · Build Tools (Vite / Webpack / Rollup / esbuild / ESM) · Event Delegation · Closures & Encapsulation

---

## 1. Prototypes & `this`

### The Prototype Chain

Every object in JavaScript has a hidden link to another object called its **prototype**. When you access a property, JS walks up this chain until it finds it or reaches `null`.

```
instance
  └── own properties: { name: "An" }
        ↓ not found? look up
Person.prototype
  └── { greet: function, constructor: Person }
        ↓ not found? look up
Object.prototype
  └── { hasOwnProperty, toString, ... }
        ↓
       null
```

```js
function Person(name) {
  this.name = name;               // own property
}
Person.prototype.greet = function() {
  return "Hi, I'm " + this.name;  // lives on prototype, not the instance
};

const p = new Person("An");
console.log(p.greet());               // "Hi, I'm An"
console.log(p.hasOwnProperty("greet")); // false — greet is on prototype
console.log(p.hasOwnProperty("name"));  // true  — name is own property
```

**Key rule:** `hasOwnProperty` checks only the object itself, not the chain.

---

### `this` — The Core Rule

> **`this` is determined by *how* a function is called, not where it's defined.**

| How it's called | What `this` is |
|---|---|
| `obj.greet()` | `obj` |
| `fn()` (detached) | `window` (browser) / `undefined` (strict mode) |
| `new Person()` | the new instance |
| `fn.call(obj)` / `.apply(obj)` / `.bind(obj)` | whatever you pass in |

```js
const obj = {
  name: "An",
  greet: function() { console.log(this.name); }
};

obj.greet();          // "An"  — called on obj
const fn = obj.greet;
fn();                 // undefined — detached, this = window
```

---

### The `setTimeout` Trap

```js
const timer = {
  name: "An",
  start: function() {
    setTimeout(function() {
      console.log(this.name); // ❌ this = window, logs undefined
    }, 100);
  }
};
```

**3 fixes:**

```js
// ✅ 1. Arrow function (modern, preferred)
setTimeout(() => console.log(this.name), 100);

// ✅ 2. .bind(this)
setTimeout(function() { console.log(this.name); }.bind(this), 100);

// ✅ 3. Save reference (legacy, common in old codebases)
const self = this;
setTimeout(function() { console.log(self.name); }, 100);
```

**Key term:** Arrow functions **lexically bind** `this` — they capture it from the enclosing scope at definition time and never have their own `this`.

---

## 2. Event Loop & Concurrency

### The 3 Queues

| Queue | What goes in | Priority |
|---|---|---|
| Call stack | All synchronous code | Runs first |
| Microtask queue | `Promise.then()`, `queueMicrotask()` | After stack, before macrotasks |
| Macrotask queue | `setTimeout`, `setInterval`, DOM events, I/O | One per loop tick |

### Execution Order Rule

```
1. Run all synchronous code (call stack)
2. Drain ALL microtasks — fully (even new ones added during drain)
3. Run ONE macrotask
4. Go back to step 2
```

```js
console.log("1");                          // sync
setTimeout(() => console.log("2"), 0);    // macrotask
Promise.resolve().then(() => console.log("3")); // microtask
console.log("4");                          // sync

// Output: 1 → 4 → 3 → 2
```

---

### Returning a Promise inside `.then()`

```js
Promise.resolve()
  .then(() => {
    console.log("B");
    return Promise.resolve(); // returning a Promise adds extra microtask ticks
  })
  .then(() => console.log("C"));
```

- Returning a **plain value** → next `.then()` queued immediately
- Returning a **`Promise`** → JS needs extra internal ticks to unwrap it → `C` is delayed by 2 microtask ticks

Output with `setTimeout(() => console.log("A"), 0)` before: **D → B → C → A**

---

### Why the UI Freezes (Single-Threaded JS)

JavaScript runs on **one thread**. A heavy loop on the call stack blocks everything — repaints, clicks, event handling — until it finishes.

```js
// ❌ Blocks UI for ~2 seconds when clicked
button.onclick = function() {
  for (let i = 0; i < 2_000_000_000; i++) {}
};
```

**Fixes:**

```js
// ✅ 1. Web Worker — separate thread, UI stays responsive (best for CPU work)
const worker = new Worker("worker.js");
worker.postMessage("start");

// ✅ 2. Chunking with setTimeout — yield back to event loop between chunks
function crunchChunked(total, chunkSize) {
  let i = 0;
  function step() {
    const end = Math.min(i + chunkSize, total);
    for (; i < end; i++) {}
    if (i < total) setTimeout(step, 0);
  }
  step();
}

// ✅ 3. requestAnimationFrame — chunking synced to screen repaints (good for visual work)
```

---

## 3. Memory & Performance

### Garbage Collection (GC)

The browser automatically frees memory that can no longer be **reached** by running code.

```js
function greet() {
  const message = "Hello"; // allocated
  console.log(message);
}                          // greet() ends → message unreachable → GC frees it
```

Closures keep values alive:

```js
function makeCounter() {
  let count = 0;
  return function() {
    count++;        // count stays reachable via closure — NOT freed
    return count;
  };
}
const counter = makeCounter(); // count lives as long as counter does
```

---

### The 4 Classic Memory Leaks

**1. Forgotten event listeners**
```js
// ❌ Leak
window.addEventListener("resize", handler);

// ✅ Fix
window.removeEventListener("resize", handler);
```

**2. Forgotten setInterval**
```js
// ❌ Leak
const id = setInterval(() => console.log(data), 1000);

// ✅ Fix
clearInterval(id);
```

**3. Detached DOM nodes**
```js
// ❌ Leak — removed from DOM but variable still holds reference
let btn = document.querySelector("#btn");
document.body.removeChild(btn);

// ✅ Fix
btn = null;
```

**4. Accidental global variables**
```js
// ❌ Leak — missing let/const/var → becomes window.user
function init() {
  user = { name: "An" };
}

// ✅ Fix
function init() {
  const user = { name: "An" };
}
```

---

### React useEffect Cleanup Pattern

Every `useEffect` that sets up a listener, timer, or subscription **must** return a cleanup function:

```js
useEffect(() => {
  window.addEventListener("resize", handler);
  const id = setInterval(fetchData, 5000);

  return () => {                               // runs on unmount
    window.removeEventListener("resize", handler);
    clearInterval(id);
  };
}, []);
```

---

### Modern Cleanup: AbortController

Removes multiple listeners at once — preferred in modern code:

```js
const controller = new AbortController();

window.addEventListener("resize", handler, { signal: controller.signal });
window.addEventListener("scroll", handler2, { signal: controller.signal });

// Clean up everything at once:
controller.abort();
```

---

### How to Investigate Memory Leaks (Chrome DevTools)

1. Open DevTools → **Memory** tab
2. Take a **heap snapshot**
3. Use the app for a few minutes (navigate around)
4. Take another snapshot
5. **Compare** — if object counts keep growing, you have a leak

Also check the **Performance** tab:
- 📈 Memory climbing steadily = leak
- 📊 Sawtooth pattern (up then drop) = normal GC behavior

---

### Interview Answer: "SPA getting slower over time"

A complete senior-level answer covers all 3 parts:

**Diagnose:** Component unmounting without cleanup — event listeners, timers, and subscriptions added on mount but never removed, holding references through closures.

**Find:** Chrome DevTools Memory tab — take heap snapshots before and after navigation, compare object counts.

**Fix checklist:**

| Source | Fix |
|---|---|
| Event listeners | `removeEventListener` in useEffect cleanup |
| Timers | `clearInterval` / `clearTimeout` in cleanup |
| WebSocket / RxJS subscriptions | Unsubscribe in cleanup |
| Detached DOM refs | Set to `null` when done |
| Accidental globals | Always use `const` / `let` |

---

## Quick Reference: Interview Cheatsheet

| Topic | Key phrase to say |
|---|---|
| Prototype chain | "JS walks up the chain until it finds the property or hits null" |
| `this` rule | "Determined by how the function is called, not where it's defined" |
| Arrow functions | "Lexically bind `this` from the enclosing scope" |
| Event loop order | "Sync → drain all microtasks → one macrotask → repeat" |
| UI freeze | "JS is single-threaded — heavy sync work blocks the event loop" |
| Web Worker | "Moves CPU work off the main thread entirely" |
| Memory leak | "A reference that outlives its usefulness — GC thinks it's still needed" |
| React cleanup | "Return a cleanup function from useEffect to remove listeners and timers" |
| Re-render cause | "New function/object reference passed as prop, parent re-render, context change" |
| Memoization rule | "Memoize when recomputing costs more than remembering — profile first" |
| Reconciliation | "Same position + same type = update; different type = destroy and recreate" |
| Key prop | "Stable unique ID so React tracks items correctly across reorders/deletes" |
| Laggy list fix | "Debounce → useMemo filter → React.memo items → virtualization" |

---

## 4. React Performance

### Why Components Re-render

A component re-renders when:
1. Its own state changes
2. Its parent re-renders
3. A context it consumes changes
4. A prop changes reference — even if the value is logically the same

```jsx
// Parent re-renders → new function reference every time → Child re-renders
// even though React.memo is used
<Child onClick={() => handleClick()} />
```

---

### React.memo + useCallback — Always a Pair

`React.memo` skips re-render if props are shallowly equal. But it fails without stable references.

```jsx
// ❌ React.memo is useless here — handleClick is recreated every render
function Parent() {
  const [count, setCount] = useState(0);
  const handleClick = () => console.log("clicked"); // new reference every render

  return <Child onClick={handleClick} />;
}
const Child = React.memo(({ onClick }) => {
  console.log("Child rendered");
  return <button onClick={onClick}>Click</button>;
});

// ✅ Fix — useCallback keeps the same reference
const handleClick = useCallback(() => {
  console.log("clicked");
}, []); // recreate only when dependencies change
```

---

### useMemo — Stable Values

Same idea as `useCallback` but for computed values instead of functions:

```js
// ❌ Recalculates on every render
const filtered = items.filter(i => i.active);

// ✅ Only recalculates when items changes
const filtered = useMemo(() => {
  return items.filter(i => i.active);
}, [items]);
```

---

### When to Memoize

| Situation | Use it? |
|---|---|
| Function passed to `React.memo` child | ✅ Yes |
| Expensive calculation (sorting/filtering big lists) | ✅ Yes |
| Value used as a `useEffect` dependency | ✅ Yes |
| Simple value like a string or number | ❌ No |
| Function not passed as a prop | ❌ No |
| Without profiling first | ❌ No |

> **Always profile first** using React DevTools Profiler. Memoization has memory and comparison costs — overusing it slows your app down.

---

### useEffect — Correct Dependencies + Cleanup

```js
// ❌ Two bugs: missing dependency + no cleanup
useEffect(() => {
  fetchUser(userId).then(data => setUser(data));
}, []);

// ✅ Fixed
useEffect(() => {
  const controller = new AbortController();

  fetchUser(userId, { signal: controller.signal })
    .then(data => setUser(data))
    .catch(err => {
      if (err.name === "AbortError") return;
      console.error(err);
    });

  return () => controller.abort(); // cancel on unmount or userId change
}, [userId]); // ✅ correct dependency
```

---

### Reconciliation & the Virtual DOM

React keeps a lightweight JS copy of the DOM (virtual DOM). On state change:

```
State changes
    → React builds new virtual DOM
    → Compares old vs new (reconciliation)
    → Only changed nodes update in real DOM
    → React.memo / useCallback / useMemo reduce what counts as "changed"
```

**Two reconciliation rules:**

```jsx
// Rule 1: Same position + same type → update (state is preserved)
<div><Counter /></div> → <div><Counter /></div> // ✅ Counter keeps state

// Rule 2: Same position + different type → destroy and recreate (state is lost)
<div><Counter /></div> → <section><Counter /></section> // ❌ Counter state reset
```

---

### The key Prop — Never Use Index

```jsx
// ❌ Index as key — breaks on reorder or delete
{items.map((item, index) => <Item key={index} value={item} />)}

// ✅ Stable unique ID
{items.map(item => <Item key={item.id} value={item} />)}
```

Without stable keys, React matches items by position — reorder or delete one item and React updates the wrong components, causing state bugs and unnecessary re-renders.

---

### Interview Answer: "Laggy search filter over 500 items"

Apply fixes in layers — each one targets a different bottleneck:

```js
// Layer 1: Debounce — reduce how often filtering triggers
const debouncedQuery = useDebounce(query, 300);

// Layer 2: useMemo — only refilter when data or query changes
const filtered = useMemo(() => {
  return items.filter(i => i.name.includes(debouncedQuery));
}, [items, debouncedQuery]);

// Layer 3: React.memo — skip re-render for unchanged items
const Item = React.memo(({ item }) => <div>{item.name}</div>);

// Layer 4: Virtualization — only render visible DOM nodes (5000+ items)
import { FixedSizeList } from "react-window";

<FixedSizeList height={600} itemCount={filtered.length} itemSize={50}>
  {({ index, style }) => (
    <div style={style}>{filtered[index].name}</div>
  )}
</FixedSizeList>
```

**One-sentence interview answer:**
> "Debounce the input to reduce trigger frequency, memoize the filtered result with `useMemo`, wrap items in `React.memo` to skip unchanged renders, and use virtualization if the list grows very large."

---

## 5. React Rendering Deep Dive

### The Problem Concurrent Mode Solves

Before React 18, rendering was **synchronous and uninterruptible** — React had to finish the entire render tree before giving control back to the browser. Heavy renders froze the UI.

```
Traditional rendering:
User types → React renders 500 items (200ms) → UI frozen → next keystroke delayed

Concurrent rendering:
User types → React starts rendering → new keystroke arrives → React pauses
           → handles keystroke first → resumes render → UI always responsive
```

---

### Two Priority Lanes

| Priority | What goes here |
|---|---|
| **Urgent** | Typing, clicking, direct user interactions |
| **Non-urgent (transition)** | Search results, filtering, navigation, tab switches |

---

### `useTransition` — Marking Work as Non-Urgent

```js
const [isPending, startTransition] = useTransition();
const [query, setQuery] = useState("");
const [results, setResults] = useState(items);

function handleChange(e) {
  setQuery(e.target.value);          // urgent — updates immediately

  startTransition(() => {            // non-urgent — React can interrupt
    setResults(items.filter(i => i.name.includes(e.target.value)));
  });
}

return (
  <>
    <input value={query} onChange={handleChange} />
    {isPending && <span>Loading...</span>}
    <List items={results} />
  </>
);
```

`isPending` is `true` while the transition runs — use it to show subtle loading indicators.

**useTransition vs debounce:**

| Debounce | useTransition |
|---|---|
| Delays update by fixed time | Interrupts only when needed |
| Input feels slightly laggy | Input always feels instant |
| Works in all React versions | React 18+ only |

---

### `Suspense` — Catching Components That Aren't Ready

```jsx
// Use case 1: Code splitting (lazy loading)
const SearchPage = React.lazy(() => import("./SearchPage"));

<Suspense fallback={<Spinner />}>
  <SearchPage />
</Suspense>

// Use case 2: Data fetching (React 18+)
function UserProfile({ userId }) {
  const user = use(fetchUser(userId)); // throws a Promise if not ready
  return <div>{user.name}</div>;
}

<Suspense fallback={<Skeleton />}>
  <UserProfile userId={1} />
</Suspense>
```

When a component throws a Promise, Suspense catches it, shows the fallback, and retries rendering automatically when the promise resolves.

---

### Suspense + useTransition — The Senior Pattern

```jsx
function App() {
  const [userId, setUserId] = useState(1);
  const [isPending, startTransition] = useTransition();

  function switchUser(id) {
    startTransition(() => setUserId(id));
  }

  return (
    <>
      <button onClick={() => switchUser(2)}>
        Switch User {isPending && "..."}
      </button>
      <Suspense fallback={<Skeleton />}>
        <UserProfile userId={userId} />
      </Suspense>
    </>
  );
}
```

| Without `startTransition` | With `startTransition` |
|---|---|
| Old content disappears immediately | Old content stays visible during load |
| Skeleton shows right away — jarring | New content swaps in when ready — smooth |

This is called **keeping the UI consistent during transitions**.

---

### Interview Answer: "Janky tab switching with 500ms spinner flash"

```jsx
function Dashboard() {
  const [tab, setTab] = useState("analytics");
  const [isPending, startTransition] = useTransition();

  function switchTab(next) {
    startTransition(() => setTab(next));
  }

  return (
    <>
      <TabButtons onSwitch={switchTab} isPending={isPending} />
      <Suspense fallback={<Spinner />}>
        <TabPanel tab={tab} />
      </Suspense>
    </>
  );
}

// Skip re-render on inactive panels
const AnalyticsPanel = React.memo(() => <div>...</div>);

// Avoid recomputing expensive derived data
const processedData = useMemo(() => heavyTransform(rawData), [rawData]);
```

**Full toolkit for this problem:**

| Tool | Role |
|---|---|
| `startTransition` | Keep old tab visible during load |
| `Suspense` | Show fallback only on first load |
| `React.memo` | Skip re-render on inactive panels |
| `useMemo` | Avoid recomputing expensive derived data |

**One-sentence interview answer:**
> "Wrap the tab switch in `startTransition` so React keeps the old panel visible while loading the new one in the background, use `Suspense` for the fallback, `React.memo` to skip inactive panel re-renders, and `useMemo` to avoid recomputing expensive derived data."

---

### Why React 18 Can Interrupt Renders (And Earlier Versions Couldn't)

**Before React 16 — recursive, synchronous rendering**

```js
function render(component) {
  const children = component.render();
  children.forEach(child => render(child)); // recursive — can't stop midway
}
```

Once started, this ran to completion on the call stack — same single-thread blocking problem as a heavy `for` loop. **A recursive call stack cannot be paused and resumed.**

---

**React 16 — Fiber rewrite**

React rewrote rendering to use **Fiber** — small units of work (one per component) processed in a loop instead of recursion:

```js
// Simplified internal work loop
function workLoop() {
  while (currentFiber && !shouldYield()) {
    currentFiber = processFiber(currentFiber); // one unit of work
  }
  if (currentFiber) {
    requestIdleCallback(workLoop); // still work left — continue later
  }
}
```

`shouldYield()` checks if something more urgent arrived. If yes, the loop stops and hands control back to the browser — then resumes later. **A loop can be stopped and resumed; a recursive call stack cannot.**

---

**React 18 — concurrency turned on**

```js
// React 17 and earlier — synchronous, no concurrency
ReactDOM.render(<App />, root);

// React 18 — concurrent features enabled
ReactDOM.createRoot(root).render(<App />);
```

Without `createRoot`, `useTransition` and Suspense transitions don't behave concurrently.

**One-sentence interview answer:**
> "Before Fiber, React used recursive calls which can't be paused mid-stack. Fiber rewrote rendering as a loop over small work units, so React can check between each unit whether something more urgent arrived and yield back to the browser if needed."

---

## 6. State Management — Context vs Zustand vs React Query

### The Core Mental Model

Most confusion comes from treating all state the same. In reality there are different *kinds* of state, each suited to a different tool:

| Type of state | Best tool |
|---|---|
| Global UI state (theme, locale, auth flag) | Context |
| Complex client state, shared, changes often | Zustand |
| Server state (API data, caching, syncing) | React Query |

**The key question to ask is "where did this data come from?" — not "where is it used?"**

- **Client state** — you own it, lives in memory, you control updates
- **Server state** — lives on a server, can go stale, needs syncing, may be shared by other users

React Query exists because server state has problems client-state tools (Redux, Zustand) aren't designed for: caching, background refetching, deduplication, stale-while-revalidate.

---

### Context — Good for Slow-Changing, Broadly-Needed State

```jsx
const ThemeContext = createContext();
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("dark");
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

**The critical flaw:** Context has no selector mechanism. Every consumer re-renders on every change, even if it only reads a value that didn't change:

```
count changes → Provider re-renders → ALL consumers re-render
                                        (even ones that don't use 'count')
```

✅ Good for: theme, auth user flag, locale — things that rarely change.
❌ Bad for: frequently-changing state like form input, counters, toggles — causes re-render storms.

---

### Zustand — Client State With Selectors

```js
// Zustand — minimal boilerplate vs Redux
const useStore = create(set => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 }))
}));

// ✅ Selector — only re-renders when 'count' specifically changes
const count = useStore(state => state.count);
```

This solves exactly the problem Context can't: each component subscribes to only the slice of state it actually needs.

---

### React Query — Server State Done Right

```js
// ❌ Manual server state — what everyone wrote before React Query
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  setLoading(true);
  fetchUser(id)
    .then(setUser)
    .catch(setError)
    .finally(() => setLoading(false));
}, [id]);

// ✅ React Query — handles all of this automatically
const { data: user, isLoading, error } = useQuery({
  queryKey: ["user", id],
  queryFn: () => fetchUser(id),
  staleTime: 5 * 60 * 1000, // consider fresh for 5 minutes
});
```

Free with React Query:
- **Caching** — same query across components shares one request
- **Background refetching** — data stays fresh automatically
- **Deduplication** — simultaneous mounts fire only one request
- **Stale-while-revalidate** — show cached data instantly, refetch silently

---

### Common Mistake: Putting Server Data in Zustand

```js
// ❌ Anti-pattern — server data managed manually in Zustand
const useStore = create(set => ({
  user: null,
  loading: false,
  error: null,
  fetchUser: async (id) => {
    set({ loading: true });
    try {
      const data = await fetchUser(id);
      set({ user: data, loading: false });
    } catch (err) {
      set({ error: err, loading: false });
    }
  }
}));
```

**Problems this creates:**

| Problem | Why it happens |
|---|---|
| No caching | Every component mount triggers a fresh fetch |
| Silent staleness | No mechanism to know data is outdated |
| Store bloat | Every entity needs its own loading/error/data fields |
| No deduplication | Simultaneous calls cause race conditions |

**Fix:** use React Query for the server data, keep Zustand only for pure client state:

```js
// ✅ Server state → React Query
const { data: user } = useQuery({ queryKey: ["user", id], queryFn: () => fetchUser(id) });

// ✅ Client state → Zustand
const useUIStore = create(set => ({
  sidebarOpen: false,
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen }))
}));
```

---

### Decision Tree

```
Is the data from a server / API?
  YES → React Query
  NO  → Is it needed by many components across the tree?
          YES → Does it change frequently?
                  YES → Zustand (with selectors)
                  NO  → Context (theme, auth flag, locale)
          NO  → Local useState
```

### Worked Examples

| State | Tool | Why |
|---|---|---|
| Logged-in user profile (`/api/me`) | React Query | It came from an API — server state, regardless of how broadly it's used |
| Sidebar open/closed | Zustand | Frequent local toggling — Context would re-render the whole tree |
| Products list (`/api/products`) | React Query | Server state |
| Language/locale | Context | Rarely changes, needed broadly |

**The rule that fixes the most common mistake:**
> Ask **"where did this data come from?"** before asking **"where is this data used?"** Data fetched from an API is server state — it belongs in React Query even if it feels like "global app state."

**One-sentence interview answer:**
> "If the data comes from a server, use React Query regardless of where it's used. If it's pure client state needed broadly and changes often, use Zustand with selectors. If it's client state that rarely changes, Context is fine."

---

## 7. requestAnimationFrame

### What It Does

> Schedules a callback to run right before the browser's next repaint — synced to the screen's refresh rate (~60fps = every 16.6ms).

```js
function animate() {
  console.log("frame");
  requestAnimationFrame(animate); // schedule next frame
}
requestAnimationFrame(animate);
```

```js
setTimeout(fn, 16);        // ❌ approximate — not synced to actual screen refresh
requestAnimationFrame(fn); // ✅ browser calls you exactly when about to paint
```

---

### Where It Fits in the Event Loop

```
1. Call stack clears (sync code done)
2. All microtasks drain (Promises)
3. Browser checks: time to repaint?
   → YES: run all requestAnimationFrame callbacks, THEN paint
4. Next macrotask (setTimeout, etc.)
```

---

### Using It in React — Smooth Animation

```jsx
// ✅ Synced to actual repaints, with proper cleanup
function Counter() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId;
    function tick() {
      setProgress(p => (p < 100 ? p + 1 : 100));
      frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId); // same cleanup pattern as clearInterval
  }, []);

  return <div style={{ width: `${progress}%` }} />;
}
```

---

### Measuring DOM After Paint

```jsx
function AutoScrollList({ items }) {
  const listRef = useRef(null);

  useEffect(() => {
    // ✅ Wait for the browser to actually paint before reading/writing layout
    requestAnimationFrame(() => {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, [items]);

  return <div ref={listRef}>{/* items */}</div>;
}
```

`useEffect` runs after React commits to the DOM, but the browser may not have visually painted yet. `rAF` guarantees you read/write exactly at paint time.

---

### vs `useTransition`

| | `useTransition` | `requestAnimationFrame` |
|---|---|---|
| Solves | Interrupting low-priority state updates | Syncing visual updates to screen refresh |
| Used for | Deferring expensive renders (search, tab switches) | Smooth animations, precise DOM measurements |
| Runs where | React's scheduler | Browser's paint cycle |

---

### Prefer CSS When Possible

```css
/* ✅ GPU accelerated, doesn't block JS at all */
.progress-bar { transition: width 0.3s ease-out; }
```

```
CSS animations/transitions → run on compositor thread
requestAnimationFrame      → runs on main thread, competes with JS
```

**Rule of thumb:** CSS for simple property animations. `requestAnimationFrame` for per-frame JS logic — physics, canvas, syncing multiple elements, reading/writing layout every frame.

**One-sentence interview answer:**
> "`requestAnimationFrame` schedules a callback right before the browser's next repaint, synced to actual refresh rate — unlike `setTimeout` which fires on an approximate timer. Use it in React for smooth JS-driven animations or precise DOM measurements after paint, but prefer CSS transitions for simple property changes since those run off the main thread."

---

## 8. useSyncExternalStore

### The Problem It Solves

Concurrent rendering (React 18) can pause, interrupt, and resume renders. This creates a **tearing** bug for state living outside React (Zustand, browser APIs, global variables):

```js
// External store — outside React entirely
let count = 0;
const listeners = new Set();

function increment() {
  count++;
  listeners.forEach(l => l());
}

function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
```

```jsx
// ❌ Naive read — if render is interrupted and count changes externally mid-pause,
// different components can see different (torn) values in the same render
function Counter() {
  const [, forceRender] = useState({});
  useEffect(() => subscribe(() => forceRender({})), []);
  return <div>{count}</div>;
}
```

---

### The Fix

```jsx
import { useSyncExternalStore } from "react";

function Counter() {
  const count = useSyncExternalStore(
    subscribe,     // how to subscribe to changes
    () => count,   // how to get current value (client)
    () => 0        // value during SSR (avoids hydration mismatch)
  );
  return <div>{count}</div>;
}
```

React guarantees no tearing — if an interrupted render resumes and the value changed mid-render, React forces a synchronous re-check so every component sees a consistent value.

---

### How the Callback Actually Works — Tracing the Full Flow

`callback` in `subscribe(callback)` is **not written by you** — React creates it internally:

```js
// Simplified internal behavior of useSyncExternalStore
function useSyncExternalStore(subscribe, getSnapshot) {
  const [state, setState] = useState(getSnapshot());

  useEffect(() => {
    const handleStoreChange = () => setState(getSnapshot()); // React creates this
    const unsubscribe = subscribe(handleStoreChange);          // passes it into your subscribe
    return unsubscribe;
  }, [subscribe]);

  return state;
}
```

Full flow:
```
1. Component calls useAlertTotal()
2. useSyncExternalStore's internal useEffect runs:
     - creates handleStoreChange (the callback)
     - calls subscribe(handleStoreChange)
3. In the store: listeners.add(handleStoreChange) — callback stored here

--- later, when store changes ---

4. Something calls addAlert() in the store
5. addAlert() changes internal state, then: listeners.forEach(l => l())
6. handleStoreChange() is called
7. It re-reads the snapshot and compares
8. If the value actually changed → setState → re-render
   If unchanged → same reference → skip re-render
```

The store doesn't know or care what the callback does — pub/sub pattern: publisher just calls `callback()` at the right time.

---

### Zustand Uses This Internally

```js
// Simplified version of what Zustand does internally
function useStore(selector) {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState())
  );
}
```

This is why Zustand and Redux work correctly with `useTransition` and other concurrent features — they're built on `useSyncExternalStore`.

---

### Custom Selector Pattern (avoiding unnecessary re-renders)

`useSyncExternalStore` itself doesn't know about individual fields — it only knows "the store changed, call getSnapshot again." Selecting *which* re-renders actually happen is done by caching the selected value and comparing:

```js
function useAlertSelector(selector, isEqual = Object.is) {
  const last = useRef(undefined);
  const has = useRef(false);

  const getSelection = useCallback(() => {
    const next = selector(getSnapshot());
    if (has.current && isEqual(last.current, next)) {
      return last.current; // unchanged slice → same reference → React skips re-render
    }
    has.current = true;
    last.current = next;
    return next; // changed → new reference → React re-renders
  }, [selector, isEqual]);

  return useSyncExternalStore(subscribe, getSelection, getSelection);
}

export const useAlertList = () => useAlertSelector((s) => s.list);
export const useAlertTotal = () => useAlertSelector((s) => s.total);
export const useCriticalTotal = () => useAlertSelector((s) => s.criticalTotal);
```

All 3 hooks subscribe to the **same store** — not separate channels. When the store updates, all are woken up, but only hooks whose selected slice actually changed value trigger a re-render:

```
Store update: { list: [...new], total: 50 (same), criticalTotal: 3 (same) }

useAlertList     → new reference        → re-renders
useAlertTotal    → isEqual(50, 50)=true → skips re-render
useCriticalTotal → isEqual(3, 3)=true   → skips re-render
```

This is a hand-rolled version of the official `useSyncExternalStoreWithSelector` — same idea as Zustand's `useStore(state => state.count)` selector pattern.

---

### Building on Non-React Data Sources

```jsx
// Browser online/offline status
function useOnlineStatus() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener("online", callback);
      window.addEventListener("offline", callback);
      return () => {
        window.removeEventListener("online", callback);
        window.removeEventListener("offline", callback);
      };
    },
    () => navigator.onLine,
    () => true // server snapshot
  );
}
```

---

### Summary

| | `useState` + `useEffect` | `useSyncExternalStore` |
|---|---|---|
| Safe under concurrent rendering | ❌ Can tear | ✅ Guaranteed consistent |
| Built for | Internal React state | External data sources |
| SSR support | Manual, error-prone | Built-in `getServerSnapshot` |
| Used by | — | Zustand, Redux, Jotai internally |

**One-sentence interview answer:**
> "`useSyncExternalStore` lets React safely read state that lives outside React — like a Zustand store or `window.innerWidth` — without tearing under concurrent rendering. It's the hook that libraries like Zustand and Redux use internally to stay compatible with React 18's concurrent features."
## 9. Accessibility (a11y)

### The 3 Pillars

1. **Semantic HTML** — use the right tag for the job
2. **Keyboard navigation** — everything usable without a mouse
3. **Screen reader support** — ARIA when semantic HTML isn't enough

**The #1 rule:**
> Use the native HTML element that matches the behavior you want before reaching for ARIA or custom JavaScript. This is the "first rule of ARIA."

---

### Pillar 1 — Semantic HTML

```jsx
// ❌ Common mistake — div with click handler
function DeleteButton({ onDelete }) {
  return <div onClick={onDelete} className="delete-btn">Delete</div>;
}
```

Problems with `<div onClick>`:
- Keyboard users can't reach it — `Tab` skips non-focusable elements
- Screen readers announce "Delete" with no indication it's interactive
- `Enter` and `Space` keys don't trigger it — browser doesn't know it's a button

```jsx
// ✅ Correct — native button handles all of this automatically
function DeleteButton({ onDelete }) {
  return <button onClick={onDelete} className="delete-btn">Delete</button>;
}
```

---

### Pillar 2 — Keyboard Navigation

When you genuinely can't use a native element, add these 4 things manually:

```jsx
function CustomDropdownTrigger({ onToggle, isOpen, label }) {
  return (
    <div
      onClick={onToggle}
      tabIndex={0}              // 1. Makes it reachable via Tab
      role="button"             // 2. Screen reader announces it as a button
      aria-expanded={isOpen}    // 3. Communicates open/closed state
      onKeyDown={(e) => {       // 4. Handles Enter and Space like a native button
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      style={{ cursor: "pointer" }}
    >
      {label}
    </div>
  );
}
```

**tabIndex values:**

| Value | Behavior |
|---|---|
| `0` | Focusable, in natural tab order |
| `-1` | Focusable by JS only (`focus()` works, Tab skips) |
| `1+` | Avoid — disrupts natural tab order |

---

### Pillar 3 — ARIA

**Common roles:**

| role | Use when |
|---|---|
| `button` | Custom clickable elements |
| `dialog` | Custom modal |
| `navigation` | Custom nav container |
| `alert` | Dynamic error messages |
| `menu` / `menuitem` | Custom dropdown menus |

**Common states:**

| Attribute | What it communicates |
|---|---|
| `aria-expanded` | Open/closed (dropdowns, accordions) |
| `aria-checked` | Checked state (custom checkboxes) |
| `aria-disabled` | Disabled without removing from tab order |
| `aria-hidden` | Hides decorative elements from screen readers |
| `aria-label` | Text label when visible text isn't enough |
| `aria-live` | Announces dynamic content changes |

---

### Icon-Only Buttons

```jsx
// ❌ Screen reader announces just "button" — no context
function CloseButton({ onClose }) {
  return <button onClick={onClose}><XIcon /></button>;
}

// ✅ Fix 1 — aria-label (most common)
<button onClick={onClose} aria-label="Close dialog">
  <XIcon />
</button>

// ✅ Fix 2 — visually hidden text
<button onClick={onClose}>
  <XIcon aria-hidden="true" />
  <span className="sr-only">Close dialog</span>
</button>
```

```css
/* sr-only — visible to screen readers, invisible on screen */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

| Situation | Use |
|---|---|
| Icon-only button, no visible text needed | `aria-label` |
| Text needs to appear in DOM for SEO | `sr-only` span |
| Button already has visible text | Neither |

---

## 10. Hydration & React Server Components

### What Hydration Is

```
Server:
  1. React renders component tree to plain HTML string
  2. Sends HTML to browser
  3. Browser displays content immediately — fast first paint

Client:
  4. Browser downloads JS bundle
  5. React walks the component tree
  6. Matches each component to existing DOM node
  7. Attaches event listeners
  8. App becomes interactive
```

Step 6 is critical — React expects server HTML to **exactly match** what it would render on the client. Mismatch = hydration error.

---

### Hydration Mismatches — Common Causes

```jsx
// ❌ Time differs between server and client render
<div>Current time: {new Date().toLocaleTimeString()}</div>

// ❌ Random values
<div>{Math.random()}</div>

// ❌ Browser-only APIs used during render
<div>{window.innerWidth}px wide</div>

// ❌ Data that changes between server and client
<div>{localStorage.getItem("theme")}</div>
```

**Fix 1 — useEffect for client-only values**
```jsx
function Greeting() {
  const [time, setTime] = useState(null); // null on server — no mismatch

  useEffect(() => {
    setTime(new Date().toLocaleTimeString()); // runs only on client
  }, []);

  if (!time) return <div>Loading...</div>;
  return <div>Current time: {time}</div>;
}
```

**Fix 2 — `suppressHydrationWarning`** for intentional differences (use sparingly)
```jsx
<div suppressHydrationWarning>{new Date().toLocaleTimeString()}</div>
```

**Fix 3 — `dynamic` with `ssr: false`** for components that use browser APIs entirely
```jsx
const BrowserOnlyChart = dynamic(() => import("./Chart"), { ssr: false });
```

---

### The Hydration Performance Problem

```
0ms    → HTML arrives, user sees content   ✅ looks interactive
800ms  → JS bundle downloads               ⏳ looks interactive but isn't
1200ms → hydration completes               ✅ actually interactive
```

This gap is measured by **TTI (Time To Interactive)**. A large JS bundle makes it worse. This is what React Server Components solve.

---

### React Server Components (RSC)

```jsx
// Server Component — renders on server only, zero JS sent to client
async function ProductList() {
  const products = await db.getProducts(); // direct DB access
  return (
    <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>
  );
}

// Client Component — hydrated in browser, has interactivity
"use client";
function AddToCartButton({ productId }) {
  return <button onClick={() => addToCart(productId)}>Add to cart</button>;
}
```

| | Server Component | Client Component |
|---|---|---|
| Renders | Server only | Server + client (hydrated) |
| JS sent to browser | ❌ Zero | ✅ Yes |
| Can use useState/useEffect | ❌ No | ✅ Yes |
| Can fetch from DB directly | ✅ Yes | ❌ No |
| Use for | Data, static content | Interactivity |

**Decision rule:**
```
Uses useState / useReducer?              → Client Component
Uses event handlers (onClick...)?        → Client Component
Uses browser APIs (window, localStorage)? → Client Component
Uses useEffect?                          → Client Component
Everything else?                         → Server Component
```

**Key pattern — push Client Components to the leaves:**
```jsx
// ❌ Entire page becomes client-side because of one toggle
"use client";
function ProductPage({ id }) {
  const [tab, setTab] = useState("description");
  return (
    <>
      <ProductDescription id={id} />  // unnecessarily client-side
      <Reviews id={id} />             // unnecessarily client-side
      <TabSwitcher tab={tab} />
    </>
  );
}

// ✅ Extract only interactive part as Client Component
function ProductPage({ id }) {        // Server Component
  return (
    <>
      <ProductDescription id={id} />  // Server Component ✅
      <Reviews id={id} />             // Server Component ✅
      <TabSwitcher />                 // Client Component — only this ✅
    </>
  );
}
```

---

## 11. Next.js App Router

### File System Conventions

```
app/
  layout.js        → persistent shell — never re-mounts between child navigations
  template.js      → like layout but RE-MOUNTS on every navigation
  page.js          → main content for the route
  loading.js       → Suspense fallback — shown while page.js loads
  error.js         → Error Boundary — shown on thrown errors
  not-found.js     → 404 UI — triggered by calling notFound()
  route.js         → API endpoint — GET/POST handlers, no UI
```

**layout.js vs template.js:**

| | `layout.js` | `template.js` |
|---|---|---|
| Re-mounts on navigation | ❌ No — persists | ✅ Yes — fresh mount |
| Use for | Sidebar, nav, shared shell | Page transition animations, resetting form state |

---

### Route Groups `(folder)`

Parentheses mean the folder exists in the filesystem but **not in the URL**:

```
app/
  (marketing)/
    about/page.js      → /about      ← (marketing) disappears from URL
    pricing/page.js    → /pricing

  (auth)/
    layout.js          ← minimal layout, no sidebar
    login/page.js      → /login

  (app)/
    layout.js          ← full dashboard layout with sidebar
    dashboard/page.js  → /dashboard
```

Most powerful use: **different layouts for same-level routes** without affecting URLs.

---

### Data Fetching Strategies

```js
// SSG — cached indefinitely, built at deploy time
const data = await fetch("/api/products");

// ISR — revalidates in background after N seconds
const data = await fetch("/api/products", {
  next: { revalidate: 60 }
});

// SSR — fresh on every request, never cached
const data = await fetch("/api/products", {
  cache: "no-store"
});
```

| Strategy | Cache option | Use for |
|---|---|---|
| SSG | default | Marketing, docs, terms, blog |
| ISR | `revalidate: N` | Product pages, news, pricing |
| SSR | `no-store` | User-specific, real-time data |
| CSR | React Query | Cart, search, interactive data |

**Ecommerce mapping:**

```
Homepage              ISR     Changes daily, needs SEO
Product listing       ISR     Updated when inventory changes
Product detail        ISR     Price/stock can be slightly stale
Search results        SSR     Query-specific, can't cache per-user
Cart                  CSR     User-specific, changes per interaction
Order confirmation    SSR     Must show accurate real-time data
Terms & Privacy       SSG     Never changes
```

---

### `generateStaticParams` — Pre-building Dynamic Routes

```js
// app/products/[id]/page.js
export async function generateStaticParams() {
  const products = await db.getTopProducts(100);
  return products.map(p => ({ id: p.id.toString() }));
  // pre-builds top 100 at deploy; long tail builds on-demand
}
```

---

### Middleware

Runs on the **Edge before a request reaches a page** — redirect, rewrite, or modify requests.

```js
// middleware.js — must be at project root, alongside next.config.js
import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("auth-token");
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboard && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"]
};
```

**Middleware file location — always at project root:**
```
my-nextjs-app/
  app/                 ← routes
  middleware.js        ← must be here ✅
  next.config.js
  package.json
```

**For complex logic — compose modules:**
```
middleware.js          ← entry point
lib/
  middleware/
    auth.js
    locale.js
    rateLimit.js
```

**Middleware vs Route Handlers:**

| | Middleware | Route Handler |
|---|---|---|
| Runs | Before page renders | When API endpoint called |
| File | Root `middleware.js` | `app/api/.../route.js` |
| Can read response body | ❌ No | ✅ Yes |
| Use for | Auth, locale, A/B testing | CRUD, data fetching |

**4 real use cases:** authentication redirects, locale/i18n detection, A/B testing, rate limiting.

**One-sentence interview answer:**
> "Middleware runs on the Edge before a request reaches a page — use it for authentication redirects, locale detection, and A/B testing, since it's the earliest and fastest interception point in the request lifecycle."

---

## 12. Build Tools — Vite, Webpack, Rollup, esbuild

### The Problem Build Tools Solve

Before build tools, JS projects had no module system — everything was global:

```html
<!-- Load order matters, everything shares global scope -->
<script src="jquery.js"></script>
<script src="utils.js"></script>
<script src="app.js"></script>
```

Problems: global scope pollution, silent overwrites, no dependency declaration, no code reuse.

---

### ESM — JavaScript's Native Module System

ES Modules (ESM) landed in ES2015 and became the official JS module standard:

```js
// math.js — named exports
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }
export default function multiply(a, b) { return a * b; }

// main.js — named imports
import { add, subtract } from "./math.js";
import multiply from "./math.js";     // default import
import * as MathUtils from "./math.js"; // namespace import
```

**3 key properties that make ESM special:**

**1. Static analysis — imports resolved at parse time, not runtime**
```js
// ✅ ESM — must be at top level, static
import { add } from "./math.js";

// ❌ Invalid ESM — can't import inside conditions
if (condition) { import { add } from "./math.js"; } // SyntaxError

// ✅ CommonJS — dynamic, can be anywhere
if (condition) { const { add } = require("./math"); } // valid CJS
```
Because imports are static, bundlers can read the entire dependency graph **without running any code** — this enables tree shaking.

**2. Live bindings — exports are live references, not copies**
```js
// counter.js
export let count = 0;
export function increment() { count++; }

// main.js
import { count, increment } from "./counter.js";
console.log(count); // 0
increment();
console.log(count); // 1 — updates automatically, live reference
// CJS would give a copy — wouldn't update
```

**3. Async loading — designed for the browser**
```js
// Browser loads ESM without blocking
<script type="module" src="./main.js"></script>

// Dynamic import — load on demand (code splitting)
const { add } = await import("./math.js"); // returns a Promise
```

React.lazy uses dynamic import under the hood:
```js
const HeavyChart = React.lazy(() => import("./HeavyChart"));
```

---

### Why Synchronous Loading Breaks in Browsers

CommonJS `require()` is synchronous — fine for disk reads in Node.js (~1ms), catastrophic for browsers:

```js
// If browsers used synchronous loading:
const math = require("./math.js"); // network request = 50-500ms
                                    // ENTIRE browser freezes during this
```

**Sequential vs parallel loading:**
```
CJS (synchronous):              ESM (asynchronous):
fetch math.js → wait            fetch math.js ─┐
fetch utils.js → wait           fetch utils.js ─┤ all at once, parallel
fetch lodash → wait             fetch lodash ───┘
Total: 150 + 200 + 300 = 650ms  Total: max(300ms) = 300ms
```

ESM parses all imports first, fires all network requests simultaneously, and waits asynchronously — call stack stays free, browser stays responsive.

---

### Module Systems Before ESM

| System | Where | Loading | Syntax |
|---|---|---|---|
| CommonJS (CJS) | Node.js | Synchronous | `require()` / `module.exports` |
| AMD | Browser (old) | Async but ugly | `define(["dep"], fn)` |
| IIFE | Browser (hack) | Sync | `(function() {})()` |
| ESM | Browser + Node | Async, native | `import` / `export` |

**ESM vs CJS compatibility:**
```js
// ✅ ESM can import CJS — works (Next.js/Vite handle automatically)
import lodash from "lodash";

// ❌ CJS cannot import ESM
const pkg = require("pure-esm-package"); // ERR_REQUIRE_ESM
```

---

### Webpack — The Original Bundler

Built in 2012 when browsers didn't support ESM. Bundles everything before serving:

```
Start dev server:
  → Webpack crawls entire dependency graph
  → Transpiles ALL files
  → Combines into one big bundle
  → THEN serves to browser
  Large app cold start: 30-60 seconds
```

**4 core Webpack concepts:**
```js
// webpack.config.js
module.exports = {
  entry: "./src/main.js",          // where to start the dependency graph

  output: {
    path: "./dist",
    filename: "bundle.[hash].js"   // hashed for cache busting
  },

  module: {
    rules: [                       // loaders — transform non-JS files
      { test: /\.tsx?$/, use: "ts-loader" },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
    ]
  },

  plugins: [                       // plugins — broader build tasks
    new HtmlWebpackPlugin(),        // generates index.html
    new MiniCssExtractPlugin(),     // extracts CSS to separate file
  ]
};
```

---

### Vite — Native ESM Dev Server

Created by Evan You (Vue creator). Skips bundling entirely in development:

```
Start dev server:
  → Vite starts instantly — no bundling
  → Browser requests /src/main.js
  → Vite transforms ONLY that file on demand
  → Browser follows imports, requests those files
  → Only needed files are ever transformed
  Cold start: ~300ms regardless of app size
```

**HMR comparison:**
```
Webpack HMR: file changes → re-bundle affected chunk → 2-10 seconds
Vite HMR:    file changes → invalidate one module → ~50ms always
```

**Vite config:**
```js
// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {           // code splitting
          vendor: ["react", "react-dom"],
          utils: ["lodash", "date-fns"]
        }
      }
    }
  }
});
```

---

### esbuild — The Speed Engine

Written in **Go** (compiled native code, parallel by default) — 10-100x faster than JS-based tools:

```
Webpack:  ~30 seconds
Rollup:   ~15 seconds
esbuild:  ~0.3 seconds  ← same output
```

**Two jobs esbuild does inside Vite:**

**Job 1 — Dependency pre-bundling** (on `vite dev` start):
```
node_modules → esbuild pre-bundles → .vite/deps/

Why pre-bundle?
  - Many npm packages are CJS → convert to ESM for browser
  - Some packages have 600+ internal files (lodash) → bundle into one
    to avoid 600 browser network requests
```

**Job 2 — On-demand file transformation:**
```
Browser requests App.tsx
  → esbuild transforms TSX → JS in ~1ms
  → Vite serves plain JS

Webpack doing same:
  → ts-loader transforms in ~100ms
  → × hundreds of files = massive speed difference
```

---

### Rollup — The Production Bundler

Built specifically for ESM — produces the cleanest, smallest output:

```js
// utils.js — 3 exports
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }
export function multiply(a, b) { return a * b; }

// main.js — only uses add
import { add } from "./utils.js";
```

**Rollup output** — flat, dead code eliminated:
```js
function add(a, b) { return a + b; }
// subtract and multiply: completely gone
console.log(add(1, 2));
```

**Webpack output** — keeps module wrapper boilerplate, less aggressive tree shaking.

**Multiple output formats** — why library authors love Rollup:
```js
output: [
  { file: "dist/bundle.esm.js", format: "esm" },  // modern browsers
  { file: "dist/bundle.cjs.js", format: "cjs" },  // Node.js
  { file: "dist/bundle.umd.js", format: "umd" },  // legacy browsers
]
```

---

### The Full Vite Architecture

```
DEVELOPMENT:
  node_modules ──→ esbuild pre-bundles ──→ .vite/deps/ (CJS→ESM, deduplicated)
  Your files   ──→ esbuild transforms on demand ──→ browser via native ESM
  File change  ──→ invalidate one module ──→ HMR ~50ms

PRODUCTION BUILD:
  Your files + deps ──→ Rollup bundles ──→ optimized dist/
  Tree shaking + code splitting + minification + chunk hashing
```

**Why not use esbuild for production too?**

| Feature | Rollup | esbuild |
|---|---|---|
| Tree shaking quality | ✅ Best in class | ✅ Good but less thorough |
| Code splitting control | ✅ Very flexible | ⚠️ Limited |
| Plugin ecosystem | ✅ Mature | ⚠️ Still growing |
| Output format flexibility | ✅ ESM, CJS, UMD, IIFE | ⚠️ Fewer options |
| Speed | ⚠️ Slower | ✅ 100x faster |

esbuild wins on speed. Rollup wins on output quality. Vite uses each where it matters most.

> **Coming soon:** Vite 5+ is experimenting with **Rolldown** — a Rollup-compatible bundler rewritten in Rust — aiming to bring esbuild-level speed to production builds.

---

### When to Choose Webpack Over Vite

| Situation | Why Webpack |
|---|---|
| Micro-frontend architecture | Webpack Module Federation is the standard |
| Complex existing build pipeline | Migration cost too high |
| Very fine-grained chunk control | Webpack's chunking is more configurable |
| Legacy browser support required | More mature loader ecosystem |

For new projects: **Vite almost always**. For existing enterprise apps: **Webpack may stay**.

---

### Tree Shaking — How Both Tools Shrink Bundles

```js
// Only add is imported — subtract and multiply are dead code
import { add } from "./utils.js";
```

Both Webpack and Rollup eliminate dead exports from production bundles. Requires ESM — CJS modules can't be tree-shaken because `require()` is dynamic and can't be statically analyzed.

On large apps with libraries like lodash, tree shaking can cut bundle size by **50-80%**.

---

### Quick Reference

| Tool | Written in | Role | Speed |
|---|---|---|---|
| Webpack | JavaScript | Full bundler (dev + prod) | Slow |
| Vite | JS (orchestrates) | Dev server + prod build | Fast |
| esbuild | Go | Transformer + pre-bundler | 100x faster |
| Rollup | JavaScript | Production bundler | Moderate |
| Rolldown | Rust | Future Vite prod bundler | esbuild-level |

**One-sentence interview answer:**
> "Rollup is a bundler optimized for ESM with the best tree shaking and flexible output formats — ideal for production bundles. esbuild is written in Go making it 100x faster than JS-based tools — ideal for dev transforms. Vite uses both: esbuild for fast dev-time transforms and dependency pre-bundling, Rollup for optimized production builds."

---

## 13. Event Propagation & Delegation

### Event Bubbling — the mechanism delegation relies on

A click starts at the exact element clicked, then bubbles up through every ancestor:

```js
document.getElementById("outer").addEventListener("click", () => console.log("outer"));
document.getElementById("middle").addEventListener("click", () => console.log("middle"));
document.getElementById("inner").addEventListener("click", () => console.log("inner"));
// Click inner → "inner", "middle", "outer"
```

---

### Event Delegation — using bubbling on purpose

Attach **one listener to a common ancestor** instead of one per child, and identify the actual target with `e.target.closest()`:

```jsx
// ❌ Without delegation — 1000 items = 1000 listeners
function ItemList({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => handleClick(item.id)}>{item.name}</li>
      ))}
    </ul>
  );
}

// ✅ With delegation — 1 listener total, regardless of item count
function ItemList({ items }) {
  function handleClick(e) {
    const li = e.target.closest("li");
    if (!li) return;
    console.log("clicked item", li.dataset.id);
  }
  return (
    <ul onClick={handleClick}>
      {items.map(item => <li key={item.id} data-id={item.id}>{item.name}</li>)}
    </ul>
  );
}
```

---

### Why It Matters at Scale

**1. Memory** — one delegated listener vs thousands of individual ones.

**2. Dynamic content — no re-wiring needed:**
```js
// ❌ Individual listeners break when new items are added dynamically
items.forEach(item => {
  document.getElementById(item.id).addEventListener("click", handleClick);
});
// New item added later? Must remember to attach a listener to it too.

// ✅ Delegated listener covers items added later automatically
container.addEventListener("click", handleClick);
```

**3. Virtualized lists — required, not optional:**
```jsx
// ❌ Per-row listeners in a virtualized list — leaks on every scroll tick
// (rows mount/unmount constantly as react-window recycles them)

// ✅ Delegation — one listener on the scroll container survives all mount/unmount cycles
function VirtualList({ items }) {
  function handleClick(e) {
    const row = e.target.closest("[data-id]");
    if (row) handleItemClick(row.dataset.id);
  }
  return (
    <div onClick={handleClick}>
      <FixedSizeList itemCount={items.length} itemSize={50}>
        {({ index, style }) => (
          <div style={style} data-id={items[index].id}>{items[index].name}</div>
        )}
      </FixedSizeList>
    </div>
  );
}
```

---

### Limits of Delegation

**1. Not all events bubble:**
```js
// ❌ Don't bubble
"focus", "blur", "mouseenter", "mouseleave"

// ✅ Bubbling equivalents — use these for delegation
"focusin", "focusout", "mouseover", "mouseout"
```

**2. `e.target` vs `e.currentTarget`:**
```js
container.addEventListener("click", (e) => {
  console.log(e.target);        // actual element clicked (could be nested deep)
  console.log(e.currentTarget); // always the container — where listener is attached
});
```

---

### stopPropagation() — the other half of best practices

```jsx
// Modal — clicking overlay closes it, clicking content should NOT
function Modal({ onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
```

Use sparingly — overusing it in a large app makes debugging harder since other devs expect natural bubbling.

---

### Decision Framework

| Situation | Approach |
|---|---|
| List/table with many items (100+) | Delegation — one listener on container |
| Items added/removed dynamically | Delegation — no re-wiring needed |
| Virtualized lists | Delegation — required |
| Small, fixed set of elements | Individual listeners are fine |
| Modal/dropdown shouldn't close on inner click | `stopPropagation()` at that boundary only |
| Global keyboard shortcuts | Delegate at `document` level |

**One-sentence interview answer:**
> "Event delegation attaches one listener to a common ancestor and uses `e.target.closest()` to identify what was clicked — this scales far better than per-item listeners, avoids leaks in virtualized components where rows constantly mount and unmount, and automatically covers elements added later without extra wiring."

---

## 14. Closures — Modularity & Encapsulation

### The Core Idea

> A closure lets a function "remember" variables from its enclosing scope, even after that scope has finished executing. This creates **private state** — inaccessible from the outside.

```js
function createCounter() {
  let count = 0; // private — no way to access from outside

  return {
    increment() { count++; return count; },
    decrement() { count--; return count; },
    getValue() { return count; }
  };
}

const counter = createCounter();
counter.increment(); // 1
console.log(counter.count); // undefined — not accessible directly
```

---

### Without Closures — State Is Exposed

```js
// ❌ Anyone can corrupt shared state
let count = 0;
function increment() { count++; }
count = 999; // 🚨 bypasses your logic entirely

// ✅ With closures — only your exposed functions can touch state
counter.increment(); // goes through your logic
counter.count = 999;  // does nothing — count isn't a real property
```

Same principle as `private` class fields — closures give true privacy without special syntax.

---

### The Module Pattern — Closures as Modularity

Before ES modules existed, closures (via IIFE) were how JS achieved modularity:

```js
const ShoppingCart = (function () {
  let items = []; // private

  function calculateTotal() { // private helper
    return items.reduce((sum, item) => sum + item.price, 0);
  }

  return { // public API — only these are exposed
    addItem(item) { items.push(item); },
    getTotal() { return calculateTotal(); },
    getItemCount() { return items.length; }
  };
})();

ShoppingCart.addItem({ price: 20 });
console.log(ShoppingCart.items); // undefined — internal state hidden
```

Same mental model as ES modules — `export` decides what's public — except closures achieve it through scope alone.

---

### Hooks Are Built on This Pattern

`useState` itself relies on closures:

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1); // closes over 'count' from THIS render
  }

  return <button onClick={handleClick}>{count}</button>;
}
```

Every render creates a new closure — `handleClick` in render #1 closes over `count = 0`, in render #2 over `count = 1`.

**Stale closure bug — common interview question:**
```jsx
// ❌ 'count' is frozen at 0 forever — closure captured it once
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(id);
}, []); // empty deps — effect runs once, closure locks in count = 0

// ✅ Fix — functional update reads the LATEST state, not the closure snapshot
setCount(prev => prev + 1);
```

---

### Summary

| Benefit | How closures provide it |
|---|---|
| Private state | Outer-scope variables aren't accessible externally |
| Controlled mutation | State changes only through exposed functions |
| No global namespace pollution | Each factory/module has isolated scope |
| Data integrity | External code can't corrupt internal state |

**One-sentence interview answer:**
> "Closures let an inner function retain access to its outer function's variables even after the outer function returns — this creates private state only reachable through functions you deliberately expose, which is the mechanism behind the module pattern, factory functions, and hooks like `useState` under the hood."

---

