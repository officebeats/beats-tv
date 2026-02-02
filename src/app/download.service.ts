import { Injectable } from '@angular/core';
import { Download } from './models/download';
import { Subject } from 'rxjs';
import { ErrorService } from './error.service';
import { Channel } from './models/channel';
import { TauriService } from './services/tauri.service';

@Injectable({
  providedIn: 'root',
})
export class DownloadService {
  Downloads: Map<String, Download> = new Map();

  constructor(
    private error: ErrorService,
    private tauri: TauriService,
  ) {}

  async addDownload(id: string, channel: Channel): Promise<Download> {
    let download: Download = {
      channel: channel,
      progress: 0,
      complete: new Subject(),
      id: id,
      progressUpdate: new Subject(),
    };
    download.unlisten = await this.tauri.on<number>(`progress-${download.id}`, (payload) => {
      download.progress = payload;
      download.progressUpdate.next(download.progress);
    });
    this.Downloads.set(download.id, download);
    return download;
  }

  async abortDownload(id: String) {
    try {
      let download = this.Downloads.get(id);
      if (download) {
        await this.tauri.call('abort_download', {
          sourceId: download.channel.source_id,
          downloadId: download.id,
        });
        this.deleteDownload(download);
      }
    } catch (e) {
      console.error(e);
      this.error.handleError(e);
    }
  }

  async download(id: String, path?: string) {
    const download = this.Downloads.get(id);
    if (!download) {
      this.error.handleError(new Error('Download not found'), 'Download not found');
      return;
    }
    try {
      await this.tauri.call('download', {
        downloadId: download.id,
        channel: download.channel,
        path: path,
      });
      this.error.success('Download completed successfully');
    } catch (e) {
      if (e == 'download aborted') this.error.info('Download cancelled');
      else this.error.handleError(e);
    }
    this.deleteDownload(download);
  }

  deleteDownload(download: Download) {
    download.complete.next(true);
    try {
      download.unlisten!();
    } catch (e) {
      console.error(e);
    }
    this.Downloads.delete(download.id);
  }
}
