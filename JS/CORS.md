**CORS** stands for **Cross-Origin Resource Sharing**. It is a security mechanism implemented by web browsers to prevent a malicious website from accessing data from another website without permission.

To understand CORS, you must first understand the **Same-Origin Policy (SOP)**.

### 1. The Same-Origin Policy (SOP)

By default, browsers restrict scripts on one page from accessing sensitive data on another page unless they have the same **Origin**. An origin is defined by three things:

1. **Protocol** (e.g., `http` vs `https`)
2. **Domain** (e.g., `example.com` vs `api.com`)
3. **Port** (e.g., `:80` vs `:3000`)

If any of these three differ, it is a **Cross-Origin** request. Without CORS, the browser would block a frontend at `[https://my-app.com](https://my-app.com)` from reading data from an API at `[https://api.my-app.com](https://api.my-app.com)`.

---

### 2. How CORS Works

CORS is a way for a server to tell the browser: _"I trust this specific origin, so let it access my resources."_ It works through specific **HTTP Headers**.

#### **The Simple Request**

For safe requests (like a basic `GET` or `POST` with standard form data), the browser sends the request and checks the response headers:

- **Request Header:** `Origin: [https://my-app.com](https://my-app.com)`
- **Response Header:** `Access-Control-Allow-Origin: [https://my-app.com](https://my-app.com)` (or `*` for all)

If the header is missing or doesn't match, the browser blocks the response from being read by the JavaScript code.

#### **The Preflight Request (`OPTIONS`)**

For "non-simple" requests (e.g., using `PUT`, `DELETE`, or custom headers like `Authorization`), the browser sends an extra check called a **Preflight** request using the `OPTIONS` method.

1. **Browser asks:** "Hey API, am I allowed to send a DELETE request with a JSON body?"
2. **Server responds:** "Yes, I allow DELETE from your origin."
3. **Browser sends:** The actual DELETE request.

---

### 3. Key CORS Headers

- `Access-Control-Allow-Origin`: Specifies which origins can access the resource.
- `Access-Control-Allow-Methods`: Lists allowed HTTP methods (GET, POST, etc.).
- `Access-Control-Allow-Headers`: Lists allowed custom headers (e.g., `Content-Type`, `X-Custom-Header`).
- `Access-Control-Allow-Credentials`: Set to `true` if the request needs to include cookies or HTTP authentication.

---

### Summary Table

| Term          | Meaning                                                       |
| ------------- | ------------------------------------------------------------- |
| **Origin**    | Protocol + Domain + Port.                                     |
| **SOP**       | The security rule that blocks cross-origin access by default. |
| **CORS**      | The exception to the rule, controlled by the server.          |
| **Preflight** | The `OPTIONS` request sent before complex operations.         |

**Are you currently getting a CORS error in a specific project, or are you preparing for a system design/security interview?**
