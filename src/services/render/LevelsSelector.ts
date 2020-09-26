import { levelMsgs } from '@/models/events';
import { Levels, PlaybackType, PlayerLevel } from '@/models/Levels';
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

  public levels$: Observable<Levels>;
  public currentLevel$: Observable<PlayerLevel>;

  constructor(
    @Inject(CommRenderToken) comm: ICommRender,
  ) {
    this.levels$ = comm.listen<Levels>(levelMsgs.response).pipe(shareReplay(1));
    this.currentLevel$ = combineLatest([this.levelId$, this.playbackType$, this.instrumentType$, this.levels$]).pipe(
      map(([levelId, playbackType, instrumentType, levels]) => {
        const lvl = levels.diads.find(l => l.id === levelId) || levels.diads[0];
        return { ...lvl, playbackType, instrumentType };
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


  public getAllPlaybackTypes(): PlaybackType[] {
    return ['simultaneous', 'sequential'];
  }

  public getAllInstrumentTypes(): InstrumentType[] {
    return ['piano'];
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
