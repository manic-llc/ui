import { type Reactive, ref, type Ref, reactive, computed, watch } from 'vue';
import { acceptHMRUpdate, defineStore } from 'pinia';
import { navigate } from 'vike/client/router';

export const useNavigation = defineStore('navigation', () => {
  const study: Ref<any> = ref(null);

  function selectStudy(datum: any) {
    study.value = datum;
  }

  function redirect() {
    if (study.value?._id) {
      navigate(`/studies/${study.value?._id}`);
      study.value = null;
    }
  }

  return {
    selectStudy,
    study,
    redirect,
  };
});

// if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useNavigation, import.meta.hot));
