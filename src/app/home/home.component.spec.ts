import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { MemoryService } from '../memory.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ErrorService } from '../error.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TauriService } from '../services/tauri.service';
import { SettingsService } from '../services/settings.service';
import { PlaylistService } from '../services/playlist.service';
import { PlayerService } from '../services/player.service';
import { FilterService } from '../services/filter.service';
import { MovieMetadataService } from '../services/movie-metadata.service';
import { Channel } from '../models/channel';
import { MediaType } from '../models/mediaType';
import { ViewMode } from '../models/viewMode';
import { SortType } from '../models/sortType';
import { BulkActionType } from '../models/bulkActionType';
import { SourceType } from '../models/sourceType';
import { BehaviorSubject, Subject } from 'rxjs';

import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { PlayerComponent } from './components/player/player.component';
import { NavigationService } from '../services/navigation.service';
import { SelectionService } from '../services/selection.service';
import { ChannelLoaderService } from '../services/channel-loader.service';

// ─── Mock Services ───────────────────────────────────────────────────────────

class MockMemoryService {
  settings: any = {
    use_single_column: false,
    max_text_lines: 2,
    default_view: ViewMode.All,
    default_sort: SortType.provider,
  };
  Sources = new Map();
  XtreamSourceIds = new Set<number>();
  CustomSourceIds = new Set<number>();
  HideChannels = new BehaviorSubject<boolean>(true);
  SetFocus = new Subject<number>();
  SetNode = new Subject<any>();
  Refresh = new Subject<boolean>();
  Sort = new BehaviorSubject<[SortType, boolean]>([SortType.provider, false]);
  Loading = false;
  IsRefreshing = false;
  RefreshPlaylist = '';
  RefreshActivity = '';
  RefreshPercent = 0;
  AppVersion = '';
  trayEnabled = true;
  AlwaysAskSave = false;
  SeriesRefreshed = new Set<number>();
  ModalRef: any = undefined;
  currentContextMenu: any = undefined;
  IsContainer = false;
  tryIPC = jasmine.createSpy('tryIPC').and.callFake(async () => {});
  updateVersion = jasmine.createSpy('updateVersion');
  RefreshSources = new Subject<void>();
}

function createMockTauriService() {
  return {
    call: jasmine.createSpy('call').and.callFake((cmd: string, args?: any) => {
      if (cmd === 'get_settings') return Promise.resolve({ default_view: ViewMode.All });
      if (cmd === 'get_sources') return Promise.resolve([]);
      if (cmd === 'search') return Promise.resolve([]);
      return Promise.resolve(null);
    }),
    getAppVersion: jasmine.createSpy('getAppVersion').and.returnValue(Promise.resolve('2.1.0')),
    setZoom: jasmine.createSpy('setZoom').and.returnValue(Promise.resolve()),
    on: jasmine.createSpy('on').and.returnValue(Promise.resolve(() => {})),
  };
}

function createMockPlaylistService() {
  return {
    refreshAll: jasmine.createSpy('refreshAll').and.returnValue(Promise.resolve()),
    checkEpgOnStart: jasmine.createSpy('checkEpgOnStart').and.returnValue(Promise.resolve()),
    bulkUpdate: jasmine.createSpy('bulkUpdate').and.returnValue(Promise.resolve()),
    hideChannel: jasmine.createSpy('hideChannel').and.returnValue(Promise.resolve()),
    favoriteChannel: jasmine.createSpy('favoriteChannel').and.returnValue(Promise.resolve()),
    unfavoriteChannel: jasmine.createSpy('unfavoriteChannel').and.returnValue(Promise.resolve()),
  };
}

function createMockMovieMetadataService() {
  return {
    getMovieData: jasmine.createSpy('getMovieData').and.returnValue(Promise.resolve(null)),
    prefetchMovieData: jasmine.createSpy('prefetchMovieData'),
    cancelPrefetch: jasmine.createSpy('cancelPrefetch'),
  };
}

