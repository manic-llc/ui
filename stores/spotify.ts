import { type ShallowRef, type Reactive, ref, computed, type Ref, shallowRef } from 'vue';
import { acceptHMRUpdate, defineStore } from 'pinia';
import { interpolateBasis } from 'd3-interpolate';
import { scaleLinear } from 'd3-scale';
import { post, createNamespacedAPI } from '../util/api';
import { createdNamespacedStorageHelpers } from '../util/storage';
import { useRAF } from './raf';
import { useToast } from './toast';
import { useWindow } from '../composables/useWindow';
import { clamp } from '../util/numbers';
import bezier from '../util/bezier';
import { parseQueryString } from '../util/query';

const ease = bezier(0.25, 0.92, 0.68, 1);

export type SpotifyProfile = {
  country: string;
  display_name: string;
  email: string;
  explicit_content: {
    filter_enabled: boolean;
    filter_locked: boolean;
  };
  external_urls: {
    spotify: string;
  };
  followers: { href: string | null; total: number };
  id: string;
  images: any[];
  product: string;
  type: string;
  user: string;
  uri: string;
};

const UPDATE_INTERVAL = 5000;
const INTERVALS = ['segments', 'tatums', 'beats', 'bars', 'sections'] as const;

type Interval = (typeof INTERVALS)[number];

const ls = createdNamespacedStorageHelpers('5HT.SPOTIFY');

let timeout: any;

