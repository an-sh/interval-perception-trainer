import { levelMsgs } from '@/models/events';
import { CustomRoot, Levels, PlaybackType, playbackTypes, PlayerLevel, RootRange } from '@/models/Levels';
import { InstrumentType, instrumentTypes } from '@/models/SampleTable';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Inject, Service, Token } from 'typedi';
import { INotationConverter, NotationConverterToken } from '../shared';
import { CommRenderToken, ICommRender } from './CommRender';

export const tunings = ['TET', 'perfect'];
export type Tuning = typeof tunings[number];

export const LevelsSelectorToken = new Token<LevelsSelector>();
export type ILevelsSelector = LevelsSelector;

@Service(LevelsSelectorToken)
class LevelsSelector {
  private readonly minNote = 28;
  private readonly c4Note = 40;
  private readonly maxNote = 51;

  private rootRanges: RootRange[] = [
    {
      id: '1',
      name: 'Octaves 3 & 4',
      range: [this.minNote, this.maxNote],
      isCustom: false,
    },
    {
      id: '2',
      name: 'Octave 3',
      range: [this.minNote, this.c4Note - 1],
      isCustom: false,
    },
    {
      id: '3',
      name: 'Octave 4',
      range: [this.c4Note, this.maxNote],
      isCustom: false,
    },
    {
      id: '4',
      name: 'Custom',
      isCustom: true,
    }
  ];

  public levelId$ = new BehaviorSubject(1);
  public playbackType$ = new BehaviorSubject<PlaybackType>('simultaneous');
  public instrumentType$ = new BehaviorSubject<InstrumentType>('mixed');
  public rootRange$ = new BehaviorSubject<RootRange>(this.rootRanges[0]);
  public customRoots$ = new BehaviorSubject<number[]>([40]);
  public levels$: Observable<Levels>;
  public currentLevel$: Observable<PlayerLevel>;
  public isPerfect$ = new BehaviorSubject(true);

  constructor(
    @Inject(CommRenderToken) comm: ICommRender,
    @Inject(NotationConverterToken) private converter: INotationConverter,
  ) {

    this.levels$ = comm.listen<Levels>(levelMsgs.response).pipe(shareReplay(1));
    this.currentLevel$ = combineLatest(
      [this.levelId$, this.playbackType$, this.instrumentType$, this.levels$, this.rootRange$, this.isPerfect$],
    ).pipe(
      map(([levelId, playbackType, instrumentType, levels, rootRange, isPerfect]) => {
        const lvl = levels.diads.find(l => l.id === levelId) || levels.diads[0];
        return { ...lvl, playbackType, instrumentType, rootRange, isPerfect };
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

  public selectCustomRoots(customRoots: number[]) {
    const rootRange = {
      id: '4',
      name: 'Custom',
      isCustom: true,
      customRoots,
    }
    this.customRoots$.next(customRoots);
    this.rootRange$.next(rootRange);
  }

  public selectTunungType(type: Tuning) {
    switch (type) {
      case 'perfect': {
        this.isPerfect$.next(true);
        return;
      }
      case 'TET': {
        this.isPerfect$.next(false);
        return;
      }
    }
  }

  public getTuningTypes(): readonly Tuning[] {
    return tunings;
  }

  public getTuning(isPerfect: boolean): Tuning {
    return isPerfect ? 'perfect' : 'TET';
  }

  public getAllPlaybackTypes(): readonly PlaybackType[] {
    return playbackTypes;
  }

  public getAllInstrumentTypes(): readonly InstrumentType[] {
    return instrumentTypes;
  }

  public getRootRangesData(): RootRange[] {
    return this.rootRanges;
  }

  public getAllCustomRoots(): CustomRoot[] {
    const roots: CustomRoot[] = [];
    for (let note = this.minNote; note <= this.maxNote; note++) {
      const name = this.converter.getNoteName(note);
      const item = {
        name,
        note,
      }
      roots.push(item);
    }
    return roots;
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
