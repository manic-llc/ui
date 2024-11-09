export function generateRandomId(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charsLength = chars.length;
  const maxValid = 256 - (256 % charsLength);
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  for (let i = 0; i < length; i++) {
    let randomValue = array[i];
    while (randomValue >= maxValid) {
      randomValue = crypto.getRandomValues(new Uint8Array(1))[0];
    }
    result += chars[randomValue % charsLength];
  }

  return result;
}

export async function testAudioStream(url: string) {
  const controller = new AbortController();
  const signal = controller.signal;

  try {
    const response = await fetch(url, { method: 'GET', signal });
    controller.abort();
    if (response.ok) {
      console.log('Audio stream is healthy.');
      return true;
    } else {
      console.error('Audio stream is not accessible. Status:', response.status);
      return false;
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Fetch aborted after header check.');
      return true;
    } else {
      console.error('Error testing audio stream:', error);
      return false;
    }
  }
}
