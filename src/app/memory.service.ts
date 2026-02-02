import { Injectable } from '@angular/core';
import { Source } from './models/source';
import { BehaviorSubject, Subject } from 'rxjs';
import { MatMenuTrigger } from '@angular/material/menu';
import { ToastrService } from 'ngx-toastr';
import { ErrorService } from './error.service';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TauriService } from './services/tauri.service';
import { SortType } from './models/sortType';
import { LAST_SEEN_VERSION } from './models/localStorage';
import { SetNodeDTO } from './models/setNodeDTO';

@Injectable({
  providedIn: 'root',
})
export class MemoryService {
  constructor(
    private toastr: ToastrService,
    private error: ErrorService,
    private tauri: TauriService,
  ) {
    this.tauri.call<boolean>('is_container').then((val) => (this.IsContainer = val));
  }
  public SetNode: Subject<SetNodeDTO> = new Subject();
  public SetFocus: Subject<number> = new Subject();
  public Sort: BehaviorSubject<[number, boolean]> = new BehaviorSubject<[number, boolean]>([
    SortType.provider,
    false,
  ]);
  public Sources: Map<number, Source> = new Map();
  public currentContextMenu?: MatMenuTrigger;
  public Loading = false;
  public Refresh: Subject<boolean> = new Subject();
  public RefreshSources: Subject<boolean> = new Subject();
  public AddingAdditionalSource = false;
  public SeriesRefreshed: Map<number, boolean> = new Map();
  public HideChannels: Subject<boolean> = new Subject();
  public CustomSourceIds: Set<number> = new Set();
  public XtreamSourceIds: Set<number> = new Set();
  public ModalRef?: NgbModalRef;
  public Watched_epgs: Set<string> = new Set();
  private downloadingChannels: Map<number, [number, Subject<boolean>]> = new Map();
  public LoadingNotification: boolean = false;
  public IsRefreshing: boolean = false;
  // public RefreshStatus: string = ''; // Deprecated
  public RefreshPlaylist: string = '';
  public RefreshActivity: string = '';
  public RefreshPercent: number = 0;

  public RefreshCurrent: number = 0;
  public RefreshTotal: number = 0;
  public AppVersion?: string;
  public trayEnabled?: boolean;
  public IsContainer?: boolean;
  public AlwaysAskSave?: boolean;
  public settings: any = {};

  async tryIPC<T>(
    successMessage: string,
    errorMessage: string,
    action: () => Promise<T>,
  ): Promise<boolean> {
    this.Loading = true;
    let error = false;
    try {
      await action();
      this.toastr.success(successMessage);
    } catch (e) {
      this.error.handleError(e, errorMessage);
      error = true;
    }
    this.Loading = false;
    return error;
  }

  async get_epg_ids() {
    let data = await this.tauri.call<string[]>('get_epg_ids');
    let set = new Set(data);
    this.Watched_epgs = set;
  }

  addDownloadingChannel(id: number) {
    this.downloadingChannels.set(id, [0, new Subject()]);
  }

  notifyDownloadFinished(id: number) {
    this.downloadingChannels.get(id)?.[1].next(true);
  }

  removeDownloadingChannel(id: number) {
    this.downloadingChannels.delete(id);
  }

  downloadExists(id: number) {
    return this.downloadingChannels.has(id);
  }

  getDownload(id: number) {
    return this.downloadingChannels.get(id);
  }

  setLastDownloadProgress(id: number, progress: number) {
    this.downloadingChannels.get(id)![0] = progress;
  }

  updateVersion() {
    if (this.AppVersion) localStorage.setItem(LAST_SEEN_VERSION, this.AppVersion);
  }
}
