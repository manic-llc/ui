import Plane from '@wearemanic/ui/classes/Plane';
import Uniform, { type UniformTuple, type FloatUniform } from '@wearemanic/ui/classes/Uniform';
import { interpolateNumber } from 'd3-interpolate';
import { clone } from './clone';
import { replaceAllSubstrings, replaceAllWords } from './strings';

export function createWebGL2Context(
  canvas: HTMLCanvasElement,
  config?: {
    alpha?: boolean;
    antialias?: boolean;
    powerPreference?: 'default' | 'high-performance';
    preserveDrawingBuffer?: boolean;
    depth?: boolean;
  }
): WebGL2RenderingContext {
  return canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    depth: false,
    ...(config || {}),
  }) as WebGL2RenderingContext;
}

export function compileShader({
  ctx,
  type,
  source,
  program,
}: {
  ctx: WebGL2RenderingContext;
  type: 'VERTEX_SHADER' | 'FRAGMENT_SHADER';
  source: string;
  program: WebGLProgram;
}) {
  const shader = ctx.createShader(ctx[type]) as WebGLShader;

  try {
    ctx.shaderSource(shader, source);
    ctx.compileShader(shader);

    // const success = ctx.getShaderParameter(shader, ctx.COMPILE_STATUS);

    // if (!success) {
    //   const log = ctx.getShaderInfoLog(shader);
    //   return {
    //     success: false,
    //     error: log,
    //   };
    // }

    ctx.attachShader(program, shader);

    return {
      success: true,
      shader,
    };
  } catch (e) {
    return {
      success: false,
      error: e,
    };
  }
}

export function buildUniforms({
  ctx,
  program,
  uniforms,
}: {
  ctx: WebGL2RenderingContext;
  program: WebGLProgram;
  uniforms: UniformTuple[];
}) {
  return uniforms.reduce((acc: Record<string, Uniform>, uniform: UniformTuple) => {
    acc[uniform[0]] = new Uniform(ctx, program, uniform);
    return acc;
  }, {});
}

export function initializeFrameBuffers(ctx: WebGL2RenderingContext) {
  const numPasses = 4;
  const framebuffers: WebGLFramebuffer[] = [];
  const textures: WebGLTexture[] = [];

  for (let i = 0; i < numPasses; i++) {
    const { framebuffer, texture } = createFramebuffer(ctx);
    framebuffers.push(framebuffer as WebGLFramebuffer);
    textures.push(texture as WebGLTexture);
  }

  return { framebuffers, textures };
}

export type WebGLApp = {
  plane: Plane;
  program: WebGLProgram;
  render: () => void;
  uniforms: Record<string, Uniform>;
  vertexShader: string;
  fragmentShader: string;
  cleanup: () => void;
};

export function createWebGL2App({
  ctx,
  vertexShader,
  fragmentShader,
  uniforms,
  onError,
  onSuccess,
}: {
  ctx: WebGL2RenderingContext;
  vertexShader: string;
  fragmentShader: string;
  uniforms: UniformTuple[];
  onError?: any;
  onSuccess?: any;
}): WebGLApp | null {
  const program = ctx.createProgram() as WebGLProgram;

  const vertex = compileShader({
    ctx,
    type: 'VERTEX_SHADER',
    source: vertexShader,
    program,
  });

  if (!vertex.success) {
    onError?.(vertex.error);
    return null;
  }

  const fragment = compileShader({
    ctx,
    type: 'FRAGMENT_SHADER',
    source: fragmentShader,
    program,
  });

  if (!fragment.success) {
    onError?.(fragment.error);
    return null;
  }

  ctx.linkProgram(program);

  // if (!ctx.getProgramParameter(program, ctx.LINK_STATUS)) {
  //   const error = ctx.getProgramInfoLog(program);
  //   onError?.(error);
  //   return null;
  // }

  ctx.useProgram(program);
  ctx.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  const uniformReferences = buildUniforms({ ctx, uniforms, program });
  const plane = new Plane(ctx);

  ctx.enableVertexAttribArray(0);
  ctx.vertexAttribPointer(ctx.getAttribLocation(program, 'position'), 2, ctx.FLOAT, false, 0, 0);

  onSuccess?.();

  return {
    plane,
    program,
    render: () => plane.render(),
    uniforms: uniformReferences,
    vertexShader,
    fragmentShader,
    cleanup() {
      ctx.deleteShader(vertex?.shader as WebGLShader);
      ctx.deleteShader(fragment?.shader as WebGLShader);
      ctx.deleteProgram(program);
    },
  };
}

