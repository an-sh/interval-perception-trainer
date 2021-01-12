import { InstrumentType } from './SampleTable';

export const playbackTypes = ['simultaneous', 'sequential'] as const;
export type PlaybackType = typeof playbackTypes[number];

export const groupTypes = ['consonant', 'dissonant', 'all'] as const;
export type GroupType = typeof groupTypes[number];

export interface Level {
  id: number,
  name: string,
  group: GroupType,
  intervals: number[],
}

export interface RootRange {
  id: string,
  name: string;
  range?: [number, number],
  customRoots?: number[];
  isCustom: boolean,
}

export interface PlayerLevel extends Level {
  instrumentType: InstrumentType,
  playbackType: PlaybackType;
  rootRange: RootRange;
  isPerfect: boolean;
}

export interface CustomRoot {
  name: string;
  note: number;
}

export interface Levels {
  diads: Level[];
}
