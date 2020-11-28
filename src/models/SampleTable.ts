
export const sampledInstrumentTypes = ['guitar', 'harpsichord', 'organ', 'piano', 'strings', 'violin'] as const;
export const instrumentTypes = [...sampledInstrumentTypes, 'mixed', 'sine'] as const;

export type SampledInstrumentType = typeof sampledInstrumentTypes[number];
export type InstrumentType = typeof instrumentTypes[number];

export interface SampleData { freq: number, data: Uint8Array };

export type SampleTable = {
  [idx in InstrumentType]: {
    samples: SampleData[];
  }
}
