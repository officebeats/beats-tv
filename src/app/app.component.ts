/**
 * Beats TV - Premium IPTV Player
 * Copyright (C) 2026 Beats TV Team
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * This project is a fork of Open TV by Fredolx.
 */

import { Component, HostListener, OnInit } from '@angular/core';
import { DownloadService } from './download.service';
import { MemoryService } from './memory.service';
import { Settings } from './models/settings';
import { TauriService } from './services/tauri.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'open-tv';

  constructor(
    private download: DownloadService,
    public memory: MemoryService,
    private tauri: TauriService,
  ) {}

  ngOnInit(): void {
    console.log('[AppComponent] ngOnInit - App starting...');
    this.applyTheme();

    // Listen for progress updates from backend via TauriService
    this.tauri.on<string>('refresh-progress', (payload) => {
      try {
        const data = JSON.parse(payload);
        this.memory.RefreshPlaylist = data.playlist;
        this.memory.RefreshActivity = data.activity;
        this.memory.RefreshPercent = data.percent;
      } catch {
        this.memory.RefreshActivity = payload;
      }
    });

    this.tauri.on<void>('refresh-start', () => {
      this.memory.IsRefreshing = true;
      this.memory.RefreshPercent = 0;
    });

    this.tauri.on<void>('refresh-end', () => {
      this.memory.IsRefreshing = false;
      this.memory.RefreshPlaylist = '';
      this.memory.RefreshActivity = '';
      this.memory.RefreshPercent = 0;
    });
  }

  applyTheme(): void {
    this.tauri
      .call<Settings>('get_settings')
      .then((settings) => {
        console.log('Settings loaded:', settings);
        // Consistently use 0: Smooth Glass, 1: Matrix Terminal
        const themeClasses = ['theme-smooth-glass', 'theme-matrix-terminal'];

        // Detect current class on body for defensive check
        const hasMatrix = document.body.classList.contains('theme-matrix-terminal');
        const hasGlass = document.body.classList.contains('theme-smooth-glass');

        let rawTheme = settings.theme ?? 0;
        let themeId = rawTheme;

        // --- THEME MIGRATION LOGIC ---
        // Old Mapping: 0=Clay (Red), 1=Glass (Blue), 2=Matrix (Green)
        // New Mapping: 0=Glass (Blue), 1=Matrix (Green)

        // If user was on old index 1 (Glass), move to 0.
        // If user was on old index 2 (Matrix), move to 1.
        // If user was on old index 0 (Clay), move to 0.
        if (rawTheme === 1) themeId = 0;
        else if (rawTheme === 2) themeId = 1;
        else if (rawTheme > 2) themeId = 0;

        console.log('[AppComponent] Migration: raw', rawTheme, 'mapped to', themeId);

        document.body.classList.remove('theme-clay-mation', ...themeClasses);
        document.body.classList.add(themeClasses[themeId]);
      })
      .catch((err) => console.error('[AppComponent] Error getting settings for theme:', err));
  }

  @HostListener('document:contextmenu', ['$event'])
  onRightClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.isInsideMenuTrigger(target)) {
      return;
    }
    event.preventDefault();
  }

  private isInsideMenuTrigger(element: HTMLElement): boolean {
    return !!element.closest('[mat-menu-trigger-for], [matMenuTriggerFor]');
  }

  showDownloadManager() {
    return this.download.Downloads.size > 0;
  }
}
