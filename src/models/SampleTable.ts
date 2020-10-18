
export const instrumentTypes = ['piano', 'harpsichord', 'organ', 'mixed', 'sine'] as const;
export const sampledInstrumentTypes = ['piano', 'harpsichord', 'organ'] as const;

export type SampledInstrumentType = typeof sampledInstrumentTypes[number];
export type InstrumentType = typeof instrumentTypes[number];

export interface SampleData { freq: number, data: Uint8Array };

export type SampleTable = {
  [idx in InstrumentType]: {
    samples: SampleData[];
  }
}
