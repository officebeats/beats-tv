import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Channel } from '../models/channel';
import { MediaType } from '../models/mediaType';
import { ViewMode } from '../models/viewMode';
import { Filters } from '../models/filters';
import { SortType } from '../models/sortType';

export interface DetectedPattern {
  prefix: string;
  count: number;
}

export interface FilterState {
  chkLiveStream: boolean;
  chkMovie: boolean;
  chkSerie: boolean;
  currentViewType: ViewMode;
}

/**
 * FilterService
 *
 * Centralized service for managing filter state, media type toggles, and view mode switching.
 * Enhanced to extract filter management logic from HomeComponent.
 */
@Injectable({
  providedIn: 'root',
})
export class FilterService {
  // Filter state
  private filtersSubject = new BehaviorSubject<Filters | null>(null);
  private filterStateSubject = new BehaviorSubject<FilterState>({
    chkLiveStream: true,
    chkMovie: true,
    chkSerie: true,
    currentViewType: ViewMode.All,
  });

  // Observables
  public filters$: Observable<Filters | null> = this.filtersSubject.asObservable();
  public filterState$: Observable<FilterState> = this.filterStateSubject.asObservable();

  // Debounce timer for filter updates
  private filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {}

  // ─── Channel Visibility ──────────────────────────────────────────────────

  /**
   * Check if a channel should be visible based on its hidden status
   */
  isChannelVisible(channel: Channel): boolean {
    return channel.hidden === false || channel.hidden === undefined;
  }

  // ─── Filter State Management ─────────────────────────────────────────────

  /**
   * Get current filters
   */
  get filters(): Filters | null {
    return this.filtersSubject.value;
  }

  /**
   * Set filters
   */
  set filters(value: Filters | null) {
    this.filtersSubject.next(value);
  }

  /**
   * Get current filter state (checkboxes and view type)
   */
  get filterState(): FilterState {
    return this.filterStateSubject.value;
  }

  /**
   * Initialize filters with default values
   */
  initializeFilters(sourceIds: number[], defaultSort?: SortType): Filters {
    const filters: Filters = {
      source_ids: sourceIds,
      view_type: ViewMode.All,
      media_types: [MediaType.livestream, MediaType.movie, MediaType.serie],
      page: 1,
      use_keywords: false,
      sort: defaultSort ?? SortType.provider,
      show_hidden: false,
    };

    this.filters = filters;
    this.updateFilterState({
      chkLiveStream: true,
      chkMovie: true,
      chkSerie: true,
      currentViewType: ViewMode.All,
    });

    return filters;
  }

  /**
   * Update filter state
   */
  updateFilterState(state: Partial<FilterState>): void {
    const currentState = this.filterStateSubject.value;
    this.filterStateSubject.next({ ...currentState, ...state });
  }

  /**
   * Reset filters to default state
   */
  resetFilters(): void {
    if (this.filters) {
      this.filters.page = 1;
      this.filters.query = undefined;
      this.filters.group_id = undefined;
      this.filters.series_id = undefined;
      this.filters.season = undefined;
      this.filters.genre = undefined;
      this.filters.rating_min = undefined;
      this.filters.show_hidden = false;
    }
    this.updateFilterState({
      chkLiveStream: true,
      chkMovie: true,
      chkSerie: true,
    });
  }

  // ─── Media Type Management ───────────────────────────────────────────────

  /**
   * Toggle a media type in the filters
   * @param mediaType The media type to toggle
   * @param debounce Whether to debounce the update (default: true)
   * @returns Whether the media type is now active
   */
  toggleMediaType(mediaType: MediaType, debounce: boolean = true): boolean {
    if (!this.filters) return false;

    const index = this.filters.media_types.indexOf(mediaType);
    if (index === -1) {
      this.filters.media_types.push(mediaType);
    } else {
      this.filters.media_types.splice(index, 1);
    }

    // Sync boolean flags
    this.syncMediaTypeFlags();

    // Update sort for movies-only view
    this.updateSortForMediaType();

    return this.filters.media_types.includes(mediaType);
  }

  /**
   * Set media types directly
   */
  setMediaTypes(mediaTypes: MediaType[]): void {
    if (!this.filters) return;
    this.filters.media_types = mediaTypes;
    this.syncMediaTypeFlags();
  }

  /**
   * Enable all media types
   */
  enableAllMediaTypes(): void {
    if (!this.filters) return;
    this.filters.media_types = [MediaType.livestream, MediaType.movie, MediaType.serie];
    this.syncMediaTypeFlags();
  }

  /**
   * Check if a media type is active
   */
  isMediaTypeActive(mediaType: MediaType): boolean {
    return this.filters?.media_types.includes(mediaType) ?? false;
  }

  /**
   * Sync media type boolean flags with filter state
   */
  private syncMediaTypeFlags(): void {
    if (!this.filters) return;

    this.updateFilterState({
      chkLiveStream: this.filters.media_types.includes(MediaType.livestream),
      chkMovie: this.filters.media_types.includes(MediaType.movie),
      chkSerie: this.filters.media_types.includes(MediaType.serie),
    });
  }

  /**
   * Update sort order based on media type selection
   * Movies-only view defaults to date descending
   */
  private updateSortForMediaType(defaultSort?: SortType): void {
    if (!this.filters) return;

    const state = this.filterStateSubject.value;

    // Default sorting for movies: newest first
    if (state.chkMovie && !state.chkLiveStream && !state.chkSerie) {
      this.filters.sort = SortType.dateDescending;
    } else {
      // Revert to default sort if not strictly movies
      this.filters.sort = defaultSort ?? SortType.provider;
    }
  }

