import { onMounted, onBeforeUnmount } from 'vue';

export function useForm(formRef: Ref, callbacks: any) {
  function onSubmit(e) {
    e.preventDefault();
    const data = new FormData(formRef.value);
    const values: any = {};
    for (let [key, value] of data.entries()) {
      values[key] = value;
    }
    callbacks?.submit?.(values);
  }

  onMounted(() => {
    formRef.value.addEventListener('submit', onSubmit);
  });

  onBeforeUnmount(() => {
    formRef.value.removeEventListener('submit', onSubmit);
  });
}
