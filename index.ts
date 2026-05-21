function longestSubarray(nums: number[]): number {
  let left = 0;
  let max = 0;
  let crr = 0;
  let remain = 0;
  for (let right = 0; right < nums.length; right++) {
    if (nums[right]) {
      crr++;
      max = Math.max(crr, max);
    } else {
      remain++;
      while (remain > 1) {
        if (nums[left] === 0) {
          remain--;
        } else {
          crr--;
        }
        left++;
      }
    }
  }
  return max === nums.length ? max - 1 : max;
}

console.log(longestSubarray([0, 1, 1, 1, 0, 1, 1, 0, 1]));
