import { useDocument } from '../composables/useDocument';

export function createCanvas({ parent, dpr }: { parent: HTMLElement; dpr: number }): HTMLCanvasElement {
  const canvas = useDocument().createElement('canvas') as HTMLCanvasElement;
  const { width, height } = parent.getBoundingClientRect();
  sizeCanvas(canvas, { width, height, dpr });
  parent.appendChild(canvas);
  return canvas;
}

export function sizeCanvas(canvas: HTMLCanvasElement, { width, height, dpr }: { width: number; height: number; dpr: number }) {
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
}

export function createResizeObserver(element: HTMLElement, callback: ({ width, height }: { width: number; height: number }) => unknown) {
  const observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    callback({ width, height });
  });

  observer.observe(element);

  return observer;
}

let stack: any = [];

export function preloadImages(array: string[]) {
  for (var i = 0; i < array.length; i++) {
    var img = new Image();
    img.onload = function () {
      const index = stack.indexOf(this);
      if (index !== -1) stack.splice(index, 1);
    };
    stack.push(img);
    img.src = array[i];
  }
}

export function loadExternalScript(src: string) {
  return new Promise((resolve, reject) => {
    const script = useDocument().createElement('script') as HTMLScriptElement;
    script.onload = () => resolve(true);
    script.onerror = () => reject();
    script.src = src;
    useDocument().body.appendChild(script);
  });
}
