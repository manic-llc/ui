import { scaleLinear } from 'd3-scale';
// import Meyda from 'meyda';
// import { MeydaAnalyzer } from 'meyda/dist/esm/meyda-wa';
import { useNavigator } from '@composables/useNavigator';

const nav = useNavigator();

export type AudioStream = [[number, number, number][], number];

export type AudioStreamDefinitions = {
  volume: AudioStream;
  stream: AudioStream;
};

export type AudioAnalyserConfig = {
  bitDepth: number;
  definitions: AudioStreamDefinitions;
  meyda: boolean;
  lowpass: {
    frequency: number;
    Q: number;
  };
};

export type AudioAnalyserState = {
  initialized: boolean;
  volume: number;
  stream: number;
  features: any;
  note: string | null;
  source: 'microphone' | 'audio' | null;
  microphone: MediaStream | null;
  mediaElementSource: MediaElementAudioSourceNode | null;
  mediaStreamSource: MediaStreamAudioSourceNode | null;
};

export default class AudioAnalyser {
  public config: AudioAnalyserConfig;
  public state: AudioAnalyserState;
  private ctx?: AudioContext;
  private analyser?: AnalyserNode;
  private filter?: BiquadFilterNode;
  private analyserBuffer?: Uint8Array;
  private volumeBuffer: number[] = [];
  private source?: MediaElementAudioSourceNode | MediaStreamAudioSourceNode;
  // private meyda?: MeydaAnalyzer;

  constructor({
    definitions,
    bitDepth,
    meyda,
    lowpass,
  }: {
    definitions: AudioStreamDefinitions;
    bitDepth?: number;
    meyda?: boolean;
    lowpass?: {
      frequency: number;
      Q: number;
    };
  }) {
    this.config = {
      definitions,
      bitDepth: bitDepth || Math.pow(2, 10),
      meyda: meyda || false,
      lowpass: lowpass || {
        frequency: 1000,
        Q: 0.5,
      },
    };

    this.state = {
      initialized: false,
      source: null,
      volume: 1,
      stream: 0,
      features: {},
      note: null,
      microphone: null,
      mediaElementSource: null,
      mediaStreamSource: null,
    };
  }

  set definitions(definitions: AudioStreamDefinitions) {
    this.config.definitions = definitions;
  }

  get rawVolume() {
    if (this.state.initialized === false) return 1;
    this.analyser?.getByteFrequencyData(this.analyserBuffer as Uint8Array);
    let val = 0;
    for (let i = 0; i < this.config.bitDepth / 2; i++) val += (this.analyserBuffer as Uint8Array)[i];
    return val / this.config.bitDepth / 2;
  }

  async initialize({ element, microphone }: { element?: HTMLAudioElement; microphone?: boolean }) {
    this.ctx = new AudioContext();
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = this.config.lowpass.frequency;
    this.filter.Q.value = this.config.lowpass.Q;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.smoothingTimeConstant = 0;
    this.analyser.fftSize = this.config.bitDepth;

    if (element) {
      if (this.state.microphone) this.state.microphone.getTracks().forEach(track => track.stop());
      this.state.source = 'audio';
      this.state.mediaElementSource = this.ctx.createMediaElementSource(element);
      this.source = this.state.mediaElementSource;
    }

    if (microphone) {
      this.state.source = 'microphone';
      this.state.microphone = await nav.mediaDevices.getUserMedia({ audio: true, video: false });
      this.state.mediaStreamSource = this.ctx.createMediaStreamSource(this.state.microphone as any);
      this.source = this.state.mediaStreamSource;
    }

    if (!this.source) {
      console.warn('AudioAnalyser has no valid source.');
      return;
    }

    this.source.connect(this.filter);
    this.filter.connect(this.analyser);

    if (this.state.source !== 'microphone') this.source.connect(this.ctx.destination);

    this.analyserBuffer = new Uint8Array(this.config.bitDepth / 2);

    for (let i = 0; i < this.config.bitDepth / 2; i++) this.analyserBuffer[i] = 1;

    // if (this.config.meyda) this.initializeMeyda();

    this.state.initialized = true;
  }

  private setAudioFeatures(data: any) {
    this.state.features = data;

    const notes = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

    this.state.features.chroma.forEach((note: any, i: number) => {
      if (note === 1 && this.state.note !== notes[i]) {
        this.state.note = notes[i];
      }
    });
  }

  // private initializeMeyda() {
  //   if (this.state.initialized) return;

  //   Meyda.windowingFunction = 'hamming';

  //   this.meyda = Meyda.createMeydaAnalyzer({
  //     audioContext: this.ctx,
  //     source: this.source,
  //     bufferSize: this.config.bitDepth / 2,
  //     featureExtractors: ['energy', 'chroma', 'perceptualSpread', 'spectralFlatness', 'spectralCentroid'],
  //     callback: (data: any) => this.setAudioFeatures(data),
  //   });

  //   this.meyda.start();
  // }

  private updateStream(method: '*' | '+', streams: [number, number, number][], frameRate = 60) {
    const frameDuration = 1000 / frameRate;

    return streams.reduce(
      (acc: number, stream: any) => {
        const [ref, min] = this.sampleVolume((stream[0] * 1000) / frameDuration);
        const [sample] = this.sampleVolume((stream[1] * 1000) / frameDuration);
        const tick = Math.pow(scaleLinear([min, ref], [0, 1])(sample), stream[2]);
        if (method === '*') {
          return acc * tick;
        } else {
          return acc + tick;
        }
      },
      method === '*' ? 1 : 0
    );
  }

  private sampleVolume(totalSamples: number): [number, number] {
    let value = 0;
    const start = Math.max(this.volumeBuffer.length - 1, 0);
    const end = Math.max(start - totalSamples, 0);

    let min = Infinity;

    for (let i = start; i > end; i--) {
      value += this.volumeBuffer[i];

      if (this.volumeBuffer[i] < min) min = this.volumeBuffer[i];
    }

    return [value / totalSamples, min];
  }

  tick({ frameRate }: { frameRate: number }): { volume: number; stream: number } {
    const volume = this.rawVolume;

    this.volumeBuffer.push(volume);

    while (this.volumeBuffer.length > 5 * 480) {
      this.volumeBuffer.shift();
    }

    const vol = this.updateStream('*', this.config.definitions.volume[0], frameRate);
    const str = this.updateStream('+', this.config.definitions.stream[0], frameRate);
    const mul = frameRate / 120;
    const base = 0.075 / mul;

    this.state.volume = Math.pow(vol / this.config.definitions.volume[1], 0.75);
    this.state.stream += base + str / this.config.definitions.stream[1] / mul;

    return {
      volume: this.state.volume,
      stream: this.state.stream,
    };
  }

  async destroy() {
    try {
      if (this.state.microphone) this.state.microphone.getTracks().forEach(track => track.stop());
      this.analyser?.disconnect();
      this.filter?.disconnect();
      await this.ctx?.close();
    } catch (e) {
      // Don't care.
    }
  }
}
