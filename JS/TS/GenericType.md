In TypeScript, **Generics** are essentially "variables for types." They allow you to write code that is flexible enough to work with many different types while still maintaining strict type safety.

When you add **Constraints**, you are setting "rules" or "requirements" for what those types must look like.

---

### 1. The Core Concept: Generic Types

A generic type uses a placeholder (usually `<T>`) that gets filled with a real type when the function, class, or interface is used.

**Without Generics (The problem):**
If you use `any`, you lose type information.

```typescript
function getFirst(arr: any[]): any {
  return arr[0];
}
const item = getFirst([1, 2, 3]); // 'item' is type any, no autocomplete
```

**With Generics (The solution):**

```typescript
function getFirst<T>(arr: T[]): T {
  return arr[0];
}
const item = getFirst([1, 2, 3]); // TypeScript knows 'item' is a number
```

---

### 2. Generic Constraints (`extends`)

Sometimes, being "too flexible" is a problem. If you try to access a property on a generic type `T`, TypeScript will complain because it doesn't know if `T` actually has that property.

**The Problem:**

```typescript
function logLength<T>(arg: T): void {
  console.log(arg.length); // Error: Property 'length' does not exist on type 'T'.
}
```

**The Solution (Constraints):**
We use the `extends` keyword to tell TypeScript: "T can be any type, **as long as** it has at least these properties."

```typescript
interface HasLength {
  length: number;
}

function logLength<T extends HasLength>(arg: T): void {
  console.log(arg.length); // OK: TS knows 'length' exists
}

logLength("Hello"); // OK: string has length
logLength([1, 2, 3]); // OK: array has length
logLength({ length: 10 }); // OK: object has length
// logLength(5);          // ERROR: number does not have length
```

---

### 3. Detailed Breakdown of Constraint Scenarios

#### **A. Constraining to Object Keys (`keyof`)**

One of the most powerful uses of constraints is ensuring that a string is a valid key of an object. This prevents "property not found" errors.

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K) {
  return obj[key];
}

const user = { id: 1, name: "Alice" };

getProperty(user, "name"); // OK
// getProperty(user, "age"); // ERROR: "age" is not a key of user
```

#### **B. Constraints in Classes**

You can apply the same logic to classes to ensure the generic data being handled follows a specific structure.

```typescript
interface Formattable {
  format(): string;
}

class Printer<T extends Formattable> {
  print(item: T) {
    console.log(item.format());
  }
}
```

#### **C. Multiple Types in Constraints**

While you can't use a Union directly in the `extends` clause (like `T extends string | number`), you can achieve complex constraints by extending an interface that defines the requirements.

---

### 4. Why use Constraints?

1. **Type Safety:** You prevent the function from being called with incompatible types.
2. **Intellisense:** Inside the function, the IDE will provide autocomplete for the properties defined in the constraint.
3. **Refactoring:** If you change the requirement in the interface, TypeScript will automatically flag every place where the generic function is being used incorrectly.

### Summary Table

| Term         | Role                 | Example                                        |
| ------------ | -------------------- | ---------------------------------------------- |
| `<T>`        | **Type Parameter**   | A placeholder for a type.                      |
| `extends`    | **Constraint**       | Limits what `T` can be.                        |
| `keyof T`    | **Index Constraint** | Limits `T` to the keys of an object.           |
| **Identity** | **Type Retention**   | The return type is exactly what was passed in. |

**Would you like to see how to use Generic Constraints to build a type-safe API Fetcher?**