function createMockNavigationService() {
  return {
    focus: 0,
    focusArea: jasmine.createSpy('focusArea'),
    navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(false)),
    selectFirstChannel: jasmine.createSpy('selectFirstChannel'),
    selectFirstChannelDelayed: jasmine.createSpy('selectFirstChannelDelayed'),
    focusSearch: jasmine.createSpy('focusSearch'),
    isSearchFocused: jasmine.createSpy('isSearchFocused').and.returnValue(false),
    pushNode: jasmine.createSpy('pushNode'),
    popNode: jasmine.createSpy('popNode'),
    hasNodes: jasmine.createSpy('hasNodes').and.returnValue(false),
    getNodeStack: jasmine.createSpy('getNodeStack').and.returnValue([]),
    clearNodes: jasmine.createSpy('clearNodes'),
    reset: jasmine.createSpy('reset'),
  };
}

function createMockSelectionService() {
  return {
    selectionMode: jasmine.createSpy('selectionMode').and.returnValue(false),
    selectedChannels: jasmine.createSpy('selectedChannels').and.returnValue(new Set<number>()),
    selectedCount: jasmine.createSpy('selectedCount').and.returnValue(0),
    toggleSelectionMode: jasmine.createSpy('toggleSelectionMode'),
    toggleChannelSelection: jasmine.createSpy('toggleChannelSelection'),
    clearSelection: jasmine.createSpy('clearSelection'),
    selectAll: jasmine.createSpy('selectAll'),
    selectMultiple: jasmine.createSpy('selectMultiple'),
    deselectMultiple: jasmine.createSpy('deselectMultiple'),
    getSelectedIds: jasmine.createSpy('getSelectedIds').and.returnValue([]),
    hasSelection: jasmine.createSpy('hasSelection').and.returnValue(false),
    bulkAction: jasmine.createSpy('bulkAction').and.returnValue(Promise.resolve()),
    whitelistSelected: jasmine.createSpy('whitelistSelected').and.returnValue(Promise.resolve()),
    reset: jasmine.createSpy('reset'),
  };
}

function createMockChannelLoaderService() {
  return {
    loading: false,
    channels: [] as Channel[],
    reachedMax: false,
    loadChannels: jasmine.createSpy('loadChannels').and.returnValue(Promise.resolve({ channels: [], reachedMax: true, fromCache: false })),
    loadMore: jasmine.createSpy('loadMore').and.returnValue(Promise.resolve(null)),
    refreshAll: jasmine.createSpy('refreshAll').and.returnValue(Promise.resolve()),
    reset: jasmine.createSpy('reset'),
    shouldLoadMore: jasmine.createSpy('shouldLoadMore').and.returnValue(false),
    getChannelCount: jasmine.createSpy('getChannelCount').and.returnValue(0),
    hasChannels: jasmine.createSpy('hasChannels').and.returnValue(false),
  };
}

