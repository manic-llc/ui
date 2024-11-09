import Shader from './Shader';
import Editor from './Editor';
import { DEFAULT_FRAGMENT_SHADER } from './../constants/glsl-defaults';
import { type UniformTuple } from '@wearemanic/ui/classes/Uniform';
import { useDocument } from '@composables/useDocument';

const doc = useDocument();

export default class Sandbox {
  public shader: string;
  public uniforms: UniformTuple[];
  public parent: HTMLElement | null;
  public instances: {
    shader: Shader;
    editor: Editor;
  };
  private raf: any;
  public animate: boolean;

  constructor(config: any = {}) {
    const parent: HTMLElement = (
      typeof config.parent === 'string' ? doc.querySelector(config.parent) : config.parent || (doc.body as HTMLElement)
    ) as HTMLElement;

    const { shader, uniforms, animate } = {
      shader: DEFAULT_FRAGMENT_SHADER,
      uniforms: [],
      animate: true,
      ...(config || {}),
    } as any;

    this.raf;
    this.shader = shader;
    this.uniforms = uniforms;
    this.parent = parent;
    this.animate = animate;

    const shaderConfig: any = {
      fragmentShader: this.shader,
      parent: this.parent,
      dpr: Math.max(1, (window || { devicePixelRatio: 1 }).devicePixelRatio / 2),
      uniforms: this.uniforms,
      animate: this.animate,
      shaderpad: config.shaderpad,
    };

    const editorConfig = {
      doc: this.shader,
      uniforms: this.uniforms,
      onUpdate: this.onUpdate.bind(this),
    };

    this.instances = {
      shader: new Shader(shaderConfig),
      editor: new Editor(editorConfig),
    };
  }

  onUpdate(fragmentShader: string) {
    this.instances.shader.rebuild({ fragmentShader, uniforms: this.uniforms });
  }

  set uniform(val: any) {
    this.instances.shader.uniform = val;
  }
}
