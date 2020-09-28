import { InstrumentType } from './SampleTable';

export type PlaybackType = 'simultaneous' | 'sequential';
export type GroupType = 'consonant' | 'dissonant' | 'all';

export interface Level {
  id: number,
  name: string,
  group: GroupType,
  intervals: number[],
}

export interface RootRange {
  id: string,
  name: string;
  range: [number, number],
}

export interface PlayerLevel extends Level {
  instrumentType: InstrumentType,
  playbackType: PlaybackType;
  rootRange: RootRange;
  isPerfect: boolean;
}

export interface Levels {
  diads: Level[];
}
