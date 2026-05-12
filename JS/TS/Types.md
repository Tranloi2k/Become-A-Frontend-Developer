TypeScript adds a powerful layer of type safety to JavaScript. Here is a breakdown of the core concepts you’ll encounter in interviews and daily development.

---

### 1. Union vs. Intersection

#### **Union (`|`)**

A Union type says a value can be **one of several types**. Think of it as "OR".

```typescript
type ID = string | number;

let userId: ID = 101; // OK
userId = "admin-01"; // OK
```

#### **Intersection (`&`)**

An Intersection type combines multiple types into one. The resulting type has **all the members** of all combined types. Think of it as "AND".

```typescript
type Employee = { id: number };
type Manager = { department: string };

type TeamLead = Employee & Manager;

const lead: TeamLead = {
  id: 1,
  department: "Engineering", // Must have both
};
```

---

### 2. Interface vs. Type

Both are used to define the "shape" of an object, but they have distinct differences.

| Feature                 | `interface`                                         | `type`                                 |
| ----------------------- | --------------------------------------------------- | -------------------------------------- |
| **Declaration Merging** | **Yes** (Multiple interfaces with same name merge). | **No** (Will throw an error).          |
| **Extending**           | Uses `extends` keyword.                             | Uses Intersections (`&`).              |
| **Scope**               | Best for Object shapes.                             | Can define Unions, Primitives, Tuples. |
| **Performance**         | Slightly faster for TS compiler.                    | Can be more complex to compute.        |

**Rule of Thumb:** Use `interface` for public APIs and defining object structures that might be extended. Use `type` for complex logic like Unions or Intersections.

---

### 3. Enum

Enums allow you to define a set of named constants, making code more readable.

```typescript
enum Status {
  Pending, // 0
  Success, // 1
  Error, // 2
}

const current = Status.Success; // 1
```

> **Warning:** Modern TypeScript developers often prefer **Union Types** (`type Status = 'pending' | 'success'`) over Enums because Enums generate extra JavaScript code at runtime, whereas types disappear after compilation.

---

### 4. Generics

Generics allow you to create reusable components that work with a variety of types rather than a single one. They act as "variables for types."

**Why use Generics?**
If you use `any`, you lose type safety. With Generics, you capture the type the user provides so you can use it later.

```typescript
// 'T' is a placeholder for a type provided later
function identity<T>(arg: T): T {
  return arg;
}

const output1 = identity<string>("Hello"); // T is string
const output2 = identity<number>(100); // T is number
```

#### **Generic Constraints**

You can limit what types a Generic can accept using the `extends` keyword:

```typescript
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length;
}

getLength("Hello"); // OK: string has .length
getLength([1, 2]); // OK: array has .length
getLength(10); // Error: number has no .length
```

### Summary Table

| Concept          | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| **Union**        | Choice between types (`A` or `B`).                   |
| **Intersection** | Merging types (`A` and `B`).                         |
| **Interface**    | Defining object structures; supports merging.        |
| **Type**         | Flexible definitions; supports unions/primitives.    |
| **Enum**         | Named constants (numeric or string).                 |
| **Generics**     | Flexible, type-safe templates for functions/classes. |

Would you like to see how to combine **Generics** with **Interfaces** for advanced API data handling?

# II. **Utility Types**

---

### 1. `Partial<T>`

It makes **all properties** of a type `T` optional (`?`).

- **Use case:** Useful for "Update" forms where a user might only change one or two fields of a large object.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// All fields become optional
function updateUser(id: number, fieldsToUpdate: Partial<User>) {
  // logic...
}

updateUser(1, { name: "New Name" }); // Valid, even though email is missing
```

---

### 2. `Pick<T, K>`

Creates a new type by **picking** a specific set of properties `K` from type `T`.

- **Use case:** When you have a large User object but only need the `name` and `email` for a specific UI component.

```typescript
// Only 'name' and 'email' are kept
type UserContactInfo = Pick<User, "name" | "email">;

const contact: UserContactInfo = {
  name: "Alex",
  email: "alex@example.com",
};
```

---

### 3. `Omit<T, K>`

The opposite of `Pick`. It creates a new type by **removing** specific properties `K` from type `T`.

- **Use case:** Removing sensitive data (like `password`) before sending an object to the client.

```typescript
interface UserAccount extends User {
  password: string;
}

// Everything EXCEPT 'password'
type UserProfile = Omit<UserAccount, "password">;
```

---

### 4. `Record<K, V>`

Constructs an object type where the keys are of type `K` and the values are of type `V`.

- **Use case:** Mapping IDs to objects or creating a dictionary/config object.

```typescript
interface PageInfo {
  title: string;
}

type Page = "home" | "about" | "contact";

// Keys must be from 'Page', values must be 'PageInfo'
const nav: Record<Page, PageInfo> = {
  home: { title: "Home Page" },
  about: { title: "About Us" },
  contact: { title: "Get in touch" },
};
```

---

### 5. `Readonly<T>`

Makes **all properties** of `T` read-only. You cannot reassign any property after the object is created.

- **Use case:** Protecting a configuration object or state from accidental mutation.

```typescript
const config: Readonly<User> = {
  id: 1,
  name: "Admin",
  email: "admin@web.com",
};

config.name = "Editor"; // Error: Cannot assign to 'name' because it is a read-only property.
```

---

### Summary Comparison Table

| Utility Type       | Action                      | Resulting Shape                |
| ------------------ | --------------------------- | ------------------------------ |
| **`Partial<T>`**   | Makes everything optional   | `{ prop?: value }`             |
| **`Pick<T, K>`**   | Selects specific keys       | Subset of the original keys    |
| **`Omit<T, K>`**   | Removes specific keys       | Original keys minus `K`        |
| **`Record<K, V>`** | Maps keys to values         | A dictionary-like object       |
| **`Readonly<T>`**  | Adds `readonly` to all keys | Object that cannot be modified |

**Pro Tip:** You can chain these! For example, `ReadOnly<Partial<User>>` would create an object where every field is optional but also cannot be changed once set.

Would you like to try a small coding challenge using these utilities to see if you can "transform" a mock API response?</Partial</K,></T,></T,></K,></T,></T,>
