export function humanReadableTime(date) {
  let seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;

  if (interval > 1) {
    return Math.floor(interval) + ' years';
  }

  interval = seconds / 2592000;

  if (interval > 1) {
    return Math.floor(interval) + ' months';
  }

  interval = seconds / 86400;

  if (interval > 1) {
    return Math.floor(interval) + ' days';
  }

  interval = seconds / 3600;

  if (interval > 1) {
    return Math.floor(interval) + ' hours';
  }

  interval = seconds / 60;

  if (interval > 1) {
    return Math.floor(interval) + ' minutes';
  }

  return Math.floor(seconds) + ' seconds';
}

export function pause(ms: number) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
}

export function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (isNaN(minutes) || isNaN(remainingSeconds)) return `00:00`;
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(remainingSeconds.toFixed(0)).padStart(2, '0');
  return `${formattedMinutes}:${formattedSeconds}`;
}
