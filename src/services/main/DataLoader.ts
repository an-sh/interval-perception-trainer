import { Levels } from '@/models/Levels';
import { InstrumentType, SampleData, SampleTable } from '@/models/SampleTable';
import * as fs from 'fs';
import path from 'path';
import { from, Observable } from 'rxjs';
import { map, mergeMap, reduce } from 'rxjs/operators';
import { Service, Token } from 'typedi';

declare const __static: string;

export const DataLoaderToken = new Token<IDataLoader>();
export type IDataLoader = DataLoader;

@Service(DataLoaderToken)
class DataLoader {
  getTable(instrument: InstrumentType = 'piano'): Observable<SampleTable> {
    const dataPath = path.join(__static, `/samples/${instrument}`);
    const metaPath = path.join(dataPath, 'meta.json');
    const table$ = from(fs.promises.readFile(metaPath)).pipe(
      mergeMap((metadata: any) => {
        const { mappings }: { mappings: { [key: string]: number; } } = JSON.parse(metadata);
        const entries = Object.entries(mappings);
        return from(entries).pipe(
          mergeMap(([fileName, freq]) => {
            return from(fs.promises.readFile(path.join(dataPath, fileName))).pipe(
              map(buffer => [freq, buffer] as const),
            );
          }, 5),
        );
      }),
      reduce((acc, [freq, data]) => [...acc, { freq, data }], [] as SampleData[]),
      map(samples => ({ instrument, samples })),
    );
    return table$;
  }

  getLevels(): Observable<Levels> {
    const dataPath = path.join(__static, `/levels.json`);
    return from(fs.promises.readFile(dataPath)).pipe(
      map((data: any) => JSON.parse(data)),
    );
  }
}
