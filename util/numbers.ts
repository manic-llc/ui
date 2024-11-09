export function randomNumber(min = 0, max = 1) {
  return Math.random() * max + min;
}

export function clamp(number: number, min = 0, max = 1) {
  if (number < min) return min;
  if (number > max) return max;
  return number;
}
