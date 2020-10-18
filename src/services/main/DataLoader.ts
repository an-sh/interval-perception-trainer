import { Levels } from '@/models/Levels';
import { SampleData, sampledInstrumentTypes, SampleTable } from '@/models/SampleTable';
import * as fs from 'fs';
import path from 'path';
import { from, Observable } from 'rxjs';
import { concatMap, map, mergeMap, reduce } from 'rxjs/operators';
import { Inject, Service, Token } from 'typedi';
import { INotationConverter, NotationConverterToken } from '../shared';

declare const __static: string;

export const DataLoaderToken = new Token<IDataLoader>();
export type IDataLoader = DataLoader;

@Service(DataLoaderToken)
class DataLoader {
  private readonly loadingLimit = 5;

  constructor(
    @Inject(NotationConverterToken) private notation: INotationConverter,
  ) { }

  getTables(): Observable<SampleTable> {
    const dataPaths = sampledInstrumentTypes.map(instrument => [instrument, path.join(__static, `/samples/${instrument}`)] as const);
    const table$ = from(dataPaths).pipe(
      concatMap(([instrument, dataPath]) => from(fs.promises.readdir(dataPath)).pipe(
        map(files => ({ instrument, dataPath, files })),
        concatMap((intrumentInfo) => {
          const noteInfos = intrumentInfo.files.map((fileName) => {
            const note = parseInt(path.basename(fileName), 10);
            const freq = this.notation.getFreqByNumber(note);
            return { freq, fileName };
          });
          return from(noteInfos).pipe(
            mergeMap(({ freq, fileName }) => {
              return from(fs.promises.readFile(path.join(dataPath, fileName))).pipe(
                map(buffer => [freq, buffer] as const),
              );
            }, this.loadingLimit),
          );
        }),
        reduce((acc, [freq, data]) => [...acc, { freq, data }], [] as SampleData[]),
        map(samples => ({ instrument, samples })),
      )),
      reduce((acc, instrumentData) => ({ ...acc, [instrumentData.instrument]: { samples: instrumentData.samples } }), {} as SampleTable),
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
