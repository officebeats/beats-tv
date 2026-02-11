/*
 * Beats TV - Premium IPTV Player
 * PlaylistService - High-level playlist operations
 *
 * This service provides the API for playlist operations, delegating
 * complex logic to PlaylistManagerService for enterprise-grade reliability.
 */

import { Injectable } from '@angular/core';
import { TauriService } from './tauri.service';
import { Filters } from '../models/filters';
import { Channel } from '../models/channel';
import { PlaylistManagerService } from './playlist-manager.service';
import { EpgService } from './epg.service';

@Injectable({
  providedIn: 'root',
})
export class PlaylistService {
  constructor(
    private tauri: TauriService,
    private manager: PlaylistManagerService,
    private epg: EpgService,
  ) {}

  /**
   * Load channels based on filters
   * @param filters - Search/filter criteria
   */
  async loadChannels(filters: Filters): Promise<Channel[]> {
    try {
      const channels = await this.tauri.call<Channel[]>('load_channels', { filters });
      return channels;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresh all enabled playlists
   * Delegates to PlaylistManagerService for robust handling
   */
  async refreshAll(): Promise<void> {
    await this.manager.refreshAll();
  }

  /**
   * Check EPG data on startup
   */
  async checkEpgOnStart(): Promise<void> {
    return await this.epg.checkEpgOnStart();
  }

  /**
   * Bulk update channels (hide, favorite, etc.)
   */
  async bulkUpdate(filters: Filters, action: number): Promise<void> {
    try {
      await this.tauri.call<void>('bulk_update', { filters, action });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Hide or unhide a channel
   */
  async hideChannel(id: number, hidden: boolean): Promise<void> {
    try {
      await this.tauri.call<void>('hide_channel', { id, hidden });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add channel to favorites
   */
  async favoriteChannel(channelId: number): Promise<void> {
    try {
      await this.tauri.call<void>('favorite_channel', { channelId });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove channel from favorites
   */
  async unfavoriteChannel(channelId: number): Promise<void> {
    try {
      await this.tauri.call<void>('unfavorite_channel', { channelId });
    } catch (error) {
      throw error;
    }
  }

  // Expose manager observables for UI components
  get progress$() {
    return this.manager.progress$;
  }

  get isRefreshing$() {
    return this.manager.isRefreshing$;
  }

  get operationLog$() {
    return this.manager.operationLog$;
  }
}
