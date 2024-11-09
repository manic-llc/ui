import { acceptHMRUpdate, defineStore } from 'pinia';
import { ref, type Ref } from 'vue';
import { useWindow } from '../composables';

export type ModalType = 'ConfirmationModal' | 'ShareModal' | 'AudioSourceModal' | 'SketchModal' | 'AudioFileUploadModal' | 'CookieModal';

export const useModal = defineStore('modal', () => {
  const root = useWindow();
  const visible: Ref<boolean> = ref(false);
  const message: Ref<string | null> = ref(null);
  const component: Ref<ModalType | null> = ref(null);
  const _resolve: Ref<any> = ref(null);

  function confirm(msg: string) {
    message.value = msg;
    component.value = 'ConfirmationModal';
    visible.value = true;

    return new Promise(res => {
      _resolve.value = res;
    });
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') resolve(null);
  }

  function open(modalType: ModalType) {
    component.value = modalType;
    visible.value = true;

    root.addEventListener('keydown', onKeyDown as any);

    return new Promise(res => {
      _resolve.value = res;
    });
  }

  function resolve(value: any) {
    _resolve.value?.(value);
    visible.value = false;
    root.removeEventListener('keydown', onKeyDown as any);
  }

  return {
    message,
    visible,
    component,
    confirm,
    resolve,
    open,
  };
});

// if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useModal, import.meta.hot));
