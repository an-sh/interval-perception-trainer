import { Interval } from '@/models/Interval';
import { Inject, Service, Token } from 'typedi';
import { INotationConverter, NotationConverterToken } from './NotationConverter';

export const IntervalGeneratorToken = new Token<IntervalGenerator>();
export type IIntervalGenerator = IntervalGenerator;

@Service(IntervalGeneratorToken)
class IntervalGenerator {
  constructor(
    @Inject(NotationConverterToken) private notationConverter: INotationConverter,
  ) { }

  private getRandomNumber(minimum: number, maximum: number) {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
  }

  getDiadInterval(avalaibleIds: number[]): Interval {
    const root = this.getRandomNumber(28, 52);
    const idx = this.getRandomNumber(0, avalaibleIds.length - 1);
    const interval = avalaibleIds[idx];
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
