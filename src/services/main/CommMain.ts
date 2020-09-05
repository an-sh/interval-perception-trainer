import { BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import { fromEvent, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Service, Token } from 'typedi';

export const CommMainToken = new Token<ICommMain>();
export type ICommMain = CommMain;

@Service(CommMainToken)
class CommMain {
  send<T = any>(win: BrowserWindow, name: string, data?: T) {
    // console.log(name, data);
    win.webContents.send(name, data);
  }

  listen<T = any>(name: string): Observable<T> {
    return fromEvent<[IpcMainEvent, T]>(ipcMain, name).pipe(map(([, data]) => data));
  }
}
