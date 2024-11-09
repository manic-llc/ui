import { ref, computed, type Ref, watch } from 'vue';
import { acceptHMRUpdate, defineStore } from 'pinia';
import { createdNamespacedStorageHelpers } from '../util/storage';
import AudioSources, { type AUDIO_SOURCE } from '../constants/audio-sources';
import { useRAF } from './raf';
import { useAudio } from './audio';
import { useSpotify } from './spotify';
import { useAudius } from './audius';
import { usePlaylist } from './playlist';
import { useViewport } from './viewport';
import { get } from '../util/api';

const API_ROOT = `${import.meta.env.VITE_API}/api`;
const ls = createdNamespacedStorageHelpers('5HT.VISUALIZER');
const SETTINGS_KEY = 'SETTINGS.V3';
const AUDIO_SOURCE_KEY = 'AUDIO_SOURCE';
const RADIO_SOURCES: any = {
  [AudioSources.RADIO_PARADISE]: `${API_ROOT}/radio/radio-paradise`,
  [AudioSources.KEXP]: `${API_ROOT}/radio/kexp`,
};

let metadataInterval: any;

export type Settings = {
  alwaysShowAlbumArtwork: boolean;
  alwaysShowTrackInfo: boolean;
  alwaysShowPlayerControls: boolean;
  shuffleDesigns: boolean;
  retina: boolean;
  shuffleInterval: {
    minutes: number;
    tracks: number;
    trackTick: number;
  };
  neon: boolean;
};

export const useVisualizer = defineStore('visualizer', () => {
  const raf = useRAF();
  const audio = useAudio();
  const playlist = usePlaylist();
  const spotify = useSpotify();
  const audius = useAudius();
  const viewport = useViewport();
  const source: Ref<AUDIO_SOURCE | null> = ref(null);
  const visible = ref(true);
  const menuOpen = ref(false);
  const sketchBrowserIndex = ref(ls.get('sketchBrowserIndex') || 0);
  const webglContextIndex = ref(0);
  const swipeIndex = ref(0);
  const totalMenuItems = computed(() => (source.value === 'AUDIUS' ? 3 : 2));
  const volume = computed(() => (source.value === 'SPOTIFY' ? 1 : audio.volume));
  const stream = computed(() => {
    if (source.value === 'SPOTIFY') return spotify.currentlyPlaying && spotify.playing ? spotify.stream : raf.time / 1000;
    if (source.value === 'AUDIUS') return audio.player.playing ? audio.stream : raf.time / 1000;
    return audio.stream || raf.time / 1000;
  });

  const sourceIcon = computed(() => {
    switch (source.value) {
      case 'SPOTIFY':
        return 'spotify';
      case 'AUDIUS':
        return 'audius';
      case 'MICROPHONE':
        return 'microphone';
      case 'RADIO_PARADISE':
        return 'radio-paradise';
      case 'KEXP':
        return 'kexp';
      case 'FILE':
        return 'upload';
      default:
        return 'sound';
    }
  });

  const settings: Ref<Settings> = ref({
    alwaysShowAlbumArtwork: false,
    alwaysShowTrackInfo: false,
    alwaysShowPlayerControls: false,
    shuffleDesigns: true,
    retina: false,
    shuffleInterval: {
      minutes: 5,
      tracks: 2,
      trackTick: 0,
    },
    neon: false,
  });

  const dpr = computed(() => {
    if (viewport.dpr === 1) return 1;
    return settings.value.retina ? 2 : 1;
  });

  watch(
    () => settings.value,
    val => {
      ls.set(SETTINGS_KEY, val);
    },
    { deep: true }
  );

  watch(
    () => sketchBrowserIndex.value,
    val => {
      ls.set('sketchBrowserIndex', val);
    }
  );

  function getMetadata() {
    get('radio/radio-paradise/now-playing').then(({ data }) => {
      const { title, artist, album, cover } = data;
      playlist.set([{ title, artist, album, artwork: cover }]);
    });
  }

  function selectSource(selectedSource: AUDIO_SOURCE) {
    if (!selectedSource || source.value === selectedSource) return;

    clearTimeout(metadataInterval);

    if (source.value !== null) {
      audio.cleanup();
      audius.cleanup();
      spotify.cleanup();
      playlist.set([]);
    }

    source.value = selectedSource;

    ls.set(AUDIO_SOURCE_KEY, source.value);

    if (source.value === AudioSources.SPOTIFY) {
      return spotify.initialize();
    }

    if (source.value === AudioSources.AUDIUS) {
      audio.initialize(source.value);
      return audius.initialize();
    }

    if (source.value === AudioSources.S3) {
      return audio.initialize(source.value);
    }

    audio.initialize(source.value);
    audio.player.src = RADIO_SOURCES[source.value];

    if (source.value !== 'RADIO_PARADISE') return;

    getMetadata();
    clearInterval(metadataInterval);
    metadataInterval = setInterval(() => {
      getMetadata();
    }, 5000);
  }

  function swipeTo(i: number) {
    swipeIndex.value = i;
  }

  function hydrate() {
    const saved = ls.get(SETTINGS_KEY);

    if (saved) {
      settings.value = saved;
      return;
    }

    settings.value = {
      alwaysShowAlbumArtwork: false,
      alwaysShowTrackInfo: false,
      alwaysShowPlayerControls: false,
      shuffleDesigns: true,
      retina: false,
      shuffleInterval: {
        minutes: 5,
        tracks: 2,
        trackTick: 0,
      },
      neon: false,
    };
  }

  return {
    selectSource,
    source,
    settings,
    visible,
    sketchBrowserIndex,
    webglContextIndex,
    swipeIndex,
    menuOpen,
    totalMenuItems,
    swipeTo,
    volume,
    stream,
    hydrate,
    dpr,
    sourceIcon,
  };
});

// if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useVisualizer, import.meta.hot));
