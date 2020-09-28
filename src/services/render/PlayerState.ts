import { Interval } from '@/models/Interval';
import { PlaybackType, PlayerLevel } from '@/models/Levels';
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

  isMatchingChoice() {
    return this.currentInterval.value?.interval === this.selectedIntervalId.value;
  }

  playRandom() {
    this.nextInterval$.next(true);
  }

  playFromRoot(id: number) {
    const currentInterval = this.currentInterval.value;
    const level = this.level.value;
    if (currentInterval && level) {
      const interval = this.generator.getDiadInterval([id], level.rootRange, currentInterval.root);
      const isPerfect = Boolean(this.level.value?.isPerfect);
      const input = this.makeIntervalPayload(interval, isPerfect);
      if (input) {
        this.playInput(input);
      }
    }
  }

  repeat() {
    const isPerfect = Boolean(this.level.value?.isPerfect);
    const input = this.getPlayerInput(isPerfect);
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
        const interval = this.generator.getDiadInterval(level.intervals, level.rootRange);
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
    if (interval != null) {
      return this.makeIntervalPayload(interval, isPerfect);
    }
    return null;
  }

  private makeIntervalPayload(interval: Interval, isPerfect: boolean) {
    const level = this.level.value;
    if (interval != null && level != null) {
      const { instrumentType, playbackType } = level;
      const freqs = isPerfect ? this.getPerfectFreq(interval) : this.getFreqs(interval);
      const duration = this.getDuration(playbackType);
      const pause = this.getPause(playbackType);
      return { freqs, duration, pause, instrumentType, playbackType };
    }
    return null;
  }

  private getDuration(playbackType: PlaybackType) {
    switch (playbackType) {
      case 'sequential':
        return 1.25;
      case 'simultaneous':
        return 2;
    }
  }

  private getPause(playbackType: PlaybackType) {
    switch (playbackType) {
      case 'sequential':
        return 0.1;
      case 'simultaneous':
        return 0;
    }

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
