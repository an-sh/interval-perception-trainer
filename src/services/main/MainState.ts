import { levelMsgs, tableMsgs } from '@/models/events';
import { BrowserWindow } from 'electron';
import { combineLatest, merge, Subject, Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { Inject, Service, Token } from 'typedi';
import { CommMainToken, ICommMain } from './CommMain';
import { DataLoaderToken, IDataLoader } from './DataLoader';

export const MainStateToken = new Token<IMainState>();
export type IMainState = MainState;

@Service(MainStateToken)
class MainState {
  private window$ = new Subject<BrowserWindow>();
  private pipelinesSubscription: Subscription | null = null;

  constructor(
    @Inject(DataLoaderToken) private loader: IDataLoader,
    @Inject(CommMainToken) private comm: ICommMain,
  ) { }

  changeWindow(window: BrowserWindow | null) {
    if (window) {
      if (!this.pipelinesSubscription) {
        this.init();
      }
      this.window$.next(window);
    }
  }

  destroy() {
    this.pipelinesSubscription?.unsubscribe();
    this.pipelinesSubscription = null;
  }

  private init() {
    const getTablePipeline$ = combineLatest([
      this.window$,
      this.comm.listen(tableMsgs.request).pipe(
        switchMap(() => this.loader.getTable()),
      )],
    ).pipe(
      tap(([window, table]) => this.comm.send(window, tableMsgs.response, table))
    );

    const getLevelsPipeline$ = combineLatest([
      this.window$,
      this.comm.listen(levelMsgs.request).pipe(
        switchMap(() => this.loader.getLevels()),
      )],
    ).pipe(
      tap(([window, table]) => this.comm.send(window, levelMsgs.response, table))
    );

    this.pipelinesSubscription = merge(getTablePipeline$, getLevelsPipeline$).subscribe();
  }

}
