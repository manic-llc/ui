export const mockDocument = () => ({
  body: {
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: () => {},
  },
  querySelector: () => {},
  getElementsByTagName: () => {},
  getElementById: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  createElement: () => {},
  fullscreenElement: null,
  documentElement: {
    style: {
      setProperty: () => {},
    },
  },
  exitFullscreen: () => {},
  requestFullscreen: () => {},
});

export function useDocument() {
  try {
    return document || mockDocument();
  } catch (e) {
    return mockDocument();
  }
}
