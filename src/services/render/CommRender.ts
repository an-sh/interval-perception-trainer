import { ipcRenderer, IpcRendererEvent } from 'electron';
import { fromEvent, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Service, Token } from 'typedi';

export const CommRenderToken = new Token<ICommRender>();
export type ICommRender = CommRender;

@Service(CommRenderToken)
class CommRender {
  send<T = any>(name: string, data?: T) {
    // console.log(name, data);
    ipcRenderer.send(name, data);
  }

  listen<T = any>(name: string): Observable<T> {
    return fromEvent<[IpcRendererEvent, T]>(ipcRenderer, name).pipe(map(([, data]) => data));
  }
}
