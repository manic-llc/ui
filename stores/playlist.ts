import { type Reactive, ref, type Ref, reactive, computed, watch } from 'vue';
import { defineStore, acceptHMRUpdate } from 'pinia';
import { createdNamespacedStorageHelpers } from '../util/storage';
import { useVisualizer } from './visualizer';
import { useAudio } from './audio';
import { useViewport } from './viewport';
import { preloadImages } from '../util/dom';
import { useNavigator } from '../composables/useNavigator';
import { useAudius } from './audius';
import { useAudiusSearch } from './audius-search';

const ls = createdNamespacedStorageHelpers('5HT.PLAYLIST');

export const usePlaylist = defineStore('playlist', () => {
  const nav = useNavigator();
  const visualizer = useVisualizer();
  const audius = useAudius();
  const search = useAudiusSearch();
  const viewport = useViewport();
  const audio = useAudio();
  const tracks: Ref<any[]> = ref(ls.get('tracks') || []);
  const index: Ref<number> = ref(ls.get('index'));
  const length = computed(() => tracks.value.length);
  const currentTrack = computed(() => tracks.value?.[index.value] || null);

  function previous() {
    if (index.value > 0) {
      index.value--;
      ls.set('index', index.value);
    }
  }

  function next() {
    if (index.value < length.value - 1) {
      index.value++;
      ls.set('index', index.value);
    }
  }

  function set(data: any[]) {
    index.value = 0;
    tracks.value = data;
    ls.set('tracks', tracks.value);
    ls.set('index', index.value);
    visualizer.menuOpen = false;
    audius.selectedPlaylist = null;
    audius.selectingPlaylist = false;
    audius.trendingOpen = false;
    search.searching = false;
    search.query = '';
    viewport.forceHide();

    switch (visualizer.source) {
      case 'AUDIUS':
        preloadImages(data.map(v => v.artwork['1000x1000'] || v.artwork['_1000x1000']));
        break;
      case 'SPOTIFY':
        break;
      default:
        return;
    }
  }

  nav.mediaSession?.setActionHandler('previoustrack', function () {
    previous();
  });

  nav.mediaSession?.setActionHandler('nexttrack', function () {
    next();
  });

  nav.mediaSession?.setActionHandler('pause', function () {
    audio.pause();
  });

  nav.mediaSession?.setActionHandler('play', function () {
    audio.play();
  });

  return {
    tracks,
    index,
    length,
    currentTrack,
    previous,
    next,
    set,
  };
});

// if ((import.meta as any)?.hot?.accept && typeof acceptHMRUpdate !== 'undefined') {
//   (import.meta as any).hot.accept(acceptHMRUpdate?.(usePlaylist, (import.meta as any).hot));
// }