function createMockFilterService() {
  const filters = {
    source_ids: [1],
    view_type: ViewMode.All,
    media_types: [MediaType.livestream],
    page: 1,
    use_keywords: false,
    sort: SortType.provider,
    show_hidden: false,
  };
  
  return {
    filters: filters,
    filterState: jasmine.createSpy('filterState').and.returnValue({
      currentViewType: ViewMode.All,
      chkLiveStream: true,
      chkMovie: false,
      chkSerie: false,
    }),
    currentViewType: jasmine.createSpy('currentViewType').and.returnValue(ViewMode.All),
    chkLiveStream: jasmine.createSpy('chkLiveStream').and.returnValue(true),
    chkMovie: jasmine.createSpy('chkMovie').and.returnValue(false),
    chkSerie: jasmine.createSpy('chkSerie').and.returnValue(false),
    initializeFilters: jasmine.createSpy('initializeFilters'),
    updateFilterState: jasmine.createSpy('updateFilterState'),
    resetFilters: jasmine.createSpy('resetFilters'),
    toggleMediaType: jasmine.createSpy('toggleMediaType'),
    setMediaTypes: jasmine.createSpy('setMediaTypes'),
    enableAllMediaTypes: jasmine.createSpy('enableAllMediaTypes'),
    isMediaTypeActive: jasmine.createSpy('isMediaTypeActive').and.returnValue(false),
    switchViewMode: jasmine.createSpy('switchViewMode').and.returnValue(Promise.resolve()),
    getCurrentViewMode: jasmine.createSpy('getCurrentViewMode').and.returnValue(ViewMode.All),
    areFiltersVisible: jasmine.createSpy('areFiltersVisible').and.returnValue(false),
    setQuery: jasmine.createSpy('setQuery'),
    clearQuery: jasmine.createSpy('clearQuery'),
    nextPage: jasmine.createSpy('nextPage'),
    resetPage: jasmine.createSpy('resetPage'),
    getCurrentPage: jasmine.createSpy('getCurrentPage').and.returnValue(1),
    setGenre: jasmine.createSpy('setGenre'),
    setMinRating: jasmine.createSpy('setMinRating'),
    toggleKeywords: jasmine.createSpy('toggleKeywords'),
    setGroup: jasmine.createSpy('setGroup'),
    setSeries: jasmine.createSpy('setSeries'),
    setSeason: jasmine.createSpy('setSeason'),
    sortChannelsSmart: jasmine.createSpy('sortChannelsSmart').and.returnValue([]),
    debouncedFilterUpdate: jasmine.createSpy('debouncedFilterUpdate'),
    cancelDebouncedUpdate: jasmine.createSpy('cancelDebouncedUpdate'),
    validateFilters: jasmine.createSpy('validateFilters'),
    ensureMediaTypesNotEmpty: jasmine.createSpy('ensureMediaTypesNotEmpty'),
    reset: jasmine.createSpy('reset'),
    isChannelVisible: jasmine.createSpy('isChannelVisible').and.returnValue(true),
  };
}

// ─── Test Helpers ────────────────────────────────────────────────────────────

function createChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: 1,
    name: 'Test Channel',
    media_type: MediaType.livestream,
    source_id: 1,
    favorite: false,
    hidden: false,
    url: 'http://example.com/stream',
    ...overrides,
  } as Channel;
}

