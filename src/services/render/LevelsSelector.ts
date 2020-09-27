import { levelMsgs } from '@/models/events';
import { Levels, PlaybackType, PlayerLevel, RootRange } from '@/models/Levels';
import { InstrumentType } from '@/models/SampleTable';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Inject, Service, Token } from 'typedi';
import { CommRenderToken, ICommRender } from './CommRender';

export const LevelsSelectorToken = new Token<LevelsSelector>();
export type ILevelsSelector = LevelsSelector;

@Service(LevelsSelectorToken)
class LevelsSelector {
  public levelId$ = new BehaviorSubject<number>(1);
  public playbackType$ = new BehaviorSubject<PlaybackType>('simultaneous');
  public instrumentType$ = new BehaviorSubject<InstrumentType>('piano');
  public rootRange$ = new BehaviorSubject<RootRange>(this.getOctavesData()[0]);
  public levels$: Observable<Levels>;
  public currentLevel$: Observable<PlayerLevel>;

  constructor(
    @Inject(CommRenderToken) comm: ICommRender,
  ) {
    this.levels$ = comm.listen<Levels>(levelMsgs.response).pipe(shareReplay(1));
    this.currentLevel$ = combineLatest(
      [this.levelId$, this.playbackType$, this.instrumentType$, this.levels$, this.rootRange$]
    ).pipe(
      map(([levelId, playbackType, instrumentType, levels, rootRange]) => {
        const lvl = levels.diads.find(l => l.id === levelId) || levels.diads[0];
        return { ...lvl, playbackType, instrumentType, rootRange };
      }),

    );
    comm.send(levelMsgs.request);
  }

  public selectLevel(id: number) {
    this.levelId$.next(id);
  }

  public selectPlaybackType(levelType: PlaybackType) {
    this.playbackType$.next(levelType);
  }

  public selectInstrumentType(instrumentType: InstrumentType) {
    this.instrumentType$.next(instrumentType);
  }

  public selectRootRange(range: RootRange) {
    this.rootRange$.next(range);
  }

  public getAllPlaybackTypes(): PlaybackType[] {
    return ['simultaneous', 'sequential'];
  }

  public getAllInstrumentTypes(): InstrumentType[] {
    return ['piano'];
  }

  public getOctavesData(): RootRange[] {
    return [
      {
        id: '1',
        name: 'All notes',
        range: [28, 52],
      },
      {
        id: '2',
        name: 'Low notes',
        range: [28, 35],
      },
      {
        id: '3',
        name: 'Middle notes',
        range: [36, 44],
      },
      {
        id: '4',
        name: 'High notes',
        range: [45, 52],
      }
    ]
  }

  public getPlaybackName(levelType: PlaybackType) {
    switch (levelType) {
      case 'simultaneous':
        return 'Harmonic';
      case 'sequential':
        return 'Melodic';
    }
  }

}
