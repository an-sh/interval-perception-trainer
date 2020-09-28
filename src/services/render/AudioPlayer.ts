import { tableMsgs } from '@/models/events';
import { InstrumentType, SampleData, SampleTable } from '@/models/SampleTable';
import { from, Observable, Subject, Subscription } from 'rxjs';
import { map, scan, shareReplay, switchMap, toArray, withLatestFrom, concatMap } from 'rxjs/operators';
import { Inject, Service, Token } from 'typedi';
import { CommRenderToken, ICommRender } from './CommRender';
import { PlaybackType } from '@/models/Levels';

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
  rate: number,
};

interface BuffersCache {
  [freq: number]: Observable<BuffersCacheItem>;
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

  private buffersCache: BuffersCache = {};
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
      switchMap(([input, pianoTable]) => this.play(pianoTable, input)),
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
    this.buffersCache = {};
    this.audioCtx.close();
    this.pipelinesSubscription?.unsubscribe();
    this.pipelinesSubscription = null;
  }

  private play(table: SampleTable, input: PlayerInput) {
    const { instrumentType } = input;
    switch (instrumentType) {
      case 'piano': {
        const data = input.freqs.map((freq) => {
          const sample = this.getClosestSample(table, freq);
          const rate = this.getPlayRatio(freq, sample.freq);
          return { ...sample, rate };
        });
        // console.log(data);
        return this.makeSamplerAudioPipeline(data, input);
      }
    }
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

  private getClosestSample(table: SampleTable, freq: number): SampleData {
    let minDist = Infinity;
    let closestSample: SampleData;
    for (const sample of table.samples) {
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
    if (this.buffersCache[item.freq]) {
      return this.buffersCache[item.freq].pipe(map(rateMapper));
    }
    const newCacheItem = from(this.audioCtx.decodeAudioData(item.data.buffer.slice(0))).pipe(
      map(decoded => ({ decoded, freq: item.freq })),
      shareReplay(1),
    );
    this.buffersCache[item.freq] = newCacheItem;
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
    const delta = (duration + pause);
    start += (playbackType === 'simultaneous' ? 0 : delta);
    return start;
  }
}
