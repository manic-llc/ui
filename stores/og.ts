import { type Reactive, ref, type Ref, reactive, computed, watch } from 'vue';
import { acceptHMRUpdate, defineStore } from 'pinia';
import { useDocument } from '../composables/useDocument';
import Shader from '../classes/Shader';

const doc = useDocument();

export const useOg = defineStore('og', () => {
  const sketch = ref(null);
  const image: Ref<null | string> = ref(null);
  const _resolve = ref();

  function generateImage(data: any) {
    const div = doc.createElement('div') as HTMLElement;

    div.style.width = `1200px`;
    div.style.height = `630px`;
    div.style.position = 'fixed';
    div.style.bottom = '0px';
    div.style.right = '0px';
    div.style.opacity = '0';
    div.style.zIndex = '-10';
    div.style.pointerEvents = 'none';

    doc.body.appendChild(div);

    console.log(data);

    return new Promise(resolve => {
      const shader = new Shader({
        fragmentShader: data.shader,
        uniforms: data.variants[0],
        animate: false,
        dpr: 1,
        parent: div,
        debug: true,
        onError(e, instance) {
          console.log(e, instance);
        },
      });

      shader.tick();

      resolve(shader.thumbnail);

      shader.destroy();
      div.remove();
    });
  }

  function resolve(data) {
    image.value = data;
    _resolve.value?.(data);
    // sketch.value = null;
    // image.value = null;
  }

  return {
    generateImage,
    sketch,
    image,
    resolve,
  };
});

// if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useOg, import.meta.hot));
