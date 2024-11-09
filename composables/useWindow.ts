const getWin = () => ({
  performance: { now: () => 0 },
  outerHeight: 10,
  outerWidth: 10,
  innerWidth: 10,
  innerHeight: 10,
  devicePixelRatio: 1,
  addEventListener: () => {},
  removeEventListener: () => {},
  cancelAnimationFrame: () => {},
  requestAnimationFrame: () => {},
  matchMedia: () => null,
  history: {
    back: () => {},
  },
  location: {
    url: '',
    hash: '',
    origin: '',
    search: '',
    href: '',
  },
  ClipboardItem: {},
});

export function useWindow() {
  try {
    return window || getWin();
  } catch (e) {
    return getWin();
  }
}
