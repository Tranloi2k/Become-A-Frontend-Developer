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

## 217. Contains Duplicate

### Approach

#### Using Set

### Complexity

- **Time:** O(n)

## 238. Product of Array Except Self

### Approach

#### Think how you can efficiently utilize prefix and suffix products to calculate the product of all elements except self for each index

### Complexity

- **Time:** O(n)

## 53 Maximun Subarray

### Approach

#### the largest sum up to the current position

### Complexity

- **Time:** O(n)

## 153. Find Minimum in Rotated Sorted Array

### Approach

#### Find a way to reduce the size of the array to be processed by half after each step

### Complexity

- **Time:** O(log(n))

## 15. 3Sum

### Approach

#### sắp xếp -> duyệt chọn 1 số làm fixed -> dùng hai con trỏ tìm hai số còn lại -> skip duplicates -> pruning khi nums[i] > 0.

### Complexity

- **Time:** O(n^2)

## 11. Container With Most Water

### Approach

#### Try to use two-pointers. Set one pointer to the left and one to the right of the array. Always move the pointer that points to the lower line.

### Complexity

- **Time:** O(n)
