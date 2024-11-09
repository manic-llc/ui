import { acceptHMRUpdate, defineStore } from 'pinia';
import { ref, computed, watch, toRaw, shallowRef, reactive } from 'vue';
import { v4 } from 'uuid';
import { type UniformTuple } from '../classes/Uniform';
import { put, post } from '../util/api';
import { createdNamespacedStorageHelpers } from '../util/storage';
import { useShaders } from './shaders';
import { useToast } from './toast';
import { useModal } from './modal';
import { useRAF } from './raf';
import { clone } from '../util/clone';
import { sample } from '../util/arrays';
import { randomNumber } from '../util/numbers';
import { interpolateUniforms, areUniformsEqual, normalizeSketch } from '../util/webgl';
import { useDocument } from '../composables/useDocument';
import { DEFAULT_BUFFER_SHADER, RAW_UTILS } from '../constants/glsl-defaults';
import { replaceAllSubstrings, replaceAllWords } from '../util/strings';
import { writeToClipboard } from '../util/clipboard';

const VARIANT_SHUFFLE_INTERVAL = 8000;
const VARIANT_SHUFFLE_TWEEN_DURATION = 4000;
const BUFFER_MAP: any = {
  1: 'A',
  2: 'B',
  3: 'C',
  4: 'D',
};

const doc = useDocument();
const ls = createdNamespacedStorageHelpers('5HT.EDITOR');

