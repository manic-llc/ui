export function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function lowercaseFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function replaceAllSubstrings(str: string, substring: string, newValue = '') {
  return str.split(substring).join(newValue);
}

export function replaceAllWords(str: string, substring: string, newValue = '') {
  const regex = new RegExp(`(?<!\\.)\\b${substring}\\b`, 'g');
  return str.replace(regex, newValue);
}
