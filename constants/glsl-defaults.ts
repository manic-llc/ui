import Uniform, { type UniformTuple } from '@wearemanic/ui/classes/Uniform';
import { k_hue, k_kale, k_orb, k_rainbow, k_rotate2d, k_swap, k_uv } from './glsl-util';

export const DEFAULT_VERTEX_SHADER = /*glsl*/ `attribute vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

export const DEFAULT_BUFFER_SHADER = /*glsl*/ `void main () {
  gl_FragColor = vec4(0., 0., 1., 1.);
}`;

export const DEFAULT_FRAGMENT_SHADER = /*glsl*/ `void main () {
  vec2 uv = k_uv() * zoom;

  float r = sin(uv.x);
  float g = cos(uv.y);
  float b = sin(uv.y);

  gl_FragColor = vec4(r, g, b, 1.);
}`;

export const SHADER_TYPE_MAP = {
  0: 'float',
  1: 'bool',
  2: 'vec2',
  3: 'vec3',
  4: 'vec4',
  5: 'sampler2D',
} as const;

export const DEFAULT_UNIFORMS: () => UniformTuple[] = () => [Uniform.create('zoom', 0)];

export const INTERNAL_UNIFORMS: () => UniformTuple[] = () =>
  [
    Uniform.create('resolution', 2),
    Uniform.create('time', 0),
    Uniform.create('stream', 0),
    Uniform.create('volume', 0),
    // Uniform.create('BufferA', 5),
    // Uniform.create('BufferB', 5),
    // Uniform.create('BufferC', 5),
    // Uniform.create('BufferD', 5),
  ] as const;

export const DEFAULT_DEFS = ['precision lowp float;', '\n', '#define PI 3.14159265359', '\n', '#define TWO_PI 2. * PI'] as any;

export const DEFAULT_HEADERS = [
  '#version 300 es',
  '\n',
  'precision lowp float;',
  '\n',
  '#define PI 3.14159265359',
  '\n',
  '#define TWO_PI 6.2831853072',
];

export const RAW_UTILS = {
  k_hue,
  k_kale,
  k_orb,
  k_rainbow,
  k_rotate2d,
  k_swap,
  k_uv,
} as any;

export const GLSL_UTILS = Object.keys(RAW_UTILS)
  .reduce((acc: string, key: string) => {
    acc += `${RAW_UTILS[key]}`;
    return acc;
  }, '\n')
  .trim() as any;
