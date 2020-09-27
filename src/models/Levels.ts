import { InstrumentType } from './SampleTable';

export type PlaybackType = 'simultaneous' | 'sequential';
export type GroupType = 'consonant' | 'dissonant' | 'all';

export interface Level {
  id: number,
  name: string,
  group: GroupType,
  intervals: number[],
}

export interface PlayerLevel extends Level {
  instrumentType: InstrumentType,
  playbackType: PlaybackType;
}

export interface Levels {
  diads: Level[];
}
