import { PlayerLevel } from '@/models/Levels';
import { Inject, Service, Token } from 'typedi';
import { INotationConverter, NotationConverterToken } from '../shared';

export const StatsTrackerToken = new Token<IStatsTracker>();
export type IStatsTracker = StatsTracker;


export interface TrackerItem {
  id: number;
  name: string;
  count: number;
  ratio: number;
}

export interface TrackerData {
  items: TrackerItem[];
  totalCount: number;
  totalRatio: number;
}

interface TrackerStatsItem {
  id: number;
  name: string;
  correct: number;
  wrong: number;
}

@Service(StatsTrackerToken)
class StatsTracker {
  constructor(
    @Inject(NotationConverterToken) private notation: INotationConverter
  ) { }

  private stats: { [intervalId: number]: TrackerStatsItem } = {};

  public reloadLevel(level: PlayerLevel) {
    this.stats = {};
    for (const intervalId of level.intervals) {
      const name = this.notation.getIntervalName(intervalId);
      this.stats[intervalId] = { id: intervalId, name, correct: 0, wrong: 0 };
    }
  }

  public addItem(intervalId: number, isCorrect: boolean) {
    const item = this.stats[intervalId];
    if (item) {
      if (isCorrect) {
        item.correct++;
      } else {
        item.wrong++;
      }
    }
  }

  public getStatsData(): TrackerData {
    const values = Object.values(this.stats)
    const unorderedItems = values.map((item) => {
      const count = item.correct + item.wrong;
      const ratio = count > 0 ? (item.correct / count) : 0;
      return { id: item.id, count, ratio, name: item.name };
    });
    const items = unorderedItems.sort((a, b) => b.ratio - a.ratio || a.name.localeCompare(b.name));
    const totalStats = values.reduce(
      (acc, val) => {
        acc.correct += val.correct;
        acc.wrong += val.wrong;
        return acc;
      },
      { correct: 0, wrong: 0 },
    );
    const totalCount = totalStats.correct + totalStats.wrong;
    const totalRatio = totalCount > 0 ? totalStats.correct / totalCount : 0;
    return { items, totalCount, totalRatio };
  }
}
