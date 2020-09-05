import { Service, Token } from 'typedi';

export const NotationConverterToken = new Token<INotationConverter>();
export type INotationConverter = NotationConverter;

@Service(NotationConverterToken)
class NotationConverter {
  private intervalDescriptions = [
    {
      id: 0,
      name: 'Unison (1/1)',
      ratio: 1,
    },
    {
      id: 1,
      name: 'Minor Second (16/15)',
      ratio: 16 / 15,
    },
    {
      id: 2,
      name: 'Major Second (9/8)',
      ratio: 9 / 8,
    },
    {
      id: 3,
      name: 'Minor Third (6/5)',
      ratio: 6 / 5,
    },
    {
      id: 4,
      name: 'Major Third (5/4)',
      ratio: 5 / 4,
    },
    {
      id: 5,
      name: 'Perfect Fourth (4/3)',
      ratio: 4 / 3,
    },
    {
      id: 6,
      name: 'Triton (45/32)',
      ratio: 45 / 32,
    },
    {
      id: 7,
      name: 'Perfect Fifth (3/2)',
      ratio: 3 / 2,
    },
    {
      id: 8,
      name: 'Minor Sixth (8/5)',
      ratio: 8 / 5,
    },
    {
      id: 9,
      name: 'Major Sixth (5/3)',
      ratio: 5 / 3,
    },
    {
      id: 10,
      name: 'Minor Seventh (9/5)',
      ratio: 9 / 5,
    },
    {
      id: 11,
      name: 'Major Seventh (15/8)',
      ratio: 15 / 8,
    },
    {
      id: 12,
      name: 'Octave (2/1)',
      ratio: 2,
    }
  ]

  private noteNames = [
    'A', 'A♯', 'B', 'C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯',
  ];

  private getIntervalDescr(id: number) {
    return this.intervalDescriptions.find(i => i.id === id);
  }

  getFreqByNumber(pianoNote: number) {
    return 440 * Math.pow((Math.pow(2, 1 / 12)), pianoNote - 49);
  }

  getNoteName(pianoNote: number) {
    const sz = this.noteNames.length;
    const note = this.noteNames[(pianoNote - 1) % sz];
    const octave = Math.floor((pianoNote + 8) / sz);
    return `${note}${octave}`;
  }

  getPerfectRatio(freq: number, intervalId: number) {
    const data = this.getIntervalDescr(intervalId);
    return data!.ratio * freq;
  }

  getIntervalName(intervalId: number) {
    const data = this.getIntervalDescr(intervalId);
    return data!.name;
  }

  getIntervals() {
    return this.intervalDescriptions;
  }
}
