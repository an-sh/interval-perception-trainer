import { tableMsgs } from '@/models/events';
import { InstrumentType, sampledInstrumentTypes, SampleData, SampleTable, SampledInstrumentType } from '@/models/SampleTable';
import { from, of, Observable, Subject, Subscription } from 'rxjs';
import { map, scan, shareReplay, switchMap, toArray, withLatestFrom, concatMap } from 'rxjs/operators';
import { Inject, Service, Token } from 'typedi';
import { CommRenderToken, ICommRender } from './CommRender';
import { PlaybackType } from '@/models/Levels';
import { getRandomNumber } from '@/lib/utils';

export const AudioPlayerToken = new Token<AudioPlayer>();
export type IAudioPlayer = AudioPlayer;

export interface PlayerInput {
  freqs: number[],
  instrumentType: InstrumentType,
  playbackType: PlaybackType,
  duration: number,
  pause: number,
}

interface PlayerWebAudioState {
  sources: AudioScheduledSourceNode[],
  nodes: AudioNode[],
}

interface SamplerItem extends SampleData {
  instrument: SampledInstrumentType;
  rate: number,
};

type BuffersCache = {
  [instrument in SampledInstrumentType]: {
    [freq: number]: Observable<BuffersCacheItem>;
  }
}

interface BuffersCacheItem {
  freq: number;
  decoded: AudioBuffer,
}

interface DecodedSamplerItem extends BuffersCacheItem {
  rate: number,
}

@Service(AudioPlayerToken)
class AudioPlayer {
  public playerInput$: Subject<PlayerInput> = new Subject();

  private buffersCache: BuffersCache = {
    piano: {},
    harpsichord: {},
    organ: {},
  };

  private audioCtx = new AudioContext();
  private playerPipeline$: Observable<PlayerWebAudioState>;
  private pipelinesSubscription: Subscription | null = null;
  private fadeCurve = [1, 0.9, 0.7, 0.3, 0];
  private fadeTime = 0.1;

  constructor(
    @Inject(CommRenderToken) public comm: ICommRender,
  ) {
    this.playerPipeline$ = this.playerInput$.pipe(
      withLatestFrom(comm.listen<SampleTable>(tableMsgs.response).pipe(shareReplay(1))),
      switchMap(([input, sampleTable]) => this.play(sampleTable, input)),
      scan(
        (prevState, nextState) => {
          if (prevState) {
            this.stop(prevState);
          }
          return nextState;
        },
      ),
    );
    this.pipelinesSubscription = this.playerPipeline$.subscribe();
    comm.send(tableMsgs.request);
  }

  destroy() {
    this.audioCtx.close();
    this.pipelinesSubscription?.unsubscribe();
    this.pipelinesSubscription = null;
  }

  private play(table: SampleTable, input: PlayerInput) {
    const { instrumentType } = input;
    switch (instrumentType) {
      case 'piano':
      case 'harpsichord':
      case 'organ':
      case 'mixed': {
        return this.playSampler(table, input);
      }
      case 'sine': {
        return this.makeOscillatorPipeline(input);
      }
    }
  }

  private playSampler(table: SampleTable, input: PlayerInput) {
    const { instrumentType } = input;
    const data = input.freqs.map((freq) => {
      const instrument = instrumentType === 'mixed' ?
        this.getRandomInstrument() :
        (instrumentType as SampledInstrumentType);
      const sample = this.getClosestSample(table, freq, instrument);
      const rate = this.getPlayRatio(freq, sample.freq);
      return { ...sample, rate, instrument };
    });
    return this.makeSamplerAudioPipeline(data, input);
  }

  private getRandomInstrument() {
    const idx = getRandomNumber(0, sampledInstrumentTypes.length - 1);
    return sampledInstrumentTypes[idx];
  }

  private stop(state: PlayerWebAudioState) {
    for (const source of state.sources) {
      source.stop(0);
      source.disconnect();
    }
    for (const node of state.nodes) {
      node.disconnect();
    }
  }

  private getClosestSample(table: SampleTable, freq: number, instrument: InstrumentType): SampleData {
    let minDist = Infinity;
    let closestSample: SampleData;
    for (const sample of table[instrument].samples) {
      const dist = Math.abs(freq - sample.freq);
      if (dist < minDist) {
        minDist = dist;
        closestSample = sample;
      }
    }
    return closestSample!;
  }

