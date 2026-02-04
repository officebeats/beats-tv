import { Injectable } from '@angular/core';
import { TauriService } from './tauri.service';
import { Channel } from '../models/channel';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  constructor(private tauri: TauriService) {}

  async play(channel: Channel, record: boolean = false, recordPath?: string): Promise<void> {
    // Validate channel before playing
    if (!Channel.isValidForPlayback(channel)) {
      throw new Error('Invalid channel: missing required fields (url or name)');
    }
    
    if (!Channel.isValidUrl(channel.url)) {
      throw new Error('Invalid channel URL: must be a valid HTTP or HTTPS URL');
    }
    
    return await this.tauri.call<void>('play', { channel, record, recordPath });
  }

  async addLastWatched(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('Invalid channel ID');
    }
    return await this.tauri.call<void>('add_last_watched', { id });
  }
}