export const useSpotify = defineStore('spotify', () => {
  const root = useWindow();
  const raf = useRAF();
  const toast = useToast();
  const profile: Ref<SpotifyProfile | null> = ref(null);
  const API: ShallowRef<any> = shallowRef(null);
  const tokens: Reactive<Record<string, null | string>> = reactive({
    access: null,
    refresh: null,
  });
  const currentlyPlaying: Ref<null | {
    artist: string;
    album: string;
    track: string;
    artwork: string;
    durationMs: number;
    progressMs: number;
    timestamp: number;
  }> = ref(null);
  const audioAnalysis: ShallowRef<any> = shallowRef(null);
  const stream = ref(0);
  const elapsed = ref(0);
  const progress = computed(() => clamp(!currentlyPlaying.value ? 0 : elapsed.value / currentlyPlaying.value?.durationMs));
  const pulseInterval: Ref<Interval> = ref('beats');
  const activeIntervals: ShallowRef<Record<Interval, number>> = shallowRef({
    segments: -1,
    tatums: -1,
    beats: -1,
    bars: -1,
    sections: -1,
  });
  const intervalProgress: ShallowRef<Record<Interval, number>> = shallowRef({
    segments: 0,
    tatums: 0,
    beats: 0,
    bars: 0,
    sections: 0,
  });
  const playing = ref(false);

  watch(
    () => progress.value,
    value => {
      if (value === 1) {
        fetchCurrentlyPlaying();
      }
    }
  );

  function login() {
    ls.set('SPOTIFY_AUTHENTICATING', true);
    console.log(`${import.meta.env.VITE_API}/api/spotify/login`);
    root.location.href = `${import.meta.env.VITE_API}/api/spotify/login`;
  }

  function initializeAPI() {
    API.value = createNamespacedAPI('https://api.spotify.com/v1', {
      headers: {
        get: () => ({
          Authorization: `Bearer ${tokens.access}`,
          Accept: 'application/json',
        }),
      },

      async refresh() {
        try {
          const { accessToken } = await post('spotify/refresh', { token: tokens.refresh });
          tokens.access = accessToken;
          ls.set('SPOTIFY_ACCESS_TOKEN', accessToken);
          return true;
        } catch (e) {
          console.log(e);
          console.warn('Token refresh failed!');
          return false;
        }
      },
    });
  }

  function resetState() {
    playing.value = false;
    currentlyPlaying.value = null;
    audioAnalysis.value = null;

    activeIntervals.value = {
      segments: -1,
      tatums: -1,
      beats: -1,
      bars: -1,
      sections: -1,
    };

    intervalProgress.value = {
      segments: 0,
      tatums: 0,
      beats: 0,
      bars: 0,
      sections: 0,
    };
  }

  async function fetchCurrentlyPlaying() {
    clearTimeout(timeout);

    try {
      const track = await API.value.get('me/player/currently-playing?additional_types=track,episode');

      if (track?.item?.id) {
        currentlyPlaying.value = {
          artist: track.item.artists[0].name,
          album: track.item.album.name,
          track: track.item.name,
          artwork: track.item.album.images?.[0]?.url,
          durationMs: track.item.duration_ms,
          progressMs: track.progress_ms,
          timestamp: track.timestamp,
        };

        playing.value = track.is_playing;

        if (playing.value) audioAnalysis.value = await API.value.get(`audio-analysis/${track.item.id}`);
      }

      if (!track?.item?.id) throw new Error('💩');
    } catch (e) {
      resetState();
      timeout = setTimeout(fetchCurrentlyPlaying, UPDATE_INTERVAL);
    }
  }

  async function registerProfile() {
    try {
      console.log(await post('auth/spotify', profile.value as SpotifyProfile));
    } catch (e) {
      console.log(e);
    }
  }

  async function fetchProfile() {
    try {
      profile.value = (await API.value.get('me')) as SpotifyProfile;
    } catch (e) {
      toast.error(`Error retrieving Spotify account.`);
    }
  }

  function checkTokens() {
    const { accessToken, refreshToken }: any = parseQueryString();

    if (accessToken?.length > 0 && refreshToken?.length > 0) {
      tokens.access = accessToken as string;
      tokens.refresh = refreshToken as string;
      ls.set('SPOTIFY_ACCESS_TOKEN', accessToken);
      ls.set('SPOTIFY_REFRESH_TOKEN', refreshToken);
      root.location.search = '';
      ls.set('SPOTIFY_AUTHENTICATING', false);
    }

    tokens.access = ls.get('SPOTIFY_ACCESS_TOKEN');
    tokens.refresh = ls.get('SPOTIFY_REFRESH_TOKEN');

    return tokens.access?.length && tokens.refresh?.length;
  }

  function setActiveIntervals() {
    if (!currentlyPlaying.value || !audioAnalysis.value) return;

    INTERVALS.forEach(group => {
      audioAnalysis.value[group].forEach((interval: any, i: number) => {
        const start = interval.start * 1000;
        const duration = interval.duration * 1000;
        if (elapsed.value > start && elapsed.value < start + duration) {
          activeIntervals.value[group] = i;
          intervalProgress.value[group] = ease((elapsed.value - start) / duration);
        }
      });
    });
  }

  const base = scaleLinear([60, 120], [0.06, 0.03]);
  const bump = scaleLinear([60, 120], [0.6, 0.3]);

  function pulse() {
    const fps = raf.frameRate as number;
    const iStream = interpolateBasis([base(fps), bump(fps), base(fps)]);
    const progress = intervalProgress.value[pulseInterval.value];
    stream.value += iStream(progress);
  }

  async function initialize() {
    const hasTokens = checkTokens();

    if (!hasTokens) return login();
    if (!API.value) initializeAPI();

    await fetchProfile();
    await registerProfile();
    await fetchCurrentlyPlaying();

    toast.message(`Connected to Spotify as ${profile.value?.display_name}!`, profile.value?.images?.[1]?.url || null);

    raf.remove('spotify');
    raf.add(
      {
        tick() {
          if (!currentlyPlaying.value) return;
          elapsed.value = Math.min(Date.now() - currentlyPlaying.value.timestamp, currentlyPlaying.value.durationMs);
          setActiveIntervals();
          pulse();
        },
      },
      'spotify'
    );
  }

  function cleanup() {
    clearTimeout(timeout);
    resetState();
    raf.remove('spotify');
  }

  return {
    initialize,
    login,
    tokens,
    profile,
    checkTokens,
    currentlyPlaying,
    audioAnalysis,
    cleanup,
    stream,
    elapsed,
    progress,
    playing,
  };
});

// if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useSpotify, import.meta.hot));
