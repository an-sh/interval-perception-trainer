import { tableMsgs } from '@/models/events';
import { SampleData, SampleTable } from '@/models/SampleTable';
import { from, Observable, Subject, Subscription } from 'rxjs';
import { map, scan, shareReplay, switchMap, toArray, withLatestFrom, concatMap } from 'rxjs/operators';
import { Inject, Service, Token } from 'typedi';
import { CommRenderToken, ICommRender } from './CommRender';
import { LevelType } from '@/models/Levels';

export const AudioPlayerToken = new Token<AudioPlayer>();
export type IAudioPlayer = AudioPlayer;

interface PlaySampleData {
  sample: SampleData,
  rate: number,
};

export interface PlayerInput {
  freqs: number[],
  type: LevelType,
  duration: number,
  pause: number,
}

interface PlayerWebAudioState {
  audioCtx: AudioContext,
  sources: AudioBufferSourceNode[],
}

@Service(AudioPlayerToken)
class AudioPlayer {
  public playerInput$: Subject<PlayerInput> = new Subject();

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
        (oldState, webAudioState) => {
          if (oldState) {
            this.stop(oldState.sources);
            oldState.audioCtx.close();
          }
          return webAudioState;
        },
      ),
    );
    this.pipelinesSubscription = this.playerPipeline$.subscribe();
    comm.send(tableMsgs.request);
  }

  destroy() {
    this.pipelinesSubscription?.unsubscribe();
    this.pipelinesSubscription = null;
  }

  private play(table: SampleTable, freqs: number[], type: LevelType, duration: number, pause: number) {
    const data = freqs.map((freq) => {
      const sample = this.getClosestSample(table, freq);
      const rate = this.getPlayRatio(freq, sample.freq);
      return { sample, rate };
    });
    // console.log(data);
    return this.makeWebAudioPipeline(data, type, duration, pause);
  }

  private stop(sources: AudioBufferSourceNode[]) {
    for (const source of sources) {
      source.stop(0);
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

  private makeWebAudioPipeline(data: PlaySampleData[], type: LevelType, duration: number, pause: number): Observable<PlayerWebAudioState> {
    const audioCtx = new AudioContext();
    return from(data).pipe(
      concatMap((item) => {
        return from(audioCtx.decodeAudioData(item.sample.data.buffer.slice(0))).pipe(
          map(decoded => ({ decoded, item })),
        );
      }),
      toArray(),
      map((decodedData) => {
        let start = audioCtx.currentTime;
        const sources: AudioBufferSourceNode[] = [];
        for (const { decoded, item } of decodedData) {
          const source = audioCtx.createBufferSource();
          const gainNode = audioCtx.createGain();
          source.buffer = decoded;
          source.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          source.playbackRate.value = item.rate;
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
          const delta = (duration + pause);
          start += (type === 'simultaneous' ? 0 : delta);
        }
        return { audioCtx, sources };
      }),
    );
  }
}