  // ─── View Mode Management ────────────────────────────────────────────────

  /**
   * Switch to a different view mode
   * @param viewMode The view mode to switch to
   * @returns Whether the view mode was changed
   */
  switchViewMode(viewMode: ViewMode): boolean {
    if (!this.filters || this.filters.view_type === viewMode) {
      return false;
    }

    // Clear series/group context when switching modes
    this.filters.series_id = undefined;
    this.filters.group_id = undefined;
    this.filters.view_type = viewMode;
    this.filters.season = undefined;

    this.updateFilterState({ currentViewType: viewMode });

    return true;
  }

  /**
   * Get current view mode
   */
  getCurrentViewMode(): ViewMode {
    return this.filters?.view_type ?? ViewMode.All;
  }

  /**
   * Check if filters are visible (not in series detail view)
   */
  areFiltersVisible(): boolean {
    return !this.filters?.series_id;
  }

  // ─── Query Management ────────────────────────────────────────────────────

  /**
   * Set search query
   */
  setQuery(query: string | undefined): void {
    if (!this.filters) return;
    this.filters.query = Filters.sanitizeQuery(query);
  }

  /**
   * Clear search query
   */
  clearQuery(): void {
    if (!this.filters) return;
    this.filters.query = undefined;
  }

  // ─── Pagination ──────────────────────────────────────────────────────────

  /**
   * Increment page number
   */
  nextPage(): number {
    if (!this.filters) return 1;
    return ++this.filters.page;
  }

  /**
   * Reset to first page
   */
  resetPage(): void {
    if (!this.filters) return;
    this.filters.page = 1;
  }

  /**
   * Get current page
   */
  getCurrentPage(): number {
    return this.filters?.page ?? 1;
  }

  // ─── Advanced Filters ────────────────────────────────────────────────────

  /**
   * Set genre filter
   */
  setGenre(genre: string | undefined): void {
    if (!this.filters) return;
    this.filters.genre = genre || undefined;
  }

  /**
   * Set minimum rating filter
   */
  setMinRating(rating: number | undefined): void {
    if (!this.filters) return;
    this.filters.rating_min = rating && rating > 0 ? rating : undefined;
  }

  /**
   * Toggle keywords search mode
   */
  toggleKeywords(): void {
    if (!this.filters) return;
    this.filters.use_keywords = !this.filters.use_keywords;
  }

  /**
   * Set group filter
   */
  setGroup(groupId: number | undefined): void {
    if (!this.filters) return;
    this.filters.group_id = groupId;
  }

  /**
   * Set series filter
   */
  setSeries(seriesId: number | undefined, sourceIds?: number[]): void {
    if (!this.filters) return;
    this.filters.series_id = seriesId;
    if (sourceIds) {
      this.filters.source_ids = sourceIds;
    }
  }

  /**
   * Set season filter
   */
  setSeason(season: number | undefined): void {
    if (!this.filters) return;
    this.filters.season = season;
  }

  // ─── Smart Category Sorting ──────────────────────────────────────────────

  /**
   * Sort channels with smart category prioritization
   * Prioritizes US/UK/ENGLISH channels when viewing categories
   */
  sortChannelsSmart(channels: Channel[], isCategoryView: boolean, hasQuery: boolean): Channel[] {
    if (!isCategoryView || hasQuery) {
      return channels;
    }

    return [...channels].sort((a, b) => {
      const nameA = (a.name || '').toUpperCase();
      const nameB = (b.name || '').toUpperCase();

      const priorityRegex = /(USA|US|UK|ENGLISH|ENGLAND|BRITISH)/;
      const aIsPriority = priorityRegex.test(nameA);
      const bIsPriority = priorityRegex.test(nameB);

      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      return nameA.localeCompare(nameB);
    });
  }

  // ─── Debounced Filter Update ─────────────────────────────────────────────

  /**
   * Debounce filter updates to avoid rapid API calls
   */
  debouncedFilterUpdate(callback: () => void, delay: number = 100): void {
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer);
    }
    this.filterDebounceTimer = setTimeout(() => {
      callback();
      this.filterDebounceTimer = null;
    }, delay);
  }

  /**
   * Cancel any pending debounced update
   */
  cancelDebouncedUpdate(): void {
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer);
      this.filterDebounceTimer = null;
    }
  }

  // ─── Validation ──────────────────────────────────────────────────────────

  /**
   * Validate current filters
   */
  validateFilters(): boolean {
    return this.filters ? Filters.validate(this.filters) : false;
  }

  // ─── Reset ───────────────────────────────────────────────────────────────

  /**
   * Reset all filter state
   */
  reset(): void {
    this.filtersSubject.next(null);
    this.filterStateSubject.next({
      chkLiveStream: true,
      chkMovie: true,
      chkSerie: true,
      currentViewType: ViewMode.All,
    });
    this.cancelDebouncedUpdate();
  }
  /**
   * Helper methods for template binding
   */
  currentViewType(): ViewMode {
    return this.getCurrentViewMode();
  }

  chkLiveStream(): boolean {
    return this.isMediaTypeActive(MediaType.livestream);
  }

  chkMovie(): boolean {
    return this.isMediaTypeActive(MediaType.movie);
  }

  chkSerie(): boolean {
    return this.isMediaTypeActive(MediaType.serie);
  }
}
