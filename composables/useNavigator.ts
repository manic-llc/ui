export const mockNavigator = () => ({
  mediaSession: {
    setActionHandler: () => {},
  },
  mediaDevices: {
    getUserMedia: () => {},
  },
  clipboard: {
    write: () => {},
  },
});

export function useNavigator() {
  try {
    return navigator || mockNavigator();
  } catch (e) {
    return mockNavigator();
  }
}
