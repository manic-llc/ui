import { ref, type Ref } from 'vue';
import { acceptHMRUpdate, defineStore } from 'pinia';
import { createdNamespacedStorageHelpers } from '../util/storage';
import data from '../data/published.json';

const ls = createdNamespacedStorageHelpers('5HT.SHADERS');

export const useShaders = defineStore('shaders', () => {
  const published: Ref<any> = ref([]);
  const versions = ref(ls.get('VER') || {});

  async function fetch() {
    published.value = published.value.length ? published.value : data;
    patchVersions(published.value);
  }

  function patchVersions(v: any[]) {
    v.forEach(({ _id, __v }: { _id: string; __v: number }) => {
      versions.value[_id] = __v;
    });
    ls.set('VER', versions.value);
  }

  return {
    fetch,
    published,
    versions,
    patchVersions,
  };
});

// if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useShaders, import.meta.hot));
