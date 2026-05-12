In TypeScript, these three types represent different levels of "restriction." Understanding the difference is crucial for maintaining type safety while handling dynamic data.

---

### 1. `any`: The Escape Hatch

The `any` type tells TypeScript to **turn off type checking** for that variable. You can do anything with an `any` variable: call it as a function, access any property, or assign it to any other type.

- **Pros:** Quick and easy when migrating from JS.
- **Cons:** Dangerous. It hides bugs and defeats the purpose of using TypeScript.
- **Behavior:** It is both a "Top Type" (everything can be assigned to it) and a "Bottom Type" (it can be assigned to everything).

```typescript
let value: any = 10;
value.toUpperCase(); // No error at compile time, but will CRASH at runtime.
let s: string = value; // No error.
```

---

### 2. `unknown`: The Safe Top Type

Like `any`, you can assign **anything** to `unknown`. However, TypeScript will not let you use the variable until you **prove** what its type is (via Type Guarding or Narrowing).

- **Why use it?** It is the perfect type for data coming from an API or user input where you don't know the shape yet.
- **Behavior:** It is a "Top Type" but is NOT a "Bottom Type."

```typescript
let value: unknown = "Hello";

// value.toUpperCase(); // Error: 'value' is of type 'unknown'.

if (typeof value === "string") {
  console.log(value.toUpperCase()); // OK: TypeScript knows it's a string now.
}
```

---

### 3. `never`: The Impossible Type

The `never` type represents values that **should never exist**. It is used for functions that never return (e.g., they always throw an error or contain an infinite loop).

- **Why use it?** It is excellent for **Exhaustive Checking** in switch statements to ensure you've handled every possible case of a Union type.
- **Behavior:** It is the "Bottom Type." Nothing can be assigned to `never` except `never` itself.

```typescript
function throwError(message: string): never {
  throw new Error(message);
}

type Shape = "circle" | "square";

function getArea(shape: Shape) {
  switch (shape) {
    case "circle":
      return 1;
    case "square":
      return 2;
    default:
      const _exhaustiveCheck: never = shape; // If you add 'triangle' to Shape, this line will error!
      return _exhaustiveCheck;
  }
}
```

---

### Key Comparison Table

| Feature                    | `any`                     | `unknown`                       | `never`                            |
| -------------------------- | ------------------------- | ------------------------------- | ---------------------------------- |
| **Assign anything to it?** | Yes                       | Yes                             | No                                 |
| **Assign it to anything?** | Yes                       | No (Only to `any` or `unknown`) | Yes                                |
| **Access properties?**     | Yes (unsafe)              | No (must narrow first)          | No (logic doesn't exist)           |
| **Common Use Case**        | Legacy code / Lazy typing | API responses / Dynamic data    | Error handling / Exhaustive checks |

### Summary Rule

1. **Avoid `any**` whenever possible. It's a "lie" to the compiler.
2. Use **`unknown`** when you receive data you don't know the type of yet (forcing you to check it).
3. Use **`never`** to represent logic paths that should be unreachable.
