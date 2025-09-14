# 🟡 **JavaScript Asynchronous Diagram**

![Ảnh minh họa](image.png)

| **Component**      | **Description**                                                                         |
| ------------------ | --------------------------------------------------------------------------------------- |
| **Memory Heap**    | Where variables and objects are stored.                                                 |
| **Call Stack**     | Where synchronous JS code is executed (LIFO – Last In, First Out).                      |
| **Web APIs**       | Asynchronous APIs provided by browser (DOM, AJAX, Timer, ...).                          |
| **Callback Queue** | Queue for callbacks from Web APIs after completion (Task Queue / Macro-task).           |
| **Event Loop**     | Continuously checks Call Stack and pushes tasks from the Queue when the Stack is empty. |

---

## 🚦 **How the Flow Works**

1. Asynchronous functions (**setTimeout**, **AJAX**, **DOM events**, ...) are called and handled by **Web APIs**.
2. When a **Web API** finishes, its callback is pushed to the **Callback Queue**.
3. The **Event Loop** keeps checking:
   - If the **Call Stack** is empty, it pushes the next callback from the **Queue** to the Stack for execution.
4. This process repeats until there are no more tasks.

> **Note:**
>
> - JavaScript has only **one Call Stack** (single-threaded), but thanks to this mechanism, it can handle multiple asynchronous tasks smoothly.
> - **Callback Queue** ≈ **Task Queue** (macro-task).
> - **Microtask Queue** (Promise, MutationObserver, ...) has **higher priority** than Callback Queue but is not shown in this diagram.

---
