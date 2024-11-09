export function clone(value: any): any {
  if (Array.isArray(value)) return value.map(v => clone(v));

  if (value && typeof value === 'object') {
    try {
      const keys = Object.keys(value);
      return (keys || [])?.reduce?.((acc, key) => {
        acc[key] = clone(value[key]);
        return acc;
      }, {} as any);
    } catch (e) {
      return value;
    }
  }

  return value;
}
