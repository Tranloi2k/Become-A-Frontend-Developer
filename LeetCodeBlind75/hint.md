# Blind 75 - LeetCode: Two Sum
- [LeetCode Discuss - Blind 75](https://leetcode.com/discuss/post/460599/blind-75-leetcode-questions-by-krishnade-9xev/)

## 1. Two Sum

### Approach

#### Using Map (Hash Table)

1. Khởi tạo một Map (hay Hash Table) để lưu các giá trị đã duyệt qua và chỉ số của chúng.
<!--
2. Duyệt qua từng phần tử của mảng:
    - Tính phần còn thiếu (complement) = `target - nums[i]`
    - Nếu phần còn thiếu đã tồn tại trong Map, trả về chỉ số của nó và chỉ số hiện tại.
    - Nếu chưa có, thêm giá trị hiện tại và chỉ số vào Map.
-->
### Complexity

- **Time:** O(n)
- **Space:** O(n)

## 121. Best Time to Buy and Sell Stock

### Approach

#### Using Map (Hash Table)

1. The maximum profit will be found in one of the intervals that are partitioned by the minimum price points
<!--
Duy trì một biến minPrice (giá mua thấp nhất bạn đã thấy từ đầu đến giờ).
Duy trì một biến maxProfit (lợi nhuận tối đa tìm được).
Duyệt qua mảng prices một lần duy nhất. Tại mỗi price:
Tính lợi nhuận tiềm năng nếu bán hôm nay: currentProfit = price - minPrice.
Cập nhật maxProfit = max(maxProfit, currentProfit).
Cập nhật minPrice = min(minPrice, price).
-->
### Complexity

- **Time:** O(n)


