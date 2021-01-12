import { getRandomNumber } from '@/lib/utils';
import { Interval } from '@/models/Interval';
import { RootRange } from '@/models/Levels';
import { Inject, Service, Token } from 'typedi';
import { INotationConverter, NotationConverterToken } from './NotationConverter';

export const IntervalGeneratorToken = new Token<IntervalGenerator>();
export type IIntervalGenerator = IntervalGenerator;

@Service(IntervalGeneratorToken)
class IntervalGenerator {
  constructor(
    @Inject(NotationConverterToken) private notationConverter: INotationConverter,
  ) { }

  getDiadInterval(avalaibleIntervalIds: number[], rootRange: RootRange, fixedRoot?: number): Interval {
    let root: number;
    if (fixedRoot != null) {
      root = fixedRoot;
    } else if (rootRange.isCustom) {
      const roots = rootRange.customRoots!;
      const len = roots.length;
      if (len) {
        const index = getRandomNumber(0, len - 1);
        root = roots[index];
      } else {
        root = 40; // fallback middle C
      }
    } else {
      const [min, max] = rootRange.range!;
      root = getRandomNumber(min, max);
    }
    const idx = getRandomNumber(0, avalaibleIntervalIds.length - 1);
    const interval = avalaibleIntervalIds[idx];
    const note = root + interval;
    const notes = [note];
    const rootFreq = this.notationConverter.getFreqByNumber(root);
    const noteFreqs = [this.notationConverter.getFreqByNumber(note)];
    const perfectFreqs = [this.notationConverter.getPerfectRatio(rootFreq, interval)];
    const rootName = this.notationConverter.getNoteName(root);
    const noteNames = [this.notationConverter.getNoteName(note)];

    const name = this.notationConverter.getIntervalName(interval);
    return {
      rootFreq,
      noteFreqs,
      perfectFreqs,
      root,
      notes,
      rootName,
      noteNames,
      name,
      interval,
    };
  }

}
