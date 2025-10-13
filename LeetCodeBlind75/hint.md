# Blind 75 - LeetCode: Two Sum
- [LeetCode Discuss - Blind 75](https://leetcode.com/discuss/post/460599/blind-75-leetcode-questions-by-krishnade-9xev/)

## 1. Two Sum

> Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.
> You may assume that each input would have exactly one solution, and you may not use the same element twice.
> You can return the answer in any order.

## Approach

### Using Map (Hash Table)

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



