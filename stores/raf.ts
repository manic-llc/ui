import { acceptHMRUpdate, defineStore } from 'pinia';
import { type Reactive, ref, type Ref, reactive, computed, shallowRef, watch } from 'vue';
import { ease } from '../util/ease';
import { useWindow } from '../composables/useWindow';
import { v4 } from 'uuid';

export type AnimationTick = ({ now, progress, elapsed }: { now: DOMHighResTimeStamp; progress: number; elapsed: number }) => void;

export type Animation = {
  tick: AnimationTick;
  duration?: number;
  easing?: (i: number) => number;
  start?: number;
  id?: string;
};

export const useRAF = defineStore('raf', () => {
  const root = useWindow();
  const queue: any = shallowRef([]);
  const map: any = shallowRef({});
  let raf: any = 0;
  let last: any = null;
  let frames: any[] = [];
  const time: Ref<number> = ref(root.performance.now());
  let frameTick: any = false;
  const frameRate: any = ref(60);
  const promises: any = {};

  function add(animation: Animation, id: string | null = null) {
    const definition: Animation = {
      easing: ease,
      start: root.performance.now(),
      ...animation,
      id: id || v4(),
    };

    if (typeof id === 'string') {
      map.value[id] = definition;
      return new Promise(resolve => {
        promises[id] = resolve;
      });
    }

    queue.value.push(definition);

    return new Promise(resolve => {
      promises[definition.id as string] = resolve;
    });
  }

  function remove(id: string) {
    delete map.value[id];
  }

  function start() {
    stop();
    raf = root.requestAnimationFrame(tick);
  }

  function stop() {
    root.cancelAnimationFrame(raf);
  }

  function frame(now: DOMHighResTimeStamp) {
    if (last === null) {
      last = now;
      frameTick = true;
      return;
    }

    if (frameTick === false) {
      const boundary = 180;
      const len = frames.length;
      frames.push(1000 / (now - last));
      if (len > boundary) {
        const diff = len - boundary;
        for (let i = 0; i < diff; i++) frames.shift();
      }
      let sum = 0;
      for (let i = 0; i < len; i++) sum += frames[i];
      frameRate.value = Math.floor(sum / len);
    } else {
      frameTick = false;
    }

    last = now;
  }

  function tick(now: DOMHighResTimeStamp) {
    time.value = root.performance.now();

    queue.value.forEach((animation: Animation, i: number) => {
      const elapsed = now - (animation?.start || 0);
      const progress = elapsed / (animation.duration || 1);
      const eased = animation.easing?.(progress) as number;
      animation.tick?.({ now, progress: eased, elapsed });
      if (eased === 1) {
        queue.value.splice(i, 1);
        promises?.[animation.id as string]?.();
      }
    });

    Object.keys(map.value).forEach((key: string) => {
      const animation = map.value[key];

      let progress = 0;

      if (typeof animation.duration === 'number') {
        const elapsed = now - (animation?.start || 0);
        progress = elapsed / (animation.duration || 1);
      }

      const eased = animation.easing?.(progress) as number;

      animation.tick?.({ now, progress: eased });

      if (eased === 1) {
        delete map.value[key];
        promises?.[animation.id]?.();
      }
    });

    frame(now);

    raf = root.requestAnimationFrame(tick);
  }

  return {
    add,
    remove,
    start,
    stop,
    time,
    map,
    queue,
    frameRate,
    $reset() {
      stop();
      frames = [];
      last.value = root.performance.now();
    },
  };
});

// if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useRAF, import.meta.hot));
