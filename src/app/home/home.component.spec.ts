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

  beforeEach(async () => {
    tauriService = createMockTauriService();
    playlistService = createMockPlaylistService();
    movieMetadataService = createMockMovieMetadataService();
    router = jasmine.createSpyObj('Router', ['navigateByUrl']);

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
        FilterService,
        { provide: MovieMetadataService, useValue: movieMetadataService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    memoryService = TestBed.inject(MemoryService) as any;

    // Set up default state
    component.channels = [];
    component.channelsVisible = true;
    component.filters = {
      source_ids: [1],
      view_type: ViewMode.All,
      media_types: [MediaType.livestream],
      page: 1,
      use_keywords: false,
      sort: SortType.provider,
      show_hidden: false,
    };

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
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') return Promise.resolve(mockChannels);
        return Promise.resolve(null);
      });

      await component.load();

      expect(tauriService.call).toHaveBeenCalledWith('search', jasmine.objectContaining({
        filters: jasmine.objectContaining({ page: 1 }),
      }));
      expect(component.channels.length).toBe(10);
      expect(component.channelsVisible).toBeTrue();
    });

    it('should show empty list when no media types are selected', async () => {
      component.filters!.media_types = [];

      await component.load();

      expect(component.channels.length).toBe(0);
      expect(component.reachedMax).toBeTrue();
      expect(component.loading).toBeFalse();
    });

    it('should set reachedMax=true when fewer than PAGE_SIZE results returned', async () => {
      const fewChannels = createChannelList(10);
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') return Promise.resolve(fewChannels);
        return Promise.resolve(null);
      });

      await component.load();

      expect(component.reachedMax).toBeTrue();
    });

    it('should set reachedMax=false when PAGE_SIZE results returned', async () => {
      const fullPage = createChannelList(36);
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') return Promise.resolve(fullPage);
        return Promise.resolve(null);
      });

      await component.load();

      expect(component.reachedMax).toBeFalse();
    });

    it('should filter out hidden channels from results', async () => {
      const channels = [
        createChannel({ id: 1, hidden: false }),
        createChannel({ id: 2, hidden: true }),
        createChannel({ id: 3, hidden: false }),
      ];
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') return Promise.resolve(channels);
        return Promise.resolve(null);
      });

      await component.load();

      expect(component.channels.length).toBe(2);
      expect(component.channels.every(c => !c.hidden)).toBeTrue();
    });

    it('should handle backend errors gracefully during load', async () => {
      const errorService = TestBed.inject(ErrorService);
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') return Promise.reject('Network error');
        return Promise.resolve(null);
      });

      await component.load();

      expect(errorService.handleError).toHaveBeenCalledWith('Network error');
      expect(component.loading).toBeFalse();
    });

    it('should set loading=true during load and false after', async () => {
      let loadingDuringCall = false;
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') {
          loadingDuringCall = component.loading;
          return Promise.resolve([]);
        }
        return Promise.resolve(null);
      });

      await component.load();

      expect(loadingDuringCall).toBeTrue();
      expect(component.loading).toBeFalse();
    });
  });

  // ─── Pagination ──────────────────────────────────────────────────────────

  describe('Pagination', () => {
    it('should increment page on loadMore', async () => {
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') return Promise.resolve([]);
        return Promise.resolve(null);
      });

      component.filters!.page = 1;
      await component.loadMore();

      expect(component.filters!.page).toBe(2);
    });

    it('should append channels on loadMore (not replace)', async () => {
      component.channels = createChannelList(5);
      const moreChannels = createChannelList(3).map((c, i) => ({
        ...c,
        id: 100 + i,
        name: `More ${i}`,
      }));
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') return Promise.resolve(moreChannels);
        return Promise.resolve(null);
      });

      await component.load(true);

      expect(component.channels.length).toBe(8);
    });

    it('should reset page to 1 on fresh load', async () => {
      component.filters!.page = 5;
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') return Promise.resolve([]);
        return Promise.resolve(null);
      });

      await component.load(false);

      expect(component.filters!.page).toBe(1);
    });
  });

  // ─── Media Type Filtering ────────────────────────────────────────────────

  describe('Media Type Filtering', () => {
    it('should add media type when not present', () => {
      component.filters!.media_types = [MediaType.livestream];

      component.updateMediaTypes(MediaType.movie);

      expect(component.filters!.media_types).toContain(MediaType.movie);
      expect(component.filters!.media_types).toContain(MediaType.livestream);
    });

    it('should remove media type when already present', () => {
      component.filters!.media_types = [MediaType.livestream, MediaType.movie];

      component.updateMediaTypes(MediaType.movie);

      expect(component.filters!.media_types).not.toContain(MediaType.movie);
      expect(component.filters!.media_types).toContain(MediaType.livestream);
    });

    it('should sync boolean flags with media_types array', () => {
      component.filters!.media_types = [];

      component.updateMediaTypes(MediaType.livestream);
      expect(component.chkLiveStream).toBeTrue();

      component.updateMediaTypes(MediaType.movie);
      expect(component.chkMovie).toBeTrue();

      component.updateMediaTypes(MediaType.serie);
      expect(component.chkSerie).toBeTrue();
    });

    it('should set sort to dateDescending when only movies selected', () => {
      component.filters!.media_types = [MediaType.movie];
      component.chkMovie = true;
      component.chkLiveStream = false;
      component.chkSerie = false;

      component.updateMediaTypes(MediaType.livestream); // remove livestream (already not there)
      // Manually trigger the condition
      component.filters!.media_types = [MediaType.movie];
      component.chkLiveStream = false;
      component.chkSerie = false;
      component.chkMovie = true;

      // Call updateMediaTypes to add movie (it's already there, so it removes it)
      // Let's test the logic directly
      component.filters!.media_types = [];
      component.updateMediaTypes(MediaType.movie);

      expect(component.filters!.sort).toBe(SortType.dateDescending);
    });
  });

  // ─── View Mode Switching ─────────────────────────────────────────────────

  describe('View Mode Switching', () => {
    beforeEach(() => {
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') return Promise.resolve([]);
        return Promise.resolve(null);
      });
    });

    it('should switch to Categories view', async () => {
      await component.switchMode(ViewMode.Categories);

      expect(component.filters!.view_type).toBe(ViewMode.Categories);
    });

    it('should switch to Favorites view', async () => {
      await component.switchMode(ViewMode.Favorites);

      expect(component.filters!.view_type).toBe(ViewMode.Favorites);
    });

    it('should switch to History view', async () => {
      await component.switchMode(ViewMode.History);

      expect(component.filters!.view_type).toBe(ViewMode.History);
    });

    it('should clear series_id and group_id when switching modes', async () => {
      component.filters!.view_type = ViewMode.Categories;
      component.filters!.series_id = 42;
      component.filters!.group_id = 99;

      await component.switchMode(ViewMode.All);

      expect(component.filters!.series_id).toBeUndefined();
      expect(component.filters!.group_id).toBeUndefined();
    });

    it('should not reload if switching to same mode', async () => {
      component.filters!.view_type = ViewMode.All;
      const callCountBefore = tauriService.call.calls.count();

      await component.switchMode(ViewMode.All);

      // Should not have made additional search calls
      expect(tauriService.call.calls.count()).toBe(callCountBefore);
    });

    it('should clear search when switching modes', async () => {
      component.filters!.query = 'test search';

      await component.switchMode(ViewMode.Categories);

      expect(component.filters!.query).toBe('');
    });
  });

  // ─── Selection Mode ──────────────────────────────────────────────────────

  describe('Selection Mode', () => {
    it('should toggle selection mode on/off', () => {
      expect(component.selectionMode).toBeFalse();

      component.toggleSelectionMode();
      expect(component.selectionMode).toBeTrue();

      component.toggleSelectionMode();
      expect(component.selectionMode).toBeFalse();
    });

    it('should clear selection when disabling selection mode', () => {
      component.selectionMode = true;
      component.selectedChannels.add(1);
      component.selectedChannels.add(2);

      component.toggleSelectionMode();

      expect(component.selectedChannels.size).toBe(0);
    });

    it('should toggle individual channel selection', () => {
      component.toggleChannelSelection(1);
      expect(component.selectedChannels.has(1)).toBeTrue();

      component.toggleChannelSelection(1);
      expect(component.selectedChannels.has(1)).toBeFalse();
    });

    it('should select all visible channels', () => {
      component.channels = createChannelList(5);

      component.selectAllView();

      expect(component.selectedChannels.size).toBe(5);
    });

    it('should clear all selections', () => {
      component.selectedChannels.add(1);
      component.selectedChannels.add(2);
      component.selectedChannels.add(3);

      component.clearSelection();

      expect(component.selectedChannels.size).toBe(0);
    });
  });

  // ─── Bulk Actions ────────────────────────────────────────────────────────

  describe('Bulk Actions', () => {
    it('should hide selected channels', async () => {
      component.selectedChannels.add(1);
      component.selectedChannels.add(2);
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') return Promise.resolve([]);
        return Promise.resolve(null);
      });

      await component.bulkActionOnSelected(BulkActionType.Hide);

      expect(playlistService.hideChannel).toHaveBeenCalledWith(1, true);
      expect(playlistService.hideChannel).toHaveBeenCalledWith(2, true);
    });

    it('should favorite selected channels', async () => {
      component.selectedChannels.add(1);
      component.selectedChannels.add(2);
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') return Promise.resolve([]);
        return Promise.resolve(null);
      });

      await component.bulkActionOnSelected(BulkActionType.Favorite);

      expect(playlistService.favoriteChannel).toHaveBeenCalledWith(1);
      expect(playlistService.favoriteChannel).toHaveBeenCalledWith(2);
    });

    it('should do nothing when no channels selected for bulk action', async () => {
      component.selectedChannels.clear();

      await component.bulkActionOnSelected(BulkActionType.Hide);

      expect(playlistService.hideChannel).not.toHaveBeenCalled();
    });

    it('should clear selection after successful bulk action', async () => {
      component.selectedChannels.add(1);
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') return Promise.resolve([]);
        return Promise.resolve(null);
      });

      await component.bulkActionOnSelected(BulkActionType.Hide);

      expect(component.selectedChannels.size).toBe(0);
    });

    it('should handle bulkActionFromBar correctly', () => {
      spyOn(component, 'bulkActionOnSelected');
      spyOn(component, 'whitelistSelected');

      component.bulkActionFromBar('Favorite');
      expect(component.bulkActionOnSelected).toHaveBeenCalledWith(BulkActionType.Favorite);

      component.bulkActionFromBar('Hide');
      expect(component.bulkActionOnSelected).toHaveBeenCalledWith(BulkActionType.Hide);

      component.bulkActionFromBar('Whitelist');
      expect(component.whitelistSelected).toHaveBeenCalled();
    });
  });

  // ─── Search ──────────────────────────────────────────────────────────────

  describe('Search', () => {
    beforeEach(() => {
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') return Promise.resolve([]);
        return Promise.resolve(null);
      });
    });

    it('should update filters query on search change', () => {
      component.onSearchChanged('test query');

      expect(component.filters!.query).toBe('test query');
    });

    it('should reset focus on search change', () => {
      component.focus = 5;

      component.onSearchChanged('test');

      expect(component.focus).toBe(0);
    });

    it('should clear search and reset query', () => {
      component.filters!.query = 'old search';
      component.prevSearchValue = 'old search';

      component.clearSearch();

      expect(component.filters!.query).toBe('');
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

  // ─── Smart Category Sorting ──────────────────────────────────────────────

  describe('Smart Category Sorting', () => {
    it('should prioritize US/UK categories at the top', async () => {
      const categories = [
        createChannel({ id: 1, name: 'France', media_type: MediaType.group }),
        createChannel({ id: 2, name: 'USA Sports', media_type: MediaType.group }),
        createChannel({ id: 3, name: 'Germany', media_type: MediaType.group }),
        createChannel({ id: 4, name: 'UK Entertainment', media_type: MediaType.group }),
      ];
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') return Promise.resolve(categories);
        return Promise.resolve(null);
      });
      component.filters!.view_type = ViewMode.Categories;
      component.filters!.query = undefined;

      await component.load();

      // US and UK should be first
      expect(component.channels[0].name).toContain('U');
      expect(component.channels[1].name).toContain('U');
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
  });

  // ─── Scroll Behavior ────────────────────────────────────────────────────

  describe('Scroll Behavior', () => {
    it('should show scroll-to-top button when scrolled past 300px', () => {
      // Mock scroll position
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

  // ─── Fallback Search ────────────────────────────────────────────────────

  describe('Fallback Search', () => {
    it('should expand search to all media types when no results found', async () => {
      let callCount = 0;
      tauriService.call.and.callFake((cmd: string) => {
        if (cmd === 'search') {
          callCount++;
          if (callCount === 1) return Promise.resolve([]); // First call: no results
          return Promise.resolve(createChannelList(3)); // Second call: results
        }
        return Promise.resolve(null);
      });
      component.filters!.query = 'test';
      component.filters!.media_types = [MediaType.livestream];

      await component.load();

      // Should have expanded to all types
      expect(component.chkLiveStream).toBeTrue();
      expect(component.chkMovie).toBeTrue();
      expect(component.chkSerie).toBeTrue();
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
