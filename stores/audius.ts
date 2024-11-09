import { type Reactive, ref, type Ref, reactive, computed, watch } from 'vue';
import { defineStore, acceptHMRUpdate } from 'pinia';
import { v4 } from 'uuid';
import * as api from '../util/audius';
import { createdNamespacedStorageHelpers } from '../util/storage';
import { useToast } from './toast';
import { useViewport } from './viewport';
import { useVisualizer } from './visualizer';
import { usePlaylist } from './playlist';
import { useAudio } from './audio';
import { useWindow } from '../composables/useWindow';
import { shuffle } from '../util/arrays';
import { getHashValues } from '../util/query';
import { get } from '../util/api';

export type Range = (typeof RANGES)[number];

const CACHE = new Map();
const RANGES = ['week', 'month', 'year', 'allTime'] as const;
const AUTH_KEY = 'AUTH';

const ls = createdNamespacedStorageHelpers('5HT.AUDIUS');

export const useAudius = defineStore('audius', () => {
  const fetchTrending = ref(false);
  const root = useWindow();
  const viewport = useViewport();
  const visualizer = useVisualizer();
  const playlist = usePlaylist();
  const auth = ref({
    authenticating: false,
    state: null,
    token: null,
    user: null,
  });
  const isAudius = computed(() => visualizer.source === 'AUDIUS');
  const audio = useAudio();
  const host: Ref<string | null> = ref(null);
  const range: Ref<Range> = ref('week');
  const trendingCollection: Ref<'playlists' | 'albums' | 'artists' | 'tracks'> = ref('playlists');
  const trendingOpen = ref(false);
  const selectingPlaylist = ref(false);
  const searching = ref(false);
  const stagedSelection = ref(null);
  const selectedPlaylist: Ref<any> = ref(null);
  const lastSelectedPlaylist: Ref<any> = ref(null);
  const artistRadioSeed: Ref<any> = ref(null);
  const following = ref([]);
  const followers = ref([]);
  const favorites: Reactive<any> = reactive({
    tracks: [],
    playlists: [],
    albums: [],
  });
  const trending: Reactive<any> = reactive({
    playlists: {
      week: [],
      month: [],
      year: [],
      allTime: [],
    },
    tracks: {
      week: [],
      month: [],
      year: [],
      allTime: [],
    },
  });

  watch(
    () => selectedPlaylist.value,
    val => {
      if (val) {
        lastSelectedPlaylist.value = val;
      }
    },
    {
      immediate: true,
    }
  );

  watch(
    () => playlist.currentTrack,
    val => {
      if (!isAudius.value) return;
      streamCurrentTrack(val);
    }
  );

  watch(
    () => audio.player.ended,
    val => {
      if (val && isAudius.value) playlist.next();
    }
  );

  async function getRaw(path: string, cache = false) {
    if (cache) {
      const exists = CACHE.get(path);
      if (exists) return exists;
    }

    try {
      let url = `${import.meta.env.VITE_AUDIUS_API_BASE}/${path}`;
      url += url.includes('?') ? `&` : `?`;
      url += `app_name=${import.meta.env.VITE_AUDIUS_APP_NAME}`;
      //${auth.value.token && !!auth.value.token && `&token=${auth.value.token}`}`;
      const { data } = await fetch(url).then(res => res.json());
      if (cache) CACHE.set(path, data);
      return data;
    } catch (e) {
      console.log(e);
    }
  }

  async function fetchTrendingPlaylists() {
    const {
      data: {
        trending: { year, month, allTime, week },
      },
    } = await get(`audius/cache`);

    trending.playlists.year = year;
    trending.playlists.month = month;
    trending.playlists.allTime = allTime;
    trending.playlists.week = week;
  }

  // let tries = 0;

  async function selectPlaylist(playlist: any) {
    // const tracks = await getRaw(`playlists/${playlist.id}/tracks`);

    selectedPlaylist.value = playlist;

    //   return;
    // }

    // if (tries === 3) {
    //   toast.error('Audius network error! Try again.');
    //   selectingPlaylist.value = false;
    //   return;
    // }

    // await pause(250);

    // tries++;

    // return selectPlaylist(playlist);
  }

  async function initialize() {
    fetchTrendingPlaylists();

    await processToken();

    viewport.loading = false;
    viewport.pointerMove();

    if (playlist.currentTrack) {
      streamCurrentTrack(playlist.currentTrack);
    }
  }

  async function playTracks(tracks: any[], resetSeed = true) {
    if (resetSeed) {
      artistRadioSeed.value = null;
      ls.set('artistRadioSeed', null);
    }

    playlist.set(tracks);
  }

  function cleanup() {
    selectingPlaylist.value = false;
    selectedPlaylist.value = null;
    stagedSelection.value = null;
  }

  async function buildArtistGroup(user: any, depth: number = 10) {
    const related = await getRaw(`users/${user.id}/related?depth=${depth}`);
    const data = await Promise.all(related.map((user: any) => getRaw(`users/${user.id}/related?limit=${Math.floor(depth / 2)}`)));

    const flattened: Record<string, any> = (data || [])
      .reduce((acc, group) => [...acc, ...group], [])
      .reduce((acc: Record<string, any>, artist: any) => {
        acc[artist.id] = acc[artist.id] || artist;
        return acc;
      }, {});

    return Object.keys(flattened).reduce((acc: any[], key: string) => {
      acc.push(flattened[key]);
      return acc;
    }, []);
  }

  async function buildArtistRadio(user: any, depth: number = 20) {
    viewport.load();
    const artists = await buildArtistGroup(user, depth);
    const raw = await Promise.all(artists.map(user => api.getTracksByUser(user.id, 5)));
    const tracks = shuffle(raw.reduce((acc, group) => [...acc, ...group], []));
    artistRadioSeed.value = user;
    ls.set('artistRadioSeed', user);
    playTracks(tracks, false);
    viewport.loading = false;
  }

  async function getTrackById(trackId: string) {
    try {
      const data = await getRaw(`tracks/${trackId}`);
      return data;
    } catch (e) {
      console.log(e);
    }
  }

  async function streamCurrentTrack(track: any = playlist.currentTrack) {
    if (!track?.id) return;

    const { success, data } = await get(`audius/stream/${track.id}`);

    if (success) {
      audio.player.src = data;
      selectingPlaylist.value = false;
      selectedPlaylist.value = null;
      stagedSelection.value = null;
    }
  }

  function login() {
    auth.value.authenticating = true;
    ls.set(AUTH_KEY, auth.value);
    const base = `https://audius.co/oauth/auth`;
    const redirect = `${import.meta.env.VITE_API}/api/audius/redirect`;
    const query = `?scope=write&api_key=${import.meta.env.VITE_AUDIUS_API_KEY}&state=${v4()}&redirect_uri=${redirect}`;
    root.location.href = base + query;
  }

  function setFavorites(data: any[]) {
    favorites.tracks = [];
    favorites.albums = [];
    favorites.playlists = [];

    (data || []).forEach(({ favoriteType, favoriteItemId }) => {
      switch (favoriteType) {
        case 'SaveType.track':
          favorites.tracks.push(favoriteItemId);
          break;
        case 'SaveType.album':
          favorites.albums.push(favoriteItemId);
          break;
        case 'SaveType.playlist':
          favorites.playlists.push(favoriteItemId);
      }
    });
  }

  function getUserData() {
    api.getFavorites().then((data: any[]) => {
      setFavorites(data);
    });

    api.getFollowers().then((data: any[]) => {
      followers.value = data as any;
    });

    api.getFollowing().then((data: any[]) => {
      following.value = data as any;
    });
  }

  async function processToken() {
    try {
      const hashed = getHashValues();

      if (!auth.value.state || !auth.value.token) {
        if (hashed.state) auth.value.state = hashed.state;
        if (hashed.token) auth.value.token = hashed.token;
        ls.set(AUTH_KEY, auth.value);
      }

      if (auth.value.token) {
        viewport.load();
        const data = await getRaw(`users/verify_token`);
        if (data) {
          auth.value.user = data;
          auth.value.authenticating = false;
          ls.set(AUTH_KEY, auth.value);
          await nextTick();
          getUserData();
          return true;
        } else {
          auth.value.authenticating = false;
          ls.set(AUTH_KEY, auth.value);
          viewport.loading = false;
          return false;
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  function hydrate() {
    const saved = ls.get(AUTH_KEY);

    if (saved) {
      auth.value = saved;
    } else {
      ls.set(AUTH_KEY, auth.value);
    }
  }

  function toggleTrending() {
    trendingOpen.value = !trendingOpen.value;
  }

  async function cache() {
    const MAP = {
      trending: {},
    };

    const month = await getRaw(`playlists/trending?time=month`);
    const year = await getRaw(`playlists/trending?time=year`);
    const allTime = await getRaw(`playlists/trending?time=allTime`);
    const week = await getRaw(`playlists/trending?time=week`);

    MAP.trending.year = await Promise.all(
      year.map(async v => {
        return {
          ...v,
          tracks: await getRaw(`playlists/${v.id}/tracks`),
        };
      })
    );
    MAP.trending.allTime = await Promise.all(
      allTime.map(async v => {
        return {
          ...v,
          tracks: await getRaw(`playlists/${v.id}/tracks`),
        };
      })
    );

    MAP.trending.month = await Promise.all(
      month.map(async v => {
        return {
          ...v,
          tracks: await getRaw(`playlists/${v.id}/tracks`),
        };
      })
    );

    MAP.trending.week = await Promise.all(
      week.map(async v => {
        return {
          ...v,
          tracks: await getRaw(`playlists/${v.id}/tracks`),
        };
      })
    );

    console.log(MAP);
  }

  return {
    initialize,
    fetchTrendingPlaylists,
    toggleTrending,
    range,
    trending,
    getRaw,
    host,
    selectPlaylist,
    selectedPlaylist,
    selectingPlaylist,
    stagedSelection,
    playTracks,
    cleanup,
    lastSelectedPlaylist,
    buildArtistRadio,
    artistRadioSeed,
    login,
    processToken,
    auth,
    favorites,
    following,
    followers,
    api,
    setFavorites,
    trendingCollection,
    getTrackById,
    streamCurrentTrack,
    fetchTrending,
    hydrate,
    trendingOpen,
    cache,
    searching,
  };
});

// if ((import.meta as any)?.hot?.accept && typeof acceptHMRUpdate !== 'undefined') {
//   (import.meta as any).hot.accept(acceptHMRUpdate?.(useAudius, (import.meta as any).hot));
// }
