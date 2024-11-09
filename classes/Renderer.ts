import { createWebGL2App, type WebGLApp, createFramebuffer } from '@util/webgl';
import { type UniformTuple } from './Uniform';
import { clone } from '@util/clone';
import { capitalizeFirstLetter } from '@util/strings';
import {
  DEFAULT_VERTEX_SHADER,
  DEFAULT_UNIFORMS,
  GLSL_UTILS,
  SHADER_TYPE_MAP,
  INTERNAL_UNIFORMS,
  DEFAULT_HEADERS,
} from '@constants/glsl-defaults';

export type RenderPass = {
  shader: string;
  uniforms?: UniformTuple[];
} | null;

export const BUFFER_KEYS = ['BufferA', 'BufferB', 'BufferC', 'BufferD'] as const;
export const RENDER_PASS_KEYS = ['Main', ...BUFFER_KEYS] as const;
export type RenderPassKey = (typeof RENDER_PASS_KEYS)[number];
export type RenderPassIndex = 0 | 1 | 2 | 3 | 4;
export const RenderPassMap: Record<RenderPassIndex, RenderPassKey> = {
  0: 'Main',
  1: 'BufferA',
  2: 'BufferB',
  3: 'BufferC',
  4: 'BufferD',
};

export type Sketch = Record<RenderPassKey, RenderPass>;

type InstantiatedRenderPasses = Record<RenderPassKey, { app: WebGLApp; framebuffer?: WebGLFramebuffer; texture?: WebGLTexture } | null>;

export type RendererConfig = {
  canvas: HTMLCanvasElement;
  sketch: Sketch;
};

export default class Renderer {
  private ctx: WebGL2RenderingContext;
  private sketch: any;
  private $$updating: boolean = false;
  private passes?: InstantiatedRenderPasses;
  private stateRef?: any;
  private deps?: {
    collection: any[];
    tree: any;
  };

  constructor({ canvas, sketch }: RendererConfig) {
    this.setSketch(sketch);
    this.ctx = canvas.getContext('webgl2') as WebGL2RenderingContext;
    this.buildPasses();
    this.render();
  }

  setSketch(sketch: any) {
    this.sketch = sketch;
    this.stateRef = Object.keys(sketch).reduce((acc: any, key: any) => {
      acc[key] = clone(sketch[key]);
      return acc;
    }, {});
  }

  parseDependencies() {
    const dependencyMap = new Map<string, Set<string>>();
    const visited = new Set<string>();
    const sorted: any[] = [];
    const passes = Object.keys(this.sketch).reduce((acc, key: any) => {
      const sketch: any = (this.sketch as any)?.[key] || {};
      acc.push({ ...sketch, name: key });
      return acc;
    }, [] as any);

    passes.forEach((shaderObj: any) => {
      const dependencies = new Set<string>();
      BUFFER_KEYS.forEach((buffer, index) => {
        if (shaderObj?.shader?.includes?.(buffer)) dependencies.add(BUFFER_KEYS[index]);
      });
      dependencyMap.set(shaderObj.name, dependencies);
    });

    function visit(shaderObj: any) {
      if (visited.has(shaderObj.name)) return;
      visited.add(shaderObj.name);
      dependencyMap.get(shaderObj.name)?.forEach(dep => {
        const depObj = passes.find((obj: any) => obj.name === dep);
        if (depObj) visit(depObj);
      });

      sorted.push(shaderObj);
    }

    passes.forEach((shaderObj: any) => {
      if (!visited.has(shaderObj.name)) visit(shaderObj);
    });

    return {
      collection: sorted,
      tree: sorted.reduce((acc, pass) => {
        acc[pass.name] = Array.from((dependencyMap as any).get(pass.name));
        return acc;
      }, {}),
    };
  }

  getUniformDeclarations(key: RenderPassKey) {
    return [...INTERNAL_UNIFORMS(), ...(this.sketch?.[key]?.uniforms || DEFAULT_UNIFORMS())].reduce(
      (acc: string, [name, type]: UniformTuple) => {
        acc += `uniform ${(SHADER_TYPE_MAP as any)[type]} ${name};\n`;
        return acc;
      },
      ''
    );
  }

