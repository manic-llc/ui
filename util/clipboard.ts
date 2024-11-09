import { useNavigator } from '@composables/useNavigator';
import { useWindow } from '@composables/useWindow';

const win = useWindow();
const nav = useNavigator();

export function writeToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!nav?.clipboard || !win?.ClipboardItem) {
      console.error('Clipboard API not supported or unavailable.');
      return reject('Clipboard API not supported or unavailable.');
    }

    try {
      const blob = new Blob([text], { type: 'text/plain' });
      const clipboardItem = new win.ClipboardItem({ 'text/plain': blob });

      nav.clipboard
        .write([clipboardItem])
        .then(() => resolve())
        .catch(error => {
          console.error('Failed to write to clipboard:', error);
          reject(error);
        });
    } catch (error) {
      console.error('Error creating clipboard item:', error);
      reject(error);
    }
  });
}
