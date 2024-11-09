import { ref, type Ref } from 'vue';
import { acceptHMRUpdate, defineStore } from 'pinia';
import { pause } from '../util/time';

const TOAST_TIMEOUT = 4000;

export const useToast = defineStore('toast', () => {
  const type: Ref<'message' | 'error' | null> = ref(null);
  const visible = ref(false);
  const text: Ref<null | string> = ref(null);
  const image: Ref<null | string> = ref(null);

  async function message(msg: string, imgSrc: string | null = null) {
    type.value = 'message';
    text.value = msg;
    visible.value = true;
    image.value = imgSrc;
    await pause(TOAST_TIMEOUT);
    visible.value = false;
  }

  async function error(err: string, imgSrc: string | null = null) {
    type.value = 'error';
    text.value = err;
    visible.value = true;
    image.value = imgSrc;
    await pause(TOAST_TIMEOUT);
    visible.value = false;
  }

  return {
    visible,
    type,
    text,
    image,
    message,
    error,
  };
});

// if ((import.meta as any).hot) (import.meta as any).hot.accept(acceptHMRUpdate(useToast, (import.meta as any).hot));