  buildPasses() {
    if (this.passes) RENDER_PASS_KEYS.forEach(key => this.passes?.[key]?.app?.cleanup());

    this.deps = this.parseDependencies() as any;

    this.passes = ((this.deps as any).collection as any[]).reduce((acc, pass) => {
      const key = pass.name;

      if (!this.sketch[key]) {
        acc[key] = null;
        return acc;
      }

      const fragmentShader = `
        ${DEFAULT_HEADERS.join('\n')}
        ${this.getUniformDeclarations(key)}
        ${GLSL_UTILS}
        ${this.sketch?.[key]?.shader}
      `.trim();

      const vertexShader = `
        ${DEFAULT_HEADERS.join('\n')}
        ${DEFAULT_VERTEX_SHADER}
      `.trim();

      const uniforms = [...clone(INTERNAL_UNIFORMS), ...clone(this.sketch?.[key]?.uniforms || DEFAULT_UNIFORMS)];

      const app = createWebGL2App({
        ctx: this.ctx,
        fragmentShader,
        vertexShader,
        uniforms,
        onError(e: unknown) {
          console.log(e);
        },
      });

      if (!app) return acc;

      if (key !== 'Main') {
        acc[key] = { app, ...createFramebuffer(this.ctx) };
      } else {
        acc[key] = { app };
      }

      return acc;
    }, {});
  }

  update(sketch: Sketch) {
    if (this.check(sketch)) {
      this.$$updating = true;
      this.setSketch(sketch);
      this.buildPasses();
      this.$$updating = false;
      return;
    }

    this.setSketch(sketch);
  }

  check(sketch: Sketch) {
    let rebuild = false;

    RENDER_PASS_KEYS.forEach(key => {
      if (rebuild) return;
      const shaderMismatch = sketch?.[key]?.shader !== this.stateRef?.[key]?.shader;
      const uniformMismatch = !sketch?.[key]?.uniforms?.every((uniform, i) => this.stateRef?.[key]?.uniforms?.[i]?.[0] === uniform[0]);
      if (shaderMismatch || uniformMismatch) rebuild = true;
      if (key !== 'Main') return;
    });

    console.log(this);

    return rebuild;
  }

  resize({ width, height }: { width: number; height: number }) {
    this.ctx.viewport(0, 0, width, height);
  }

  setRenderPassUniforms(key: RenderPassKey, now: DOMHighResTimeStamp) {
    const pass = this.passes[key];

    if (!pass) return;

    const uniforms = pass.app.uniforms;

    uniforms?.resolution?.set([this.ctx.canvas.width, this.ctx.canvas.height]);
    uniforms?.time?.set(now / 1000);
    uniforms?.stream?.set(now / 1000);
    uniforms?.volume?.set(1);

    this.sketch?.[key]?.uniforms?.forEach((uniform: any) => {
      uniforms?.[uniform[0]]?.set(uniform[2]);
    });
  }

  renderFrameBuffer(key: RenderPassKey, now: DOMHighResTimeStamp) {
    if (this.passes?.[key]?.app?.program && this.passes?.[key].framebuffer) {
      this.ctx.useProgram(this.passes?.[key].app.program);
      this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER, this.passes[key].framebuffer);
      this.setRenderPassUniforms(key, now);
      this.passes?.[key].app.render();
      this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER, null);
    }
  }

  bindTexture(key: RenderPassKey, textureUnit: number, program: WebGLProgram, uniformName: string) {
    if (this.passes?.[key]?.texture && program) {
      this.ctx.activeTexture(textureUnit);
      this.ctx.bindTexture(this.ctx.TEXTURE_2D, this.passes[key].texture);

      const uniformLocation = this.ctx.getUniformLocation(program, uniformName);

      if (uniformLocation !== null) {
        this.ctx.uniform1i(uniformLocation, textureUnit - this.ctx.TEXTURE0);
      }
    }
  }

  render(now: DOMHighResTimeStamp = performance?.now?.() || 0) {
    if (this.$$updating || !this.passes?.Main?.app?.program) return;

    this.deps?.collection?.forEach(passItem => {
      const passName = passItem.name as RenderPassKey;

      if (!this.passes[passName]) return;

      const pass = this.passes[passName];
      const program = pass.app.program;

      this.ctx.useProgram(program);

      const dependencies = this.deps.tree[passName] || [];
      dependencies.forEach((depName, index) => {
        const textureUnit = this.ctx.TEXTURE0 + index;
        const uniformName = capitalizeFirstLetter(depName);
        this.bindTexture(depName as RenderPassKey, textureUnit, program, uniformName);
      });

      this.setRenderPassUniforms(passName, now);

      if (passName !== 'Main') {
        this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER, pass.framebuffer);
        pass.app.render();
        this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER, null);
      } else {
        pass.app.render();
      }
    });
  }

  destroy() {
    RENDER_PASS_KEYS.forEach(key => this.passes?.[key]?.app?.cleanup());
  }
}
