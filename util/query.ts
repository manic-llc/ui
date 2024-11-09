import { useWindow } from '@composables/useWindow';

const win = useWindow();

export function parseQueryString(): Record<string, unknown> {
  const values = [...new URLSearchParams(location.search).entries()];
  return values.reduce((acc: Record<string, unknown>, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
}

export function getHashValues(hash = win.location.hash) {
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const pairs = cleanHash.split('&');
  const result: any = {};

  pairs.forEach(pair => {
    const [key, value] = pair.split('=');
    if (key && value) result[decodeURIComponent(key)] = decodeURIComponent(value);
  });

  return result;
}
