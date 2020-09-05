
export type LevelType = 'simultaneous' | 'sequential';

export interface Level {
  id: number,
  name: string,
  intervals: number[],
  confidenceDistance: number,
  confidenceThreshold: number,
}

export interface PlayerLevel extends Level {
  type: LevelType;
}

export interface Levels {
  diads: Level[];
}
