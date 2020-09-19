import { levelMsgs } from '@/models/events';
import { Levels, LevelType, PlayerLevel } from '@/models/Levels';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Inject, Service, Token } from 'typedi';
import { CommRenderToken, ICommRender } from './CommRender';

export const LevelsSelectorToken = new Token<LevelsSelector>();
export type ILevelsSelector = LevelsSelector;

@Service(LevelsSelectorToken)
class LevelsSelector {
  public levelId$ = new BehaviorSubject<number>(1);
  public levelType$ = new BehaviorSubject<LevelType>('simultaneous');
  public levels$: Observable<Levels>;
  public currentLevel$: Observable<PlayerLevel>;

  constructor(
    @Inject(CommRenderToken) comm: ICommRender,
  ) {
    this.levels$ = comm.listen<Levels>(levelMsgs.response).pipe(shareReplay(1));
    this.currentLevel$ = combineLatest([this.levelId$, this.levelType$, this.levels$]).pipe(
      map(([levelId, type, levels]) => {
        const lvl = levels.diads.find(l => l.id === levelId) || levels.diads[0];
        return { ...lvl, type };
      }),

    );
    comm.send(levelMsgs.request);
  }

  public selectLevel(id: number) {
    this.levelId$.next(id);
  }

  public selectType(levelType: LevelType) {
    this.levelType$.next(levelType);
  }

  public getAllLevelTypes(): LevelType[] {
    return ['simultaneous', 'sequential'];
  }

  public getTypeName(levelType: LevelType) {
    switch (levelType) {
      case 'simultaneous':
        return 'Harmonic';
      case 'sequential':
        return 'Melodic';
    }
  }

}
