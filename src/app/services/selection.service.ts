import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, forkJoin, lastValueFrom } from 'rxjs';
import { Channel } from '../models/channel';
import { BulkActionType } from '../models/bulkActionType';
import { PlaylistService } from './playlist.service';
import { Filters } from '../models/filters';
import { MemoryService } from '../memory.service';

/**
 * SelectionService
 * 
 * Manages multi-select mode and bulk operations on channels.
 * Extracted from HomeComponent to improve separation of concerns and testability.
 */
@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  // Selection state
  private selectionModeSubject = new BehaviorSubject<boolean>(false);
  private selectedChannelsSubject = new BehaviorSubject<Set<number>>(new Set());

  // Observables
  public selectionMode$: Observable<boolean> = this.selectionModeSubject.asObservable();
  public selectedChannels$: Observable<Set<number>> = this.selectedChannelsSubject.asObservable();

  constructor(
    private playlistService: PlaylistService,
    private memory: MemoryService,
  ) {}

  // ─── Selection Mode ──────────────────────────────────────────────────────

  /**
   * Get current selection mode state
   */
  get selectionMode(): boolean {
    return this.selectionModeSubject.value;
  }

  /**
   * Get currently selected channels
   */
  get selectedChannels(): Set<number> {
    return this.selectedChannelsSubject.value;
  }

  /**
   * Get count of selected channels
   */
  get selectedCount(): number {
    return this.selectedChannels.size;
  }

  /**
   * Toggle selection mode on/off
   * When disabled, clears all selections
   */
  toggleSelectionMode(): void {
    const newMode = !this.selectionMode;
    this.selectionModeSubject.next(newMode);
    
    if (!newMode) {
      this.clearSelection();
    }
  }

  /**
   * Enable selection mode
   */
  enableSelectionMode(): void {
    this.selectionModeSubject.next(true);
  }

  /**
   * Disable selection mode and clear selections
   */
  disableSelectionMode(): void {
    this.selectionModeSubject.next(false);
    this.clearSelection();
  }

  // ─── Channel Selection ───────────────────────────────────────────────────

  /**
   * Toggle selection state of a specific channel
   * @param id Channel ID to toggle
   */
  toggleChannelSelection(id: number): void {
    const selected = new Set(this.selectedChannels);
    
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    
    this.selectedChannelsSubject.next(selected);
  }

  /**
   * Select a specific channel
   * @param id Channel ID to select
   */
  selectChannel(id: number): void {
    const selected = new Set(this.selectedChannels);
    selected.add(id);
    this.selectedChannelsSubject.next(selected);
  }

  /**
   * Deselect a specific channel
   * @param id Channel ID to deselect
   */
  deselectChannel(id: number): void {
    const selected = new Set(this.selectedChannels);
    selected.delete(id);
    this.selectedChannelsSubject.next(selected);
  }

  /**
   * Check if a channel is selected
   * @param id Channel ID to check
   */
  isChannelSelected(id: number): boolean {
    return this.selectedChannels.has(id);
  }

  /**
   * Clear all selected channels
   */
  clearSelection(): void {
    this.selectedChannelsSubject.next(new Set());
  }

  /**
   * Select all channels from a list
   * @param channels Array of channels to select
   */
  selectAll(channels: Channel[]): void {
    const selected = new Set(this.selectedChannels);
    
    channels.forEach((channel) => {
      if (channel.id !== undefined) {
        selected.add(channel.id);
      }
    });
    
    this.selectedChannelsSubject.next(selected);
  }

  /**
   * Select multiple channels by IDs
   * @param ids Array of channel IDs to select
   */
  selectMultiple(ids: number[]): void {
    const selected = new Set(this.selectedChannels);
    ids.forEach(id => selected.add(id));
    this.selectedChannelsSubject.next(selected);
  }

  /**
   * Deselect multiple channels by IDs
   * @param ids Array of channel IDs to deselect
   */
  deselectMultiple(ids: number[]): void {
    const selected = new Set(this.selectedChannels);
    ids.forEach(id => selected.delete(id));
    this.selectedChannelsSubject.next(selected);
  }

  /**
   * Get array of selected channel IDs
   */
  getSelectedIds(): number[] {
    return Array.from(this.selectedChannels);
  }

  /**
   * Check if any channels are selected
   */
  hasSelection(): boolean {
    return this.selectedChannels.size > 0;
  }

  // ─── Bulk Operations ─────────────────────────────────────────────────────

  /**
   * Get selected channels from a list
   * @param channels Array of all channels
   * @returns Array of selected channels
   */
  getSelectedChannels(channels: Channel[]): Channel[] {
    return channels.filter(channel => 
      channel.id !== undefined && this.isChannelSelected(channel.id)
    );
  }

  /**
   * Invert selection (select unselected, deselect selected)
   * @param channels Array of all channels
   */
  invertSelection(channels: Channel[]): void {
    const selected = new Set<number>();
    
    channels.forEach((channel) => {
      if (channel.id !== undefined) {
        if (!this.isChannelSelected(channel.id)) {
          selected.add(channel.id);
        }
      }
    });
    
    this.selectedChannelsSubject.next(selected);
  }

  /**
   * Select channels matching a predicate
   * @param channels Array of all channels
   * @param predicate Function to test each channel
   */
  selectWhere(channels: Channel[], predicate: (channel: Channel) => boolean): void {
    const selected = new Set(this.selectedChannels);
    
    channels.forEach((channel) => {
      if (channel.id !== undefined && predicate(channel)) {
        selected.add(channel.id);
      }
    });
    
    this.selectedChannelsSubject.next(selected);
  }

  // ─── Bulk Operations (with PlaylistService) ─────────────────────────────

  /**
   * Execute a bulk action on the currently selected channels
   * @param action The type of action to perform
   */
  async bulkAction(action: BulkActionType): Promise<void> {
    if (this.selectedCount === 0) return;

    try {
      this.memory.Loading = true;
      const ids = this.getSelectedIds();

      const promises = [];
      for (const id of ids) {
        if (action === BulkActionType.Hide) {
          promises.push(from(this.playlistService.hideChannel(id, true)));
        } else if (action === BulkActionType.Unhide) {
          promises.push(from(this.playlistService.hideChannel(id, false)));
        } else if (action === BulkActionType.Favorite) {
          promises.push(from(this.playlistService.favoriteChannel(id)));
        } else if (action === BulkActionType.Unfavorite) {
          promises.push(from(this.playlistService.unfavoriteChannel(id)));
        }
      }

      await lastValueFrom(forkJoin(promises));
      this.clearSelection();
    } catch (e) {
      throw e;
    } finally {
      this.memory.Loading = false;
    }
  }

  /**
   * Unhides selected channels and hides all other channels in the currently active sources.
   * This effectively "whitelists" the selection.
   */
  async whitelistSelected(): Promise<void> {
    if (this.selectedCount === 0) return;

    try {
      this.memory.Loading = true;
      const selectedIds = this.getSelectedIds();
      const sourceIds = this.memory.Sources.size > 0 ? Array.from(this.memory.Sources.keys()) : [];

      if (sourceIds.length === 0) return;

      // 1. Unhide all selected
      const unhidePromises = selectedIds.map((id) =>
        from(this.playlistService.hideChannel(id, false)),
      );

      // 2. Hide everything else in these sources
      // We'll create a special filter for 'everything else'
      const hideOthersFilter: Filters = {
        source_ids: sourceIds,
        query: '', // All channels
        view_type: 0, // All
        media_types: [], // All media types
        page: 1,
        use_keywords: false,
        sort: 0,
        show_hidden: false,
      };

      // Step A: Hide all in sources matching general filters (Live/Movie/Serie)
      await this.playlistService.bulkUpdate(
        { ...hideOthersFilter, query: undefined },
        BulkActionType.Hide,
      );

      // Step B: Unhide selected (parallel)
      await lastValueFrom(forkJoin(unhidePromises));

      this.clearSelection();
    } catch (e) {
      throw e;
    } finally {
      this.memory.Loading = false;
    }
  }

  // ─── Reset ───────────────────────────────────────────────────────────────

  /**
   * Reset selection service to default state
   */
  reset(): void {
    this.selectionModeSubject.next(false);
    this.selectedChannelsSubject.next(new Set());
  }

  // ─── Statistics ──────────────────────────────────────────────────────────

  /**
   * Get selection statistics
   * @param channels Array of all channels
   */
  getSelectionStats(channels: Channel[]): {
    total: number;
    selected: number;
    percentage: number;
  } {
    const total = channels.length;
    const selected = this.selectedCount;
    const percentage = total > 0 ? (selected / total) * 100 : 0;
    
    return { total, selected, percentage };
  }
}