export function createFramebuffer(ctx: WebGLRenderingContext) {
  const framebuffer = ctx.createFramebuffer();

  ctx.bindFramebuffer(ctx.FRAMEBUFFER, framebuffer);

  const texture = ctx.createTexture();

  ctx.bindTexture(ctx.TEXTURE_2D, texture);
  ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.canvas.width, ctx.canvas.height, 0, ctx.RGBA, ctx.UNSIGNED_BYTE, null);

  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
  ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);

  ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, texture, 0);

  return { framebuffer, texture };
}

type Dimension = ((i: number) => any)[];

export function interpolateUniforms(a: UniformTuple[], b: UniformTuple[]) {
  const dimensions: Dimension[] = [];

  a?.forEach?.((from, i: number) => {
    const to = b[i];
    const dimension: Dimension = [() => to[0], () => to[1]];

    if (from[1] === 0 && to[1] === 0) {
      const iVal = interpolateNumber(from[2], to[2]);
      const iMin = interpolateNumber(from[3], to[3]);
      const iMax = interpolateNumber(from[4], to[4]);
      dimension.push((i: number) => iVal(i));
      dimension.push((i: number) => iMin(i));
      dimension.push((i: number) => iMax(i));
    } else if (from[1] === 1 && to[1] === 1) {
      dimension.push(() => to[2]);
      dimension.push(() => to[3]);
      dimension.push(() => to[4]);
    } else if (from[1] === 3 && to[1] === 3) {
      const [r1, g1, b1] = from[2];
      const [r2, g2, b2] = to[2];
      const iR = interpolateNumber(r1, r2);
      const iG = interpolateNumber(g1, g2);
      const iB = interpolateNumber(b1, b2);
      dimension.push((i: number) => [iR(i), iG(i), iB(i)]);
      dimension.push(() => to[3]);
      dimension.push(() => to[4]);
    }

    dimension.push(() => to[5]);
    dimension.push(() => to[6]);
    dimensions.push(dimension);
  });

  return (t: number) => dimensions.map(d => d.map(v => v(t)));
}

export function areUniformsEqual(a: UniformTuple, b: UniformTuple) {
  if (!a || !b || a[0] !== b[0] || a[1] !== b[1]) return false;
  const base = a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6];
  if (a[1] === 0 || a[1] === 1) return a[2] === b[2] && base;
  if (a[1] === 3) return a[2][0] === b[2][0] && a[2][1] === b[2][1] && a[2][2] === b[2][2] && base;
}

export function normalizeSketch(sketch: { shader: string; variants: UniformTuple[] }) {
  if (!sketch) return null;

  const normalized = clone(sketch);

  normalized.variants.forEach((variant: UniformTuple[]) => {
    variant.forEach(uniform => {
      if (uniform[1] === 0) {
        uniform[2] = parseFloat(`${uniform[2]}`);
        uniform[3] = parseFloat(`${uniform[3]}`);
        uniform[4] = parseFloat(`${uniform[4]}`);

        if (typeof uniform[5] !== 'boolean') (uniform as FloatUniform)[5] = false;
      } else {
        uniform[3] = null;
        uniform[4] = null;
        uniform[5] = null;
      }

      if (uniform[1] === 3) {
        uniform[2][0] = parseFloat(`${uniform[2][0]}`);
        uniform[2][1] = parseFloat(`${uniform[2][1]}`);
        uniform[2][2] = parseFloat(`${uniform[2][2]}`);
      }

      if (typeof uniform[6] !== 'boolean') uniform[6] = false;
    });
  });

  return normalized;
}

// webgl => webgl2
export function upgradeShader(shader: string) {
  let string = shader;

  string = replaceAllSubstrings(string, 'void main ()', 'out vec4 fragColor;\n\nvoid main ()');
  string = replaceAllSubstrings(string, 'void main()', 'out vec4 fragColor;\n\nvoid main ()');
  string = replaceAllWords(string, 'gl_FragColor', 'fragColor');

  return string;
}
