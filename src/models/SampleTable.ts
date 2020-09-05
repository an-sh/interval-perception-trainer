
export type InstrumentType = 'piano';

export interface SampleData { freq: number, data: Uint8Array };

export interface SampleTable {
  instrument: InstrumentType;
  samples: SampleData[];
}
