/*
 * Beats TV - Premium IPTV Player
 * EpgService - EPG (Electronic Program Guide) operations
 *
 * This service provides dedicated EPG management functionality,
 * extracted from PlaylistService for better separation of concerns.
 */

import { Injectable } from '@angular/core';
import { TauriService } from './tauri.service';

@Injectable({
  providedIn: 'root',
})
export class EpgService {
  constructor(private tauri: TauriService) {}

  /**
   * Get all available EPG IDs
   * @returns Promise resolving to array of EPG IDs
   */
  async getEpgIds(): Promise<string[]> {
    return await this.tauri.call<string[]>('get_epg_ids');
  }

  /**
   * Set EPG active status
   * @param id - EPG ID to update
   * @param active - Whether to activate or deactivate
   * @returns Promise resolving when operation completes
   */
  async setEpgActive(id: string, active: boolean): Promise<void> {
    return await this.tauri.call<void>('set_epg_active', { id, active });
  }

  /**
   * Check EPG data on startup
   * @returns Promise resolving when check completes
   */
  async checkEpgOnStart(): Promise<void> {
    try {
      await this.tauri.call<void>('on_start_check_epg');
    } catch (error) {
      // Don't throw - EPG is optional
    }
  }
}
