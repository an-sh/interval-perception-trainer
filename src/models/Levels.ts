import { InstrumentType } from './SampleTable';

export type PlaybackType = 'simultaneous' | 'sequential';

export interface Level {
  id: number,
  name: string,
  intervals: number[],
  confidenceDistance: number,
  confidenceThreshold: number,
}

export interface PlayerLevel extends Level {
  instrumentType: InstrumentType,
  playbackType: PlaybackType;
}

export interface Levels {
  diads: Level[];
}
