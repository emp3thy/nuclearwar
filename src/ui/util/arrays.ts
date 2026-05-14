/**
 * Find the last index in the array matching the predicate. Polyfill for
 * Array.prototype.findLastIndex which is ES2023; our tsconfig targets ES2022.
 */
export function findLastIndexMatching<T>(arr: T[], pred: (x: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pred(arr[i])) return i;
  }
  return -1;
}
