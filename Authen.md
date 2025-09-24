# So sánh việc lưu Access Token: Local Storage vs Session Storage vs Cookie

Việc chọn nơi lưu trữ access token là một quyết định quan trọng, ảnh hưởng trực tiếp đến bảo mật của ứng dụng web. Dưới đây là so sánh chi tiết giữa ba phương pháp phổ biến.

### Bảng so sánh tổng quan

| Tiêu chí | Local Storage | Session Storage | Cookie |
| :--- | :--- | :--- | :--- |
| **Bảo mật (XSS)** | **Kém.** Dễ bị tấn công Cross-Site Scripting (XSS). Bất kỳ script nào trên trang cũng có thể đọc được token. | **Kém.** Tương tự Local Storage, vẫn dễ bị tấn công XSS. | **Tốt hơn.** Có thể được bảo vệ bằng cờ `HttpOnly`, khiến JavaScript không thể truy cập được. |
| **Bảo mật (CSRF)** | **An toàn.** Không tự động gửi đi, nên không bị tấn công Cross-Site Request Forgery (CSRF). | **An toàn.** Tương tự Local Storage, không bị tấn công CSRF. | **Dễ bị tấn công.** Cần cấu hình cờ `SameSite` để phòng chống CSRF. |
| **Vòng đời** | Vĩnh viễn, cho đến khi bị xóa thủ công (bởi code hoặc người dùng). | Chỉ tồn tại trong một phiên (tab/cửa sổ). Tự xóa khi đóng tab. | Có thể thiết lập ngày hết hạn. Tồn tại cho đến khi hết hạn. |
| **Gửi đến Server** | Phải gửi thủ công qua code (ví dụ: thêm vào header `Authorization`). | Phải gửi thủ công qua code, tương tự Local Storage. | **Tự động** gửi kèm theo mỗi request đến server. |
| **Phạm vi** | Chia sẻ giữa các tab/cửa sổ cùng một domain. | Chỉ tồn tại trong tab đã tạo ra nó. | Chia sẻ giữa các tab/cửa sổ cùng một domain. |
| **Dung lượng** | Khoảng 5-10MB. | Khoảng 5MB. | Rất nhỏ, khoảng 4KB. |

---

### Phân tích chi tiết từng phương pháp

#### 1. Local Storage

-   **Cách hoạt động:** Dữ liệu được lưu trữ vĩnh viễn trên trình duyệt. JavaScript có thể dễ dàng đọc và ghi dữ liệu này.
    ```javascript
    // Lưu token
    localStorage.setItem('accessToken', 'token_string');

    // Lấy token để gửi đi
    const token = localStorage.getItem('accessToken');
    fetch('api/data', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    ```
-   **Ưu điểm:**
    -   Rất dễ sử dụng và quản lý.
    -   Dung lượng lưu trữ lớn.
-   **Nhược điểm (Rất nghiêm trọng):**
    -   **Rủi ro bảo mật từ XSS:** Nếu trang web của bạn có một lỗ hổng XSS, kẻ tấn công có thể chèn một đoạn script để đánh cắp toàn bộ Local Storage, bao gồm cả access token. Một khi token bị đánh cắp, tài khoản người dùng sẽ bị chiếm đoạt hoàn toàn.
-   **Khi nào nên dùng:** **Không khuyến khích** dùng để lưu access token. Chỉ nên dùng cho các dữ liệu không nhạy cảm như tùy chọn giao diện (sáng/tối), ngôn ngữ,...

#### 2. Session Storage

-   **Cách hoạt động:** Tương tự Local Storage nhưng dữ liệu sẽ bị xóa khi người dùng đóng tab hoặc cửa sổ trình duyệt.
-   **Ưu điểm:**
    -   An toàn hơn Local Storage một chút vì token sẽ biến mất khi phiên kết thúc, làm giảm "thời gian bị tấn công" (attack window).
-   **Nhược điểm:**
    -   **Vẫn dễ bị tấn công XSS:** Vấn đề cốt lõi vẫn giống hệt Local Storage.
    -   Trải nghiệm người dùng kém hơn vì nếu người dùng đóng tab và mở lại, họ sẽ phải đăng nhập lại.
-   **Khi nào nên dùng:** Có thể cân nhắc cho các ứng dụng yêu cầu bảo mật rất cao, nơi việc người dùng phải đăng nhập lại sau mỗi lần đóng tab là một tính năng chấp nhận được.

#### 3. Cookie (với cấu hình bảo mật)

-   **Cách hoạt động:** Server gửi token cho trình duyệt dưới dạng cookie. Trình duyệt sẽ tự động đính kèm cookie này vào tất cả các request tiếp theo đến cùng một domain.
-   **Ưu điểm:**
    -   **Khả năng chống XSS:** Nếu cookie được thiết lập với cờ `HttpOnly`, JavaScript phía client sẽ không thể đọc hay chỉnh sửa nó. Điều này vô hiệu hóa hoàn toàn nguy cơ bị đánh cắp token qua XSS.
    -   **Tự động hóa:** Không cần code JavaScript để đính kèm token vào mỗi request.
-   **Nhược điểm:**
    -   **Rủi ro từ CSRF:** Vì cookie được gửi tự động, kẻ tấn công có thể lừa người dùng thực hiện một hành động trên trang của bạn từ một trang web độc hại khác.
-   **Cách khắc phục nhược điểm:**
    -   Sử dụng cờ `SameSite=Strict` hoặc `SameSite=Lax` cho cookie để chống lại tấn công CSRF.
-   **Cấu hình cookie an toàn nhất cho access token:**
    -   `HttpOnly`: Chống XSS.
    -   `SameSite=Strict` (hoặc `Lax`): Chống CSRF.
    -   `Secure`: Đảm bảo cookie chỉ được gửi qua kết nối HTTPS.

### Kết luận và Khuyến nghị

**Phương pháp được khuyến nghị và an toàn nhất hiện nay là sử dụng Cookie với đầy đủ các cờ bảo mật (`HttpOnly`, `SameSite`, `Secure`).**

-   **Tại sao?** Vì nó giải quyết được mối nguy hiểm lớn nhất là XSS. Mặc dù nó có nguy cơ CSRF, nhưng nguy cơ này có thể được kiểm soát hiệu quả bằng cờ `SameSite`.
-   **Local Storage/Session Storage** tuy dễ sử dụng nhưng lại mở ra một lỗ hổng XSS nghiêm trọng mà rất khó để phòng chống tuyệt đối.

Tóm lại, hãy ưu tiên dùng **Cookie** để bảo vệ người dùng của bạn một cách tốt nhất.
