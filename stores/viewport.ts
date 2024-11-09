import { acceptHMRUpdate, defineStore } from 'pinia';
import { ref, type Ref, computed, reactive, watch } from 'vue';
import { interpolateNumber } from 'd3-interpolate';
import { useWindow } from '../composables/useWindow';
import { useRAF } from './raf';
import { useAudius } from './audius';
import { useAudiusSearch } from './audius-search';
import { detectFullscreen } from '../util/browser';
import { useDocument } from '../composables/useDocument';
import { easeInOut } from '../util/ease';

const MOUSE_TIMEOUT = 1750;
const RAF_MOUSE_KEY = 'mouse';

export const useViewport = defineStore('viewport', () => {
  const doc = useDocument();
  const search = useAudiusSearch();
  const root = useWindow();
  const raf = useRAF();
  const width: Ref<number> = ref(root.innerWidth);
  const height: Ref<number> = ref(root.innerHeight);
  const mobile = computed(() => {
    return (width.value < 1024 && height.value < 768) || (width.value < 768 && height.value < 1024);
  });

  const orientation = computed(() => {
    if (width.value > height.value) return 'LANDSCAPE';
    return 'PORTRAIT';
  });

  const mobileLandscape = computed(() => {
    return mobile.value && orientation.value === 'LANDSCAPE';
  });

  const mobilePortrait = computed(() => {
    return mobile.value && orientation.value === 'PORTRAIT';
  });

  const dpr: Ref<number> = ref(root.devicePixelRatio);
  const limitedDpr = computed(() => Math.min(2, dpr.value));
  const toolTipActions = ref<any[]>([]);
  const toolTipVisible = ref<boolean>(false);
  const toolTipPosition = ref<number[]>([0, 0]);
  const loading = ref(true);
  const loadingIsTransparent = ref(false);
  const fullScreenAvailable = ref(detectFullscreen());
  const fullScreen = ref(!!doc.fullscreenElement);
  const userHasInteracted = ref(false);
  const hideUI = ref(false);
  const touch = ref(false);
  const forceHidden = ref(false);
  const viewportOffset = ref(0);
  const audius = useAudius();
  const pointer = ref([
    [0, 0],
    [0, 0],
  ]);
  const selectionBox = computed(() => {
    const [x1, y1] = pointer.value[0];
    const [x2, y2] = pointer.value[1];
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const width = Math.max(x1, x2) - x;
    const height = Math.max(y1, y2) - y;
    return {
      x,
      y,
      width,
      height,
    };
  });

  watch(
    () => audius.trendingOpen,
    val => {
      if (!val && mobile.value) {
        pointerMove();
      }
    }
  );

  const elementHeights = reactive({
    nav: 0,
    audiusLibrary: 0,
  });

  const offsets = computed(() => {
    return {
      navOffset: height.value - elementHeights.nav,
      audiusLibraryOffset: height.value - elementHeights.nav - elementHeights.audiusLibrary,
    };
  });

  const wheel: any = reactive({
    delta: 0,
    y: 0,
    scrollTop: 0,
    direction: 'DOWN',
  });

  const mouse = reactive({
    position: [width.value / 2, height.value / 2],
    progress: 0,
    showProgress: false,
  });

  watch(
    () => hideUI.value,
    val => {
      if (!val) {
        wheel.direction = null;
        wheel.scrollTop = 0;
      }
    }
  );

  let timeout: any;

  async function forceHide() {
    if (audius.selectedPlaylist || audius.selectingPlaylist || search.focused || search.searching) return;
    hideUI.value = true;
    forceHidden.value = true;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      forceHidden.value = false;
    }, MOUSE_TIMEOUT);
  }

  function setCSSVars() {
    doc.documentElement.style.setProperty('--viewport-width', `${width.value}px`);
    doc.documentElement.style.setProperty('--viewport-height', `${height.value}px`);
  }

  function update() {
    width.value = root.innerWidth;
    height.value = root.innerHeight;
    dpr.value = root.devicePixelRatio;
    setCSSVars();
  }

  async function showToolTip(actions: any[], [x, y1]: number[]) {
    const element = doc.getElementById('tooltip') as HTMLElement;
    toolTipActions.value = actions;
    toolTipVisible.value = true;
    await nextTick();
    const y = Math.min(height.value - element.offsetHeight - 15, y1);
    toolTipPosition.value = [x, y];
  }

  let resetting = false;

  async function pointerMove(x: number = mouse.position[0], y: number = mouse.position[1]) {
    if (resetting) return;

    if ((mobile.value && audius.trendingOpen) || audius.selectedPlaylist || audius.selectingPlaylist) {
      forceHidden.value = false;
      hideUI.value = false;
      raf.remove(RAF_MOUSE_KEY);
      raf.remove(RAF_MOUSE_KEY + '-2');
      return;
    }

    if (forceHidden.value) {
      hideUI.value = true;
      return;
    }

    const iProgress = interpolateNumber(mouse.progress, 1);

    mouse.position = [x, y];
    hideUI.value = false;

    raf.remove(RAF_MOUSE_KEY);
    raf.remove(RAF_MOUSE_KEY + '-2');

    const durationA = MOUSE_TIMEOUT * 0.3;
    const durationB = MOUSE_TIMEOUT * 0.7;

    raf.remove('M-A');
    raf.remove('M-B');

    resetting = true;

    await raf.add(
      {
        duration: durationA,
        easing: easeInOut,
        tick({ progress }) {
          mouse.progress = iProgress(progress);
        },
      },
      'M-A'
    );

    resetting = false;
    if (search.focused || search.searching) return;

    raf.add(
      {
        duration: durationB,
        easing: easeInOut,
        tick({ progress }) {
          mouse.progress = 1 - progress;
          if (progress === 1) {
            if (
              search.focused ||
              search.searching ||
              (mobile.value && audius.trendingOpen) ||
              audius.selectedPlaylist ||
              audius.selectingPlaylist
            ) {
              forceHidden.value = false;
              hideUI.value = false;
              raf.remove(RAF_MOUSE_KEY);
              raf.remove(RAF_MOUSE_KEY + '-2');
              return;
            }

            hideUI.value = true;
          }
        },
      },
      'M-B'
    );
  }

  function hideToolTip() {
    toolTipVisible.value = false;
  }

  function load(transparent = true) {
    loading.value = true;
    loadingIsTransparent.value = transparent;
  }

  function onFullscreen() {
    fullScreen.value = !!doc.fullscreenElement;
  }

  function init() {
    doc.addEventListener('fullscreenchange', onFullscreen);
    doc.addEventListener('webkitfullscreenchange', onFullscreen);
    doc.addEventListener('mozfullscreenchange', onFullscreen);
    doc.addEventListener('MSFullscreenChange', onFullscreen);

    setCSSVars();

    update();

    root.addEventListener('resize', update);

    root.matchMedia('(display-mode: fullscreen)')?.addEventListener?.('change', ({ matches }) => {
      fullScreen.value = matches;
    });

    'ontouchstart' in root &&
      (() => {
        touch.value = true;

        root.addEventListener(
          'touchstart',
          ({ pageX, pageY }: any) => {
            pointerMove(pageX, pageY);
          },
          { passive: true }
        );

        root.addEventListener(
          'touchmove',
          ({ pageX, pageY }: any) => {
            pointerMove(pageX, pageY);
          },
          { passive: true }
        );
      })();

    !('ontouchstart' in root) &&
      (() => {
        root.addEventListener(
          'pointerdown',
          ({ pageX, pageY }: any) => {
            pointer.value[0] = [pageX, pageY];
            pointerMove(pageX, pageY);
          },
          { passive: true }
        );

        root.addEventListener(
          'pointerup',
          ({ pageX, pageY }: any) => {
            pointer.value[1] = [pageX, pageY];
          },
          { passive: true }
        );

        root.addEventListener(
          'pointermove',
          ({ pageX, pageY }: any) => {
            pointerMove(pageX, pageY);
          },
          { passive: true }
        );

        root.addEventListener(
          'wheel',
          (e: any) => {
            pointerMove();
          },
          { passive: true }
        );
      })();

    loading.value = false;
  }

  return {
    width,
    height,
    update,
    mobile,
    orientation,
    mobileLandscape,
    mobilePortrait,
    dpr,
    limitedDpr,
    toolTipActions,
    toolTipVisible,
    toolTipPosition,
    showToolTip,
    hideToolTip,
    loading,
    fullScreen,
    fullScreenAvailable,
    userHasInteracted,
    hideUI,
    wheel,
    forceHide,
    pointerMove,
    elementHeights,
    offsets,
    forceHidden,
    loadingIsTransparent,
    load,
    selectionBox,
    mouse,
    touch,
    init,
    viewportOffset,
    $reset() {
      root.removeEventListener('resize', update);
    },
  };
});

// if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useViewport, import.meta.hot));
