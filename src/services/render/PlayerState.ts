import { Interval } from '@/models/Interval';
import { PlayerLevel } from '@/models/Levels';
import router, { routeNames } from '@/router';
import { merge, Subject, Subscription } from 'rxjs';
import { tap, withLatestFrom } from 'rxjs/operators';
import { Inject, Service, Token } from 'typedi';
import { ref, Ref } from 'vue';
import { IIntervalGenerator, INotationConverter, IntervalGeneratorToken, NotationConverterToken } from '../shared';
import { AudioPlayerToken, IAudioPlayer, PlayerInput } from './AudioPlayer';
import { ILevelsSelector, LevelsSelectorToken } from './LevelsSelector';
import { IStatsTracker, StatsTrackerToken } from './StatsTracker';

export const PlayerStateToken = new Token<IPlayerState>();
export type IPlayerState = PlayerState;

@Service(PlayerStateToken)
class PlayerState {
  public showResult = ref(false);
  public selectedIntervalId = ref(0);
  public currentInterval: Ref<Interval | null> = ref(null);
  public level: Ref<PlayerLevel | null> = ref(null);

  private nextInterval$ = new Subject<true>();

  private pipelinesSubscription: Subscription | null = null;

  constructor(
    @Inject(IntervalGeneratorToken) private generator: IIntervalGenerator,
    @Inject(AudioPlayerToken) private player: IAudioPlayer,
    @Inject(NotationConverterToken) private notation: INotationConverter,
    @Inject(LevelsSelectorToken) private levels: ILevelsSelector,
    @Inject(StatsTrackerToken) private stats: IStatsTracker,
  ) {
    this.init();
  }

  private init() {
    const playPipeline$ = this.getPlayPipeline();
    const levelPipeline$ = this.getCurrentLevelPipeline();
    this.pipelinesSubscription = merge(playPipeline$, levelPipeline$).subscribe();
  }

  destroy() {
    this.pipelinesSubscription?.unsubscribe();
    this.pipelinesSubscription = null;
  }

  playRandom() {
    this.nextInterval$.next(true);
  }

  playFromRoot(id: number) {
    const currentInterval = this.currentInterval.value;
    if (currentInterval) {
      const interval = this.generator.getDiadInterval([id], currentInterval.root);
      const freqs =  this.getFreqs(interval);
      const duration = 2;
      const pause = 0;
      const input: PlayerInput = { freqs, duration, pause, type: 'simultaneous' };
      this.playInput(input);
    }
  }

  repeat() {
    const input = this.getPlayerInput(false);
    this.playInput(input);
  }

  repeatPerfect() {
    const input = this.getPlayerInput(true);
    this.playInput(input);
  }

  exit() {
    router.push({ name: routeNames.main });
  }

  makeChoice(id: number) {
    this.showResult.value = true;
    this.selectedIntervalId.value = id;
    const currentId = this.currentInterval.value?.interval;
    if (currentId) {
      const isCorrect = id === this.currentInterval.value?.interval;
      this.stats.addItem(currentId, isCorrect);
    }
  }

  getIntervalName(id: number) {
    return this.notation.getIntervalName(id);
  }

  getFreqs(interval: Interval) {
    return [interval.rootFreq, ...interval.noteFreqs];
  }

  getPerfectFreq(interval: Interval) {
    return [interval.rootFreq, ...interval.perfectFreqs];
  }

  getIntervalNoteNames(interval: Interval) {
    return [interval.rootName, ...interval.noteNames].join('–');
  }

  private getPlayPipeline() {
    return this.nextInterval$.pipe(
      withLatestFrom(this.levels.currentLevel$),
      tap(([, level]) => {
        this.showResult.value = false;
        const interval = this.generator.getDiadInterval(level.intervals);
        this.currentInterval.value = interval;
        const input = this.getPlayerInput(false);
        this.playInput(input);
      })
    );
  }

  private playInput(input: PlayerInput | null) {
    if (input) {
      this.player.playerInput$.next(input);
    }
  }

  private getPlayerInput(isPerfect: boolean): PlayerInput | null {
    const interval = this.currentInterval?.value;
    const levelType = this.level.value?.type;
    if (interval != null && levelType != null) {
      const freqs = isPerfect ? this.getPerfectFreq(interval) : this.getFreqs(interval);
      const duration = this.level.value?.type === 'sequential' ? 1.25 : 2;
      const pause = this.level.value?.type === 'sequential' ? 0.5 : 0;
      return { freqs, duration, pause, type: levelType };
    }
    return null;
  }

  private getCurrentLevelPipeline() {
    return this.levels.currentLevel$.pipe(
      tap((level) => this.reloadLevel(level)),
    );
  }

  private reloadLevel(level: PlayerLevel) {
    this.level.value = level;
    this.showResult.value = false;
    this.selectedIntervalId.value = 0;
    this.currentInterval.value = null;
    this.stats.reloadLevel(level);
  }

}