  private getPlayRatio(targetFreq: number, sampleFreq: number) {
    return targetFreq / sampleFreq;
  }

  private makeSamplerAudioPipeline(data: SamplerItem[], input: PlayerInput): Observable<PlayerWebAudioState> {
    return from(data).pipe(
      concatMap(item => this.decoderCacher(item)),
      toArray(),
      map(decodedData => this.setSamplerNodes(decodedData, input)),
    );
  }

  private makeOscillatorPipeline(input: PlayerInput) {
    return of(null).pipe(
      map(() => this.setOscillatorNodes(input)),
    );
  }

  private setOscillatorNodes(input: PlayerInput) {
    let start = this.audioCtx.currentTime;
    const sources: AudioScheduledSourceNode[] = [];
    const nodes: AudioNode[] = [];
    for (const freq of input.freqs) {
      const Ainv = -this.getAWeighting(freq)
      const amp = this.calcAmp(Ainv);
      const vol = Math.min(0.075 * amp, 0.5);
      const source = this.audioCtx.createOscillator();
      sources.push(source);
      source.type = 'sine';
      source.frequency.setValueAtTime(freq, start);

      const gainNode = this.addGainFadeNode(source, input, start, vol);
      nodes.push(gainNode);
      start = this.setSourceTimings(source, input, start);
    }
    return { sources, nodes };
  }

  // A-weighting calc
  private getAWeighting(freq: number) {
    const N1 = 12194 ** 2;
    const D1 = 20.6 ** 2;
    const D2 = 107.7 ** 2;
    const D3 = 737.9 ** 2;
    const D4 = 12194 ** 2;
    const fs = freq ** 2;
    const Ra = (N1 * (freq ** 4)) / ((fs + D1) * Math.sqrt((fs + D2) * (fs + D3)) * (fs + D4));
    const A = 20 * Math.log10(Ra) + 2.0;
    return A;
  }

  private calcAmp(db: number) {
    return 10 ** (db / 20);
  }

  private setSamplerNodes(decodedData: DecodedSamplerItem[], input: PlayerInput) {
    let start = this.audioCtx.currentTime;
    const sources: AudioScheduledSourceNode[] = [];
    const nodes: AudioNode[] = [];
    for (const { decoded, rate } of decodedData) {
      const source = this.audioCtx.createBufferSource();
      sources.push(source);
      source.buffer = decoded;
      source.playbackRate.value = rate;

      const gainNode = this.addGainFadeNode(source, input, start);
      nodes.push(gainNode);
      start = this.setSourceTimings(source, input, start);
    }
    return { sources, nodes };
  }

  private decoderCacher(item: SamplerItem) {
    const rateMapper = (cacheItem: BuffersCacheItem) => ({ ...cacheItem, rate: item.rate })
    if (this.buffersCache[item.instrument][item.freq]) {
      return this.buffersCache[item.instrument][item.freq].pipe(map(rateMapper));
    }
    const newCacheItem = from(this.audioCtx.decodeAudioData(item.data.buffer.slice(0))).pipe(
      map(decoded => ({ decoded, freq: item.freq })),
      shareReplay(1),
    );
    this.buffersCache[item.instrument][item.freq] = newCacheItem;
    return newCacheItem.pipe(map(rateMapper));
  }

  private addGainFadeNode(source: AudioNode, input: PlayerInput, start: number, volume = 1) {
    const { duration } = input;
    const gainNode = this.audioCtx.createGain();
    source.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    gainNode.gain.value = volume;
    const startFade = start + Math.max(this.fadeTime, duration - this.fadeTime);
    const fadeValues = this.fadeCurve.map(val => val * volume);
    gainNode.gain.setValueCurveAtTime(
      fadeValues,
      startFade,
      this.fadeTime,
    );
    return gainNode;
  }

  private setSourceTimings(source: AudioBufferSourceNode | OscillatorNode, input: PlayerInput, start: number) {
    const { duration, pause, playbackType } = input;
    source.start(start);
    source.stop(start + duration);
    const offset = getRandomNumber(300, 500) / 50000; // 6-10ms
    const delta = (playbackType === 'simultaneous') ? offset : (duration + pause);
    start += delta;
    return start;
  }
}
