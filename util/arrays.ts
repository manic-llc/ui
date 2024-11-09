import { clone } from '@util/clone';

export function sample(array: unknown[]) {
  return array[Math.floor(Math.random() * array.length)];
}

export function shuffle(arr: unknown[]): unknown[] {
  const array = clone(arr);

  for (var i = array.length - 1; i >= 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }

  return array;
}

export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) throw new Error('Size must be greater than 0');

  const result: T[][] = [];

  for (let i = 0; i < (array || []).length; i += size) {
    result.push(array.slice(i, i + size));
  }

  return result;
}
