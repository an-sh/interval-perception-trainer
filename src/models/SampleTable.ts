
export type InstrumentType = 'piano' | 'sine';

export interface SampleData { freq: number, data: Uint8Array };

export interface SampleTable {
  instrument: InstrumentType;
  samples: SampleData[];
}
