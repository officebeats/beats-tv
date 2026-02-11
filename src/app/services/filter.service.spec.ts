import { TestBed } from '@angular/core/testing';
import { FilterService, FilterState } from './filter.service';
import { MediaType } from '../models/mediaType';
import { ViewMode } from '../models/viewMode';
import { SortType } from '../models/sortType';
import { Filters } from '../models/filters';
import { Channel } from '../models/channel';

describe('FilterService', () => {
  let service: FilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FilterService);
  });

  afterEach(() => {
    service.reset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── Channel Visibility ──────────────────────────────────────────────────

  describe('Channel Visibility', () => {
    it('should return true for visible channel (hidden = false)', () => {
      const channel = { hidden: false } as Channel;
      expect(service.isChannelVisible(channel)).toBe(true);
    });

    it('should return true for channel with undefined hidden', () => {
      const channel = {} as Channel;
      expect(service.isChannelVisible(channel)).toBe(true);
    });

    it('should return false for hidden channel', () => {
      const channel = { hidden: true } as Channel;
      expect(service.isChannelVisible(channel)).toBe(false);
    });
  });

  // ─── Filter State Management ─────────────────────────────────────────────

  describe('Filter State Management', () => {
    it('should initialize with null filters', () => {
      expect(service.filters).toBeNull();
    });

    it('should initialize with default filter state', () => {
      const state = service.filterState;
      expect(state.chkLiveStream).toBe(true);
      expect(state.chkMovie).toBe(true);
      expect(state.chkSerie).toBe(true);
      expect(state.currentViewType).toBe(ViewMode.All);
    });

    it('should initialize filters with source IDs', () => {
      const filters = service.initializeFilters([1, 2, 3]);
      
      expect(filters.source_ids).toEqual([1, 2, 3]);
      expect(filters.view_type).toBe(ViewMode.All);
      expect(filters.media_types).toEqual([MediaType.livestream, MediaType.movie, MediaType.serie]);
      expect(filters.page).toBe(1);
    });

    it('should initialize filters with custom default sort', () => {
      const filters = service.initializeFilters([1], SortType.dateDescending);
      
      expect(filters.sort).toBe(SortType.dateDescending);
    });

    it('should update filter state', () => {
      service.updateFilterState({
        chkLiveStream: false,
        chkMovie: true,
      });
      
      const state = service.filterState;
      expect(state.chkLiveStream).toBe(false);
      expect(state.chkMovie).toBe(true);
      expect(state.chkSerie).toBe(true);
    });

    it('should set filters directly', () => {
      const newFilters = Filters.createDefault();
      newFilters.source_ids = [1, 2];
      
      service.filters = newFilters;
      
      expect(service.filters).toEqual(newFilters);
    });

    it('should emit filter changes via observable', (done) => {
      let emissionCount = 0;
      service.filters$.subscribe((filters) => {
        emissionCount++;
        if (emissionCount === 2 && filters) {
          expect(filters.source_ids).toEqual([1, 2, 3]);
          done();
        }
      });
      service.initializeFilters([1, 2, 3]);
    });
  });

  // ─── Media Type Management ───────────────────────────────────────────────

  describe('Media Type Management', () => {
    beforeEach(() => {
      service.initializeFilters([1]);
    });

    it('should toggle media type off', () => {
      const result = service.toggleMediaType(MediaType.livestream, false);
      
      expect(result).toBe(false);
      expect(service.isMediaTypeActive(MediaType.livestream)).toBe(false);
    });

    it('should toggle media type on', () => {
      // First turn it off
      service.toggleMediaType(MediaType.livestream, false);
      
      // Then toggle it back on
      const result = service.toggleMediaType(MediaType.livestream, false);
      
      expect(result).toBe(true);
      expect(service.isMediaTypeActive(MediaType.livestream)).toBe(true);
    });

    it('should sync filter state when toggling media types', () => {
      service.toggleMediaType(MediaType.livestream, false);
      
      const state = service.filterState;
      expect(state.chkLiveStream).toBe(false);
    });

    it('should set media types directly', () => {
      service.setMediaTypes([MediaType.movie, MediaType.serie]);
      
      expect(service.isMediaTypeActive(MediaType.livestream)).toBe(false);
      expect(service.isMediaTypeActive(MediaType.movie)).toBe(true);
      expect(service.isMediaTypeActive(MediaType.serie)).toBe(true);
    });

    it('should enable all media types', () => {
      service.setMediaTypes([MediaType.movie]);
      service.enableAllMediaTypes();
      
      expect(service.isMediaTypeActive(MediaType.livestream)).toBe(true);
      expect(service.isMediaTypeActive(MediaType.movie)).toBe(true);
      expect(service.isMediaTypeActive(MediaType.serie)).toBe(true);
    });

    it('should update sort to date descending for movies-only view', () => {
      service.toggleMediaType(MediaType.livestream, false);
      service.toggleMediaType(MediaType.serie, false);
      
      expect(service.filters?.sort).toBe(SortType.dateDescending);
    });

    it('should revert sort to provider when not movies-only', () => {
      service.toggleMediaType(MediaType.livestream, false);
      service.toggleMediaType(MediaType.serie, false);
      
      // Add back livestream
      service.toggleMediaType(MediaType.livestream, false);
      
      expect(service.filters?.sort).toBe(SortType.provider);
    });
  });

  // ─── View Mode Management ────────────────────────────────────────────────

  describe('View Mode Management', () => {
    beforeEach(() => {
      service.initializeFilters([1]);
    });

    it('should switch view mode', () => {
      const result = service.switchViewMode(ViewMode.Favorites);
      
      expect(result).toBe(true);
      expect(service.getCurrentViewMode()).toBe(ViewMode.Favorites);
    });

    it('should return false when switching to same view mode', () => {
      const result = service.switchViewMode(ViewMode.All);
      
      expect(result).toBe(false);
    });

    it('should clear series/group context when switching modes', () => {
      service.filters!.series_id = 123;
      service.filters!.group_id = 456;
      service.filters!.season = 1;
      
      service.switchViewMode(ViewMode.Favorites);
      
      expect(service.filters?.series_id).toBeUndefined();
      expect(service.filters?.group_id).toBeUndefined();
      expect(service.filters?.season).toBeUndefined();
    });

    it('should update filter state when switching modes', () => {
      service.switchViewMode(ViewMode.Categories);
      
      expect(service.filterState.currentViewType).toBe(ViewMode.Categories);
    });

    it('should detect filters visibility correctly', () => {
      expect(service.areFiltersVisible()).toBe(true);
      
      service.filters!.series_id = 123;
      
      expect(service.areFiltersVisible()).toBe(false);
    });
  });

  // ─── Query Management ────────────────────────────────────────────────────

  describe('Query Management', () => {
    beforeEach(() => {
      service.initializeFilters([1]);
    });

    it('should set query', () => {
      service.setQuery('test query');
      
      expect(service.filters?.query).toBe('test query');
    });

    it('should sanitize query', () => {
      service.setQuery('  <script>alert(1)</script>  ');
      
      expect(service.filters?.query).toBe('scriptalert(1)/script');
    });

    it('should clear query', () => {
      service.setQuery('test');
      service.clearQuery();
      
      expect(service.filters?.query).toBeUndefined();
    });
  });

  // ─── Pagination ──────────────────────────────────────────────────────────

  describe('Pagination', () => {
    beforeEach(() => {
      service.initializeFilters([1]);
    });

    it('should increment page', () => {
      const page = service.nextPage();
      
      expect(page).toBe(2);
      expect(service.getCurrentPage()).toBe(2);
    });

    it('should reset page to 1', () => {
      service.nextPage();
      service.nextPage();
      service.resetPage();
      
      expect(service.getCurrentPage()).toBe(1);
    });
  });

  // ─── Advanced Filters ────────────────────────────────────────────────────

  describe('Advanced Filters', () => {
    beforeEach(() => {
      service.initializeFilters([1]);
    });

    it('should set genre filter', () => {
      service.setGenre('Action');
      
      expect(service.filters?.genre).toBe('Action');
    });

    it('should clear genre filter when empty', () => {
      service.setGenre('Action');
      service.setGenre('');
      
      expect(service.filters?.genre).toBeUndefined();
    });

    it('should set minimum rating filter', () => {
      service.setMinRating(7);
      
      expect(service.filters?.rating_min).toBe(7);
    });

    it('should clear rating filter when 0', () => {
      service.setMinRating(7);
      service.setMinRating(0);
      
      expect(service.filters?.rating_min).toBeUndefined();
    });

    it('should toggle keywords mode', () => {
      const initialValue = service.filters!.use_keywords;
      
      service.toggleKeywords();
      
      expect(service.filters?.use_keywords).toBe(!initialValue);
    });

    it('should set group filter', () => {
      service.setGroup(123);
      
      expect(service.filters?.group_id).toBe(123);
    });

    it('should set series filter', () => {
      service.setSeries(456, [1, 2]);
      
      expect(service.filters?.series_id).toBe(456);
      expect(service.filters?.source_ids).toEqual([1, 2]);
    });

    it('should set season filter', () => {
      service.setSeason(2);
      
      expect(service.filters?.season).toBe(2);
    });
  });

  // ─── Smart Category Sorting ──────────────────────────────────────────────

  describe('Smart Category Sorting', () => {
    const mockChannels: Channel[] = [
      { name: 'UK Sports' } as Channel,
      { name: 'Random Channel' } as Channel,
      { name: 'USA News' } as Channel,
      { name: 'Another Channel' } as Channel,
      { name: 'ENGLISH Movies' } as Channel,
    ];

    it('should prioritize US/UK/ENGLISH channels in category view', () => {
      const sorted = service.sortChannelsSmart(mockChannels, true, false);
      
      expect(sorted[0].name).toBe('UK Sports');
      expect(sorted[1].name).toBe('USA News');
      expect(sorted[2].name).toBe('ENGLISH Movies');
    });

    it('should not sort when not in category view', () => {
      const sorted = service.sortChannelsSmart(mockChannels, false, false);
      
      expect(sorted).toEqual(mockChannels);
    });

    it('should not sort when query is present', () => {
      const sorted = service.sortChannelsSmart(mockChannels, true, true);
      
      expect(sorted).toEqual(mockChannels);
    });

    it('should sort alphabetically within priority groups', () => {
      const channels: Channel[] = [
        { name: 'UK Zebra' } as Channel,
        { name: 'UK Alpha' } as Channel,
      ];
      
      const sorted = service.sortChannelsSmart(channels, true, false);
      
      expect(sorted[0].name).toBe('UK Alpha');
      expect(sorted[1].name).toBe('UK Zebra');
    });
  });

  // ─── Debounced Filter Update ─────────────────────────────────────────────

  describe('Debounced Filter Update', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should debounce filter updates', () => {
      const callback = jasmine.createSpy('callback');
      
      service.debouncedFilterUpdate(callback, 100);
      service.debouncedFilterUpdate(callback, 100);
      service.debouncedFilterUpdate(callback, 100);
      
      jasmine.clock().tick(50);
      expect(callback).not.toHaveBeenCalled();
      
      jasmine.clock().tick(100);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should cancel debounced update', () => {
      const callback = jasmine.createSpy('callback');
      
      service.debouncedFilterUpdate(callback, 100);
      service.cancelDebouncedUpdate();
      
      jasmine.clock().tick(200);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ─── Validation ──────────────────────────────────────────────────────────

  describe('Validation', () => {
    it('should return false for null filters', () => {
      expect(service.validateFilters()).toBe(false);
    });

    it('should validate correct filters', () => {
      service.initializeFilters([1]);
      expect(service.validateFilters()).toBe(true);
    });

    it('should ensure media types are not empty', () => {
      service.initializeFilters([1]);
      service.filters!.media_types = [];
      
      service.ensureMediaTypesNotEmpty();
      
      expect(service.filters?.media_types).toEqual([MediaType.livestream]);
    });
  });

  // ─── Reset ───────────────────────────────────────────────────────────────

  describe('Reset', () => {
    it('should reset all state', () => {
      service.initializeFilters([1, 2, 3]);
      service.toggleMediaType(MediaType.livestream, false);
      service.switchViewMode(ViewMode.Favorites);
      
      service.reset();
      
      expect(service.filters).toBeNull();
      expect(service.filterState.chkLiveStream).toBe(true);
      expect(service.filterState.currentViewType).toBe(ViewMode.All);
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle operations when filters are null', () => {
      expect(service.toggleMediaType(MediaType.livestream, false)).toBe(false);
      expect(service.switchViewMode(ViewMode.Favorites)).toBe(false);
      expect(service.getCurrentViewMode()).toBe(ViewMode.All);
      expect(service.getCurrentPage()).toBe(1);
    });

    it('should handle empty source IDs', () => {
      const filters = service.initializeFilters([]);
      expect(filters.source_ids).toEqual([]);
    });

    it('should handle undefined channel name in sorting', () => {
      const channels: Channel[] = [
        {} as Channel,
        { name: 'UK Channel' } as Channel,
      ];
      
      const sorted = service.sortChannelsSmart(channels, true, false);
      
      expect(sorted[0].name).toBe('UK Channel');
    });
  });
});
