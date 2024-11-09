export type FloatUniform = [string, 0, number, number, number, boolean, boolean];
export type BooleanUniform = [string, 1, boolean, null, null, null, boolean];
export type Vec2Uniform = [string, 2, [number, number], null, null, null, boolean];
export type Vec3Uniform = [string, 3, [number, number, number], null, null, null, boolean];
export type Vec4Uniform = [string, 4, [number, number, number, number], null, null, null, boolean];
export type Sampler2DUniform = [string, 5, any, null, null, null, boolean];
export type UniformTuple = FloatUniform | BooleanUniform | Vec2Uniform | Vec3Uniform | Vec4Uniform | Sampler2DUniform;

export default class Uniform {
  private ctx: WebGLRenderingContext;
  private location: WebGLUniformLocation;
  private setUniform: (value: any) => void;
  public def: UniformTuple;
  public value: any;

  constructor(ctx: WebGLRenderingContext, program: WebGLProgram, uniform: UniformTuple) {
    this.def = uniform;
    this.ctx = ctx;
    this.location = ctx.getUniformLocation(program, uniform[0]);

    switch (uniform[1]) {
      case 0: // float
        this.setUniform = (value: number) => {
          this.ctx.uniform1f(this.location, value);
        };
        break;
      case 1: // boolean
        this.setUniform = (value: boolean) => {
          this.ctx.uniform1i(this.location, value ? 1 : 0);
        };
        break;
      case 2: // vec2
        this.setUniform = (value: [number, number]) => {
          this.ctx.uniform2fv(this.location, value);
        };
        break;
      case 3: // vec3
        this.setUniform = (value: [number, number, number]) => {
          this.ctx.uniform3fv(this.location, value);
        };
        break;
      case 4: // vec4
        this.setUniform = (value: [number, number, number, number]) => {
          this.ctx.uniform4fv(this.location, value);
        };
        break;
      case 5: // sampler2D
        this.setUniform = (value: number) => {
          this.ctx.uniform1i(this.location, value);
        };
        break;
      default:
        throw new Error('Unknown uniform type');
    }

    this.set(uniform[2]);
  }

  set(value: any): true {
    this.value = value;
    this.setUniform(value);
    return true;
  }

  static create(name: string, type: 0 | 1 | 2 | 3 | 4 | 5): UniformTuple {
    switch (type) {
      case 0:
        return [name, 0, 1, 0, 2, false, false];
      case 1:
        return [name, 1, true, null, null, null, false];
      case 2:
        return [name, 2, [800, 600], null, null, null, false];
      case 3:
        return [name, 3, [Math.random(), Math.random(), Math.random()], null, null, null, false];
      case 4:
        return [name, 4, [Math.random(), Math.random(), Math.random(), Math.random()], null, null, null, false];
      case 5:
        return [name, 5, null, null, null, null, false];
    }
  }
}
