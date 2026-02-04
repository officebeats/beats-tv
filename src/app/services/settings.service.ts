import { Injectable } from '@angular/core';
import { TauriService } from './tauri.service';
import { Settings } from '../models/settings';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  constructor(private tauri: TauriService) {}

  async getSettings(): Promise<Settings> {
    return await this.tauri.call<Settings>('get_settings');
  }

  async updateSettings(settings: Settings): Promise<void> {
    // Validate settings before saving
    const validationErrors = Settings.validate(settings);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid settings: ${validationErrors.join(', ')}`);
    }
    
    // Sanitize MPV params
    if (settings.mpv_params) {
      settings.mpv_params = Settings.sanitizeMpvParams(settings.mpv_params);
    }
    
    return await this.tauri.call<void>('update_settings', { settings });
  }

  async isContainer(): Promise<boolean> {
    return await this.tauri.call<boolean>('is_container');
  }
}