function createChannelList(count: number, mediaType = MediaType.livestream): Channel[] {
  return Array.from({ length: count }, (_, i) =>
    createChannel({
      id: i + 1,
      name: `Channel ${i + 1}`,
      media_type: mediaType,
    }),
  );
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let memoryService: MockMemoryService;
  let tauriService: ReturnType<typeof createMockTauriService>;
  let playlistService: ReturnType<typeof createMockPlaylistService>;
  let movieMetadataService: ReturnType<typeof createMockMovieMetadataService>;
  let router: jasmine.SpyObj<Router>;
  let navigationService: ReturnType<typeof createMockNavigationService>;
  let selectionService: ReturnType<typeof createMockSelectionService>;
  let channelLoaderService: ReturnType<typeof createMockChannelLoaderService>;
  let filterService: ReturnType<typeof createMockFilterService>;

  beforeEach(async () => {
    tauriService = createMockTauriService();
    playlistService = createMockPlaylistService();
    movieMetadataService = createMockMovieMetadataService();
    router = jasmine.createSpyObj('Router', ['navigateByUrl']);
    navigationService = createMockNavigationService();
    selectionService = createMockSelectionService();
    channelLoaderService = createMockChannelLoaderService();
    filterService = createMockFilterService();

    await TestBed.configureTestingModule({
      declarations: [HomeComponent, HeaderComponent, SidebarComponent, PlayerComponent],
      imports: [
        MatMenuModule,
        FormsModule,
        NgbTooltipModule,
        ToastrModule.forRoot(),
        NoopAnimationsModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: MemoryService, useClass: MockMemoryService },
        { provide: Router, useValue: router },
        {
          provide: ToastrService,
          useValue: {
            success: jasmine.createSpy('success'),
            info: jasmine.createSpy('info'),
            error: jasmine.createSpy('error'),
          },
        },
        { provide: ErrorService, useValue: { handleError: jasmine.createSpy('handleError') } },
        {
          provide: NgbModal,
          useValue: {
            open: jasmine
              .createSpy('open')
              .and.returnValue({
                componentInstance: {},
                result: Promise.resolve(),
              }),
          },
        },
        { provide: TauriService, useValue: tauriService },
        {
          provide: SettingsService,
          useValue: { updateSettings: jasmine.createSpy('updateSettings').and.returnValue(Promise.resolve()) },
        },
        { provide: PlaylistService, useValue: playlistService },
        {
          provide: PlayerService,
          useValue: {
            play: jasmine.createSpy('play').and.returnValue(Promise.resolve()),
            addLastWatched: jasmine.createSpy('addLastWatched').and.returnValue(Promise.resolve()),
          },
        },
        { provide: FilterService, useValue: filterService },
        { provide: MovieMetadataService, useValue: movieMetadataService },
        { provide: NavigationService, useValue: navigationService },
        { provide: SelectionService, useValue: selectionService },
        { provide: ChannelLoaderService, useValue: channelLoaderService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    memoryService = TestBed.inject(MemoryService) as any;

    // Set up default state for services
    channelLoaderService.channels = [];
    channelLoaderService.loading = false;
    channelLoaderService.reachedMax = false;
    (selectionService.selectionMode as jasmine.Spy).and.returnValue(false);
    (selectionService.selectedChannels as jasmine.Spy).and.returnValue(new Set<number>());
    (selectionService.selectedCount as jasmine.Spy).and.returnValue(0);
    navigationService.focus = 0;

    fixture.detectChanges();
  });

  // ─── Component Creation ──────────────────────────────────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // ─── Content Loading ─────────────────────────────────────────────────────

  describe('Content Loading', () => {
    it('should load channels from backend on initial load', async () => {
      const mockChannels = createChannelList(10);
      (channelLoaderService.loadChannels as jasmine.Spy).and.returnValue(
        Promise.resolve({ channels: mockChannels, reachedMax: true, fromCache: false })
      );

      await component.load();

      expect(channelLoaderService.loadChannels).toHaveBeenCalledWith(
        jasmine.objectContaining({ page: 1 }),
        false
      );
    });

    it('should handle backend errors gracefully during load', async () => {
      const errorService = TestBed.inject(ErrorService);
      (channelLoaderService.loadChannels as jasmine.Spy).and.returnValue(
        Promise.reject('Network error')
      );

      await component.load();

      expect(errorService.handleError).toHaveBeenCalledWith('Network error');
    });
  });

  // ─── Load More ──────────────────────────────────────────────────────────

  describe('Load More', () => {
    it('should call loadMore on channelLoader', async () => {
      await component.loadMore();

      expect(channelLoaderService.loadMore).toHaveBeenCalledWith(
        jasmine.objectContaining({ page: 1 })
      );
    });
  });

  // ─── Search ──────────────────────────────────────────────────────────────

  describe('Search', () => {
    it('should update filter query on search change', () => {
      component.onSearchChanged('test query');

      expect(filterService.setQuery).toHaveBeenCalledWith('test query');
      expect(navigationService.focus).toBe(0);
    });

    it('should clear search and reset query', () => {
      component.prevSearchValue = 'old search';

      component.clearSearch();

      expect(filterService.clearQuery).toHaveBeenCalled();
      expect(component.prevSearchValue).toBe('');
    });
  });

  // ─── Content Detail Modal ────────────────────────────────────────────────

  describe('Content Detail Modal', () => {
    it('should open details for a movie channel', async () => {
      const movieChannel = createChannel({
        id: 1,
        name: 'Test Movie',
        media_type: MediaType.movie,
      });

      await component.openDetails(movieChannel);

      expect(component.selectedChannelForModal).toBe(movieChannel);
      expect(movieMetadataService.getMovieData).toHaveBeenCalledWith('Test Movie');
    });

    it('should not fetch metadata for non-movie channels', async () => {
      const liveChannel = createChannel({
        id: 1,
        name: 'Live Channel',
        media_type: MediaType.livestream,
      });

      await component.openDetails(liveChannel);

      expect(component.selectedChannelForModal).toBe(liveChannel);
      expect(movieMetadataService.getMovieData).not.toHaveBeenCalled();
    });

    it('should close modal and clear selected channel', () => {
      component.selectedChannelForModal = createChannel();

      component.onModalClose();

      expect(component.selectedChannelForModal).toBeNull();
    });

    it('should prefetch movie data on hover', () => {
      const movieChannel = createChannel({
        media_type: MediaType.movie,
        name: 'Hover Movie',
      });

      component.onChannelHover(movieChannel);

      expect(movieMetadataService.prefetchMovieData).toHaveBeenCalledWith('Hover Movie');
    });

    it('should cancel prefetch on mouse leave', () => {
      component.onChannelLeave();

      expect(movieMetadataService.cancelPrefetch).toHaveBeenCalled();
    });
  });

  // ─── Navigation ──────────────────────────────────────────────────────────

  describe('Navigation', () => {
    it('should navigate to setup when no sources', () => {
      component.reset();

      expect(router.navigateByUrl).toHaveBeenCalledWith('setup');
    });

    it('should navigate to settings', () => {
      component.openSettings();

      expect(router.navigateByUrl).toHaveBeenCalledWith('settings');
    });

    it('should call navigation.navigate with correct parameters', async () => {
      channelLoaderService.channels = createChannelList(10);
      channelLoaderService.reachedMax = false;
      (filterService.areFiltersVisible as jasmine.Spy).and.returnValue(false);
      (filterService.getCurrentPage as jasmine.Spy).and.returnValue(1);

      await component.nav('ArrowRight');

      expect(navigationService.navigate).toHaveBeenCalledWith(
        'ArrowRight',
        10,
        false,
        false,
        true,
        false, // currentWindowSize < 768 (window.innerWidth is likely > 768 in test environment)
        1
      );
    });
  });

  // ─── Scroll Behavior ────────────────────────────────────────────────────

  describe('Scroll Behavior', () => {
    it('should show scroll-to-top button when scrolled past 300px', () => {
      Object.defineProperty(window, 'pageYOffset', { value: 400, writable: true });

      component.checkScrollTop();

      expect(component.showScrollTop).toBeTrue();
    });

    it('should hide scroll-to-top button when near top', () => {
      Object.defineProperty(window, 'pageYOffset', { value: 100, writable: true });

      component.checkScrollTop();

      expect(component.showScrollTop).toBeFalse();
    });
  });

  // ─── Bulk Actions ────────────────────────────────────────────────────────

  describe('Bulk Actions', () => {
    it('should call selection.bulkAction for Favorite', () => {
      component.bulkActionFromBar('Favorite');

      expect(selectionService.bulkAction).toHaveBeenCalledWith(BulkActionType.Favorite);
    });

    it('should call selection.bulkAction for Hide', () => {
      component.bulkActionFromBar('Hide');

      expect(selectionService.bulkAction).toHaveBeenCalledWith(BulkActionType.Hide);
    });

    it('should call selection.whitelistSelected for Whitelist', () => {
      component.bulkActionFromBar('Whitelist');

      expect(selectionService.whitelistSelected).toHaveBeenCalled();
    });

    it('should call bulkHide with correct action', () => {
      component.bulkHide(true);

      expect(selectionService.bulkAction).toHaveBeenCalledWith(BulkActionType.Hide);
    });

    it('should call bulkFavorite with correct action', () => {
      component.bulkFavorite(true);

      expect(selectionService.bulkAction).toHaveBeenCalledWith(BulkActionType.Favorite);
    });
  });

  // ─── Filter Chips ───────────────────────────────────────────────────────

  describe('Filter Chips', () => {
    it('should toggle media type when filter chip changed', () => {
      const chip = component.filterChips[0];
      chip.active = false;

      component.onFilterChipChanged(chip);

      expect(filterService.toggleMediaType).toHaveBeenCalledWith(MediaType.livestream);
    });
  });

  // ─── Genre and Rating Filters ───────────────────────────────────────────

  describe('Genre and Rating Filters', () => {
    it('should update genre filter', async () => {
      await component.updateGenre('Action');

      expect(filterService.setGenre).toHaveBeenCalledWith('Action');
      expect(component.genreInput).toBe('Action');
    });

    it('should update rating filter', async () => {
      await component.updateRating(7);

      expect(filterService.setMinRating).toHaveBeenCalledWith(7);
      expect(component.minRating).toBe(7);
    });
  });

  // ─── Toggle Keywords ────────────────────────────────────────────────────

  describe('Toggle Keywords', () => {
    it('should toggle keywords and reload', async () => {
      await component.toggleKeywords();

      expect(filterService.toggleKeywords).toHaveBeenCalled();
      expect(channelLoaderService.loadChannels).toHaveBeenCalled();
    });
  });

  // ─── Toggle VODs ─────────────────────────────────────────────────────

  describe('Toggle VODs', () => {
    it('should enable VODs when state is true', async () => {
      filterService.filters = {
        media_types: [MediaType.livestream],
      } as any;

      await component.toggleVods(true);

      expect(filterService.setMediaTypes).toHaveBeenCalledWith([
        MediaType.movie,
        MediaType.serie,
        MediaType.livestream,
      ]);
    });

    it('should disable VODs when state is false', async () => {
      filterService.filters = {
        media_types: [MediaType.livestream, MediaType.movie, MediaType.serie],
      } as any;

      await component.toggleVods(false);

      expect(filterService.setMediaTypes).toHaveBeenCalledWith([MediaType.livestream]);
    });
  });

  // ─── IMDB Link ────────────────────────────────────────────────────────

  describe('IMDB Link', () => {
    it('should open IMDB link when movie data has IMDB ID', () => {
      component.movieData = { imdbId: 'tt1234567' } as any;
      spyOn(window, 'open');

      component.openImdb();

      expect(window.open).toHaveBeenCalledWith(
        'https://www.imdb.com/title/tt1234567',
        '_blank'
      );
    });

    it('should not open IMDB link when movie data has no IMDB ID', () => {
      component.movieData = { imdbId: null } as any;
      spyOn(window, 'open');

      component.openImdb();

      expect(window.open).not.toHaveBeenCalled();
    });
  });

  // ─── Modal Play ─────────────────────────────────────────────────────────

  describe('Modal Play', () => {
    it('should play selected channel from modal', () => {
      const playerService = TestBed.inject(PlayerService) as any;
      component.selectedChannelForModal = createChannel({ id: 1 });

      component.onModalPlay();

      expect(playerService.play).toHaveBeenCalledWith(component.selectedChannelForModal, false, undefined);
    });
  });

  // ─── Track By Channel ID ───────────────────────────────────────────────

  describe('Track By Channel ID', () => {
    it('should return channel id for tracking', () => {
      const channel = createChannel({ id: 123 });

      const result = component.trackByChannelId(0, channel);

      expect(result).toBe(123);
    });

    it('should return index when channel has no id', () => {
      const channel = createChannel({ id: undefined });

      const result = component.trackByChannelId(5, channel);

      expect(result).toBe(5);
    });
  });

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  describe('Cleanup', () => {
    it('should unsubscribe all subscriptions on destroy', () => {
      const mockSub = { unsubscribe: jasmine.createSpy('unsubscribe') };
      component.subscriptions = [mockSub as any];

      component.ngOnDestroy();

      expect(mockSub.unsubscribe).toHaveBeenCalled();
    });
  });
});
