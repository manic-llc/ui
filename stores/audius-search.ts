import { acceptHMRUpdate, defineStore } from 'pinia';
import { useViewport } from './viewport';
import { ref, type Ref, shallowRef } from 'vue';

const ROOT = 'https://discoveryprovider.audius.co/v1/full/search/autocomplete';

export const useAudiusSearch = defineStore('audius-search', () => {
  const viewport = useViewport();
  const query = ref('');
  const focused = ref(false);
  const timeout = shallowRef();
  const users = ref([]);
  const playlists = ref([]);
  const albums = ref([]);
  const tracks = ref([]);
  const limit = ref(5);
  const searching = ref(false);
  const verticalOffset = ref(null);
  const searched = ref(false);

  watch(
    () => query.value,
    val => {
      if (val.length < 2) {
        users.value = [];
        playlists.value = [];
        albums.value = [];
        tracks.value = [];
        searching.value = false;
        searched.value = false;
      }

      clearTimeout(timeout.value);

      timeout.value = setTimeout(async () => {
        if (val.length < 2) return;
        try {
          viewport.load();
          searching.value = true;
          const { data } = await fetch(`${ROOT}?limit=${limit.value}&offset=0&query=${val}`).then(r => r.json());
          users.value = data.users.map(v => ({ ...v, type: 'USER', title: v.name }));
          playlists.value = data.playlists.map(v => ({ ...v, type: 'PLAYLIST', title: v.playlist_name }));
          albums.value = data.albums.map(v => ({ ...v, type: 'ALBUM', title: v.playlist_name }));
          tracks.value = data.tracks.map(v => ({ ...v, type: 'TRACK' }));
          viewport.loading = false;
          searched.value = true;
        } catch (e) {
          console.log(e);
        }
      }, 350);
    }
  );

  return {
    query,
    focused,
    users,
    playlists,
    albums,
    searched,
    searching,
    tracks,
    verticalOffset,
  };
});

// if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useAudiusSearch, import.meta.hot));