export const useEditor = defineStore('editor', () => {
  const shaders = useShaders();
  const toast = useToast();
  const modal = useModal();
  const tween = ref(v4());
  const raf = useRAF();
  const activeSketchReference = ref<any>(null);
  const activeSketch = ref<any>(null);
  const shader = ref(activeSketch.value?.shader || '');
  const uniforms = shallowRef<UniformTuple[]>([]);
  const buffers: any = reactive({
    A: null as any,
    B: null as any,
    C: null as any,
    D: null as any,
  });
  const tab = ref(0);
  const variant = ref(0);
  const sketchIndex = ref(0);
  const studyIndex = ref(0);
  const preview = ref(false);
  const variantShuffle = ref(true);
  const tweening = ref(false);
  const tweenProgress = ref(0);
  const newUniformKey: Ref<string | null> = ref(null);
  const tweeningUniforms = ref([]);
  const variantsDirty = computed(() => {
    return activeSketch.value?.variants?.map?.((variant: UniformTuple[], i: number) => {
      return !variant.every(
        (v, j) =>
          activeSketchReference.value?.variants?.[i]?.[j] &&
          areUniformsEqual(toRaw(v), toRaw(activeSketchReference.value?.variants?.[i]?.[j]))
      );
    });
  });
  const canSave = computed(() => !tweening.value && (shaderDirty.value || variantsDirty.value));

  const shaderDirty = computed(() => {
    return shader.value !== activeSketch.value?.shader;
  });

  const totalVariants = computed(() => {
    return activeSketch.value?.variants?.length || 0;
  });

  let interval: any = null;

  watch(
    () => variantShuffle.value,
    val => {
      clearInterval(interval);
      if (!val) return;
      interval = setInterval(() => {
        if (variant.value === totalVariants.value - 1) return tweenToVariant(0, VARIANT_SHUFFLE_TWEEN_DURATION);
        tweenToVariant(variant.value + 1, VARIANT_SHUFFLE_TWEEN_DURATION);
      }, VARIANT_SHUFFLE_INTERVAL);
    },
    { immediate: true }
  );

  watch(
    () => activeSketch.value,
    val => {
      if (val?.variants?.length < 2) {
        variantShuffle.value = false;
      }
    },
    {
      immediate: true,
    }
  );

  watch(
    () => variant.value,
    () => {
      newUniformKey.value = null;
    }
  );

  function persist() {
    ls.set('activeSketchReference', activeSketchReference.value);
    ls.set('activeSketch', activeSketch.value);
    ls.set('shader', shader.value);
    ls.set('uniforms', uniforms.value);
    ls.set('variant', variant.value);
  }

  function hydrate() {
    activeSketchReference.value = ls.get('activeSketchReference');
    activeSketch.value = ls.get('activeSketch');
    shader.value = ls.get('shader');
    uniforms.value = ls.get('uniforms');
    variant.value = ls.get('variant');
  }

  function tweenToVariant(i: number | any, duration = variantShuffle.value ? VARIANT_SHUFFLE_TWEEN_DURATION : 750) {
    const current = clone(uniforms.value);
    const target = typeof i === 'number' ? clone(activeSketch.value?.variants?.[i]) : clone(i);
    const iU = interpolateUniforms(toRaw(current), toRaw(target));

    if (!target) return;

    const self = typeof i !== 'number';

    tweening.value = true;
    variant.value = typeof i === 'number' ? i : variant.value;
    tweeningUniforms.value = target.reduce((acc, uniform, i) => {
      if (uniform[1] === 1 && uniform[2] !== current[i][2]) {
        acc.push(uniform[0]);
      }
      return acc;
    }, []);

    function tick({ progress }: { progress: number }) {
      const next = [...uniforms.value];

      tweenProgress.value = progress;

      iU(progress).forEach((d: UniformTuple, i: number) => {
        next[i][2] = d[2];
        next[i][3] = d[3];
        next[i][4] = d[4];
      });

      uniforms.value = next;

      if (self) activeSketch.value.variants[variant.value] = clone(uniforms.value);

      if (progress === 1) {
        tweening.value = false;
        tweenProgress.value = 0;
        tweeningUniforms.value = [];
        raf.remove(tween.value);
      }
    }

    raf.remove(tween.value);
    raf.add(
      {
        duration,
        tick,
      },
      tween.value
    );
  }

  function resetVariant() {
    const next = activeSketchReference.value.variants[variant.value];
    tweenToVariant(next);
  }

  function toggleVariantShuffle() {
    variantShuffle.value = !variantShuffle.value;
  }

  function housekeeping() {
    variantShuffle.value = false;
    variant.value = 0;
    clearInterval(interval);
    persist();
  }

  function shuffleUniforms() {
    const current = clone(uniforms.value);

    current.forEach((uniform: UniformTuple) => {
      if (uniform[6]) return;

      if (uniform[1] === 0) {
        const value = randomNumber(uniform[3], uniform[4]);
        uniform[2] = uniform[5] ? Math.round(value) : value;
      }

      if (uniform[1] === 1) {
        uniform[2] = !!Math.round(Math.random());
      }

      if (uniform[1] === 3) {
        uniform[2] = [randomNumber(), randomNumber(), randomNumber()];
      }
    });

    tweenToVariant(current);
  }

  function updateShader(val: string) {
    shader.value = val;
  }

  function updateUniforms({ value, key, i, name }: any) {
    const next = [...uniforms.value];

    const INDEX_MAP: any = {
      value: 2,
      min: 3,
      max: 4,
      int: 5,
      lock: 6,
    };

    if (key === 'rename') {
      next[i].splice(0, 1, name);
      uniforms.value = next;
      activeSketch.value.variants.forEach((variant: UniformTuple[]) => variant[i].splice(0, 1, name));
      return;
    }

    next[i].splice(INDEX_MAP[key], 1, value);

    uniforms.value = next;

    if (next[i][0] === newUniformKey.value) {
      activeSketch.value.variants.forEach((variant: UniformTuple[]) => variant[i].splice(INDEX_MAP[key], 1, value));
    } else {
      activeSketch.value.variants[variant.value][i].splice(INDEX_MAP[key], 1, value);
    }
  }

  function addUniform(uniform: UniformTuple) {
    if (activeSketch.value.variants.length > 1) {
      activeSketch.value.variants.forEach(variant => {
        variant.push(clone(uniform));
      });

      newUniformKey.value = uniform[0];
    }

    uniforms.value.push(uniform);
  }

  function deleteUniform(i: number) {
    const next = [...uniforms.value];
    activeSketch.value.variants[variant.value].splice(i, 1);
    next.splice(i, 1);
    uniforms.value = next;
  }

  function selectSketch(sketch: any, v = 0) {
    tab.value = 0;
    buffers.A = null;
    buffers.B = null;
    buffers.C = null;
    buffers.D = null;
    const normalized = normalizeSketch(sketch);
    raf.remove(tween.value);
    variant.value = v;
    activeSketchReference.value = clone(normalized);
    activeSketch.value = clone(normalized);
    shader.value = activeSketch.value?.shader;
    uniforms.value = clone(activeSketch.value?.variants?.[v]);
  }

  function addVariant() {
    const sketch = clone(activeSketch.value);
    sketch.variants.push(clone(uniforms.value));
    activeSketch.value = sketch;
    variant.value = sketch.variants.length - 1;
  }

  function deleteVariant(i: number) {
    const sketch = clone(activeSketch.value);
    sketch.variants.splice(i, 1);
    sketch.shader = shader.value;
    selectSketch(sketch);
  }

  function isolateVariant(i: number) {
    const sketch = clone(activeSketch.value);
    sketch.variants = [sketch.variants[i]];
    sketch.shader = shader.value;
    selectSketch(sketch);
  }

  function downloadSketch() {
    const sketch = clone(activeSketch.value);
    sketch.shader = clone(shader.value);
    sketch.variants[variant.value] = clone(uniforms.value);
    const a = doc.createElement('a') as HTMLAnchorElement;
    const str: string = JSON.stringify(sketch, null, 2);
    a.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(str));
    a.setAttribute('download', `sketch.${Date.now()}.json`);
    a.click();
  }

  function parseRAW() {
    let utils = Object.keys(RAW_UTILS).reduce((acc, key) => {
      if (shader.value.indexOf(key) !== -1) acc += RAW_UTILS[key];
      return acc;
    }, '');

    let string = shader.value;

    uniforms.value.forEach(uniform => {
      let value: any;

      switch (uniform[1]) {
        case 0:
          value = uniform[2].toFixed(3);
          break;
        case 3:
          value = `vec3(${uniform[2][0]}, ${uniform[2][1]}, ${uniform[2][2]})`;
          break;
        default:
          value = uniform[2];
          break;
      }

      string = replaceAllWords(string, uniform[0], value);
    });

    string = replaceAllWords(string, 'volume', '1.');

    return ['precision mediump float;\n\n', '#define PI 3.14159265359\n', '#define TWO_PI 2. * PI\n', utils, '\n', string].join('');
  }

  async function downloadRAW() {
    const string = parseRAW();

    if (await writeToClipboard(string)) {
      toast.message('Shader copied to clipboard.');
    } else {
      toast.error(`Couldn't copy shader.`);
    }
  }

  async function downloadShaderToy() {
    let string = parseRAW();

    string = replaceAllSubstrings(string, 'main ()', 'mainImage (out vec4 fragColor, vec2 fragCoord)');
    string = replaceAllSubstrings(string, 'main()', 'mainImage (out vec4 fragColor, vec2 fragCoord)');
    string = replaceAllWords(string, 'gl_FragCoord', 'fragCoord');
    string = replaceAllWords(string, 'gl_FragColor', 'fragColor');
    string = replaceAllWords(string, 'stream', 'iTime');
    string = replaceAllWords(string, 'time', 'iTime');
    string = replaceAllWords(string, 'resolution', 'iResolution');

    if (await writeToClipboard(string)) {
      toast.message('Shader copied to clipboard.');
    } else {
      toast.error(`Couldn't copy shader.`);
    }
  }

  async function share() {
    await modal.open('ShareModal');
  }

  async function save() {
    try {
      const sketch = clone(activeSketch.value);
      sketch.variants[variant.value] = uniforms.value;
      sketch.shader = shader.value;
      const { data } = await put(`iterations`, sketch);
      selectSketch(data);
      toast.message('Iteration updated successfully.');
      // const { success } = await post('media/thumbnails', { image: thumbnails.generateThumbnail(sketch), imageId: sketch._id });
      // if (success) {
      //   shaders.patchVersions([data]);
      // }
    } catch (e) {
      console.log(e);
    }
  }

  function print() {
    // thumbnails.generatePrint({ shader: shader.value, variants: [uniforms.value], _id: activeSketch.value._id });
  }

  async function saveNewIteration() {
    try {
      const variants = clone(activeSketch.value.variants);
      variants[variant.value] = clone(uniforms.value);
      const { data } = (await post('iterations', {
        shader: shader.value,
        variants,
        study: activeSketch.value.study,
        author: activeSketch.value.author,
      })) as any;
      const { success } = await post('media/thumbnails', { image: thumbnails.generateThumbnail(data), imageId: data._id });
      if (!success) {
        toast.error('Failed to save iteration.');
        return;
      }
      shaders.patchVersions([data]);
      selectSketch(data);
      toast.message('Iteration saved successfully.');
    } catch (e) {
      console.log(e);
    }
  }

  function saveNewStudy() {
    console.log('new study');
  }

  function undoChanges() {
    selectSketch(activeSketchReference.value);
  }

  async function createNew() {
    if (canSave.value) {
      const answer = await modal.confirm('You have unsaved changes. Continue?');

      if (answer) {
        console.log('create new');
        return;
      }

      return;
    }

    console.log('create new');
  }

  async function togglePublicity() {
    if (activeSketch.value?.public) {
      if (await modal.confirm('Are you sure you want to unpublish this sketch?')) {
        unpublish();
      }
    } else {
      if (await modal.confirm('Are you sure you want to publish this sketch?')) {
        publish();
      }
    }
  }

  async function publish() {
    const sketch = clone(activeSketch.value);
    sketch.public = true;

    if (!sketch.study) {
      sketch.study = '66f2980c92cc9d303e380427';
    }

    try {
      const { data, success } = await post('iterations/publish', sketch);
      // const { success } = await post('media/thumbnails', { image: thumbnails.generateThumbnail(data), imageId: data._id });

      if (!success) {
        toast.error('Failed to publish sketch.');
        return;
      }

      shaders.patchVersions([data]);
      selectSketch(data);
      await shaders.fetch();
      toast.message('Sketch published successfully.');
    } catch (e) {
      console.log(e);
    }
  }

  async function unpublish() {
    try {
      const { data } = await post(`iterations/unpublish/${activeSketch.value._id as ':id'}`, {});
      selectSketch(data);
      await shaders.fetch();
      toast.message('Sketch unpublished successfully.');
    } catch (e) {
      console.log(e);
    }
  }

  async function selectRandomSketch() {
    const sketch = sample(shaders.published);
    selectSketch(sketch);
  }

  function patchUniforms({ uniform, i }) {
    const sketch = clone(activeSketch.value);
    sketch.variants.forEach(variant => {
      variant.splice(i, 1, uniform);
    });
    activeSketch.value = sketch;
  }

  function initializeBuffer() {
    if (buffers.D) return;

    const buffer = {
      shader: DEFAULT_BUFFER_SHADER,
    };

    if (buffers.C) {
      buffers.D = buffer;
      tab.value = 4;
    } else if (buffers.B) {
      buffers.C = buffer;
      tab.value = 3;
    } else if (buffers.A) {
      buffers.B = buffer;
      tab.value = 2;
    } else {
      buffers.A = buffer;
      tab.value = 1;
    }
  }

  function destroyBuffer(key: 'A' | 'B' | 'C' | 'D') {
    buffers[key] = null;
  }

  function updateTab(e: string) {
    if (tab.value === 0) {
      shader.value = e;
    } else {
      buffers[BUFFER_MAP[tab.value]].shader = e;
    }
  }

  return {
    shader,
    uniforms,
    updateShader,
    updateUniforms,
    addUniform,
    deleteUniform,
    tweenToVariant,
    variant,
    activeSketch,
    activeSketchReference,
    selectSketch,
    variantsDirty,
    shaderDirty,
    addVariant,
    downloadSketch,
    downloadRAW,
    downloadShaderToy,
    deleteVariant,
    shuffleUniforms,
    sketchIndex,
    studyIndex,
    toggleVariantShuffle,
    variantShuffle,
    persist,
    hydrate,
    housekeeping,
    share,
    save,
    print,
    saveNewIteration,
    saveNewStudy,
    canSave,
    tweening,
    tweenProgress,
    tweeningUniforms,
    undoChanges,
    isolateVariant,
    createNew,
    preview,
    publish,
    unpublish,
    togglePublicity,
    newUniformKey,
    patchUniforms,
    selectRandomSketch,
    resetVariant,
    buffers,
    initializeBuffer,
    destroyBuffer,
    tab,
    updateTab,
  };
});

// if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useEditor, import.meta.hot));
