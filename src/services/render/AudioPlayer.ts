import { tableMsgs } from '@/models/events';
import { SampleData, SampleTable } from '@/models/SampleTable';
import { from, Observable, Subject, Subscription } from 'rxjs';
import { map, scan, shareReplay, switchMap, toArray, withLatestFrom, concatMap } from 'rxjs/operators';
import { Inject, Service, Token } from 'typedi';
import { CommRenderToken, ICommRender } from './CommRender';
import { LevelType } from '@/models/Levels';

export const AudioPlayerToken = new Token<AudioPlayer>();
export type IAudioPlayer = AudioPlayer;

export interface PlayerInput {
  freqs: number[],
  type: LevelType,
  duration: number,
  pause: number,
}

interface PlayerItem extends SampleData {
  rate: number,
};

interface PlayerWebAudioState {
  sources: AudioBufferSourceNode[],
  nodes: AudioNode[],
}

interface BuffersCache {
  [freq: number]: Observable<BuffersCacheItem>;
}

interface BuffersCacheItem {
  freq: number;
  decoded: AudioBuffer,
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
      switchMap(([data, table]) => this.play(table, data.freqs, data.type, data.duration, data.pause)),
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

  private play(table: SampleTable, freqs: number[], type: LevelType, duration: number, pause: number) {
    const data = freqs.map((freq) => {
      const sample = this.getClosestSample(table, freq);
      const rate = this.getPlayRatio(freq, sample.freq);
      return { ...sample, rate };
    });
    return this.makeWebAudioPipeline(data, type, duration, pause);
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

  private makeWebAudioPipeline(data: PlayerItem[], type: LevelType, duration: number, pause: number): Observable<PlayerWebAudioState> {
    return from(data).pipe(
      concatMap((item) => {
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
      }),
      toArray(),
      map((decodedData) => {
        let start = this.audioCtx.currentTime;
        const sources: AudioBufferSourceNode[] = [];
        const nodes: AudioNode[] = [];
        for (const { decoded, rate } of decodedData) {
          const source = this.audioCtx.createBufferSource();
          const gainNode = this.audioCtx.createGain();
          source.buffer = decoded;
          source.connect(gainNode);
          gainNode.connect(this.audioCtx.destination);
          source.playbackRate.value = rate;
          gainNode.gain.value = 1;
          const startFade = start + Math.max(this.fadeTime, duration - this.fadeTime);
          gainNode.gain.setValueCurveAtTime(
            this.fadeCurve,
            startFade,
            this.fadeTime,
          );
          source.start(start);
          source.stop(start + duration);
          sources.push(source);
          nodes.push(gainNode);
          const delta = (duration + pause);
          start += (type === 'simultaneous' ? 0 : delta);
        }
        return { sources, nodes };
      }),
    );
  }
}
