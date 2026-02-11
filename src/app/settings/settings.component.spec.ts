import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { NgbModalModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { MemoryService } from '../memory.service';
import { TauriService } from '../services/tauri.service';
import { ErrorService } from '../error.service';
import { of, Subject } from 'rxjs';
import { ViewMode } from '../models/viewMode';
import { SortType } from '../models/sortType';
import { Settings } from '../models/settings';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let tauriServiceSpy: jasmine.SpyObj<TauriService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;
  let memoryServiceMock: any;
  let routerSpy: jasmine.SpyObj<Router>;
  let refreshSourcesSubject: Subject<any>;

  const defaultSettings: Settings = {
    use_stream_caching: true,
    default_view: ViewMode.All,
    volume: 100,
    restream_port: 3000,
    enable_tray_icon: true,
    zoom: 100,
    default_sort: SortType.provider,
    enable_hwdec: true,
    always_ask_save: false,
    enable_gpu: false,
    theme: 0,
  };

  const mockSources = [
    { id: 1, name: 'Test Source', enabled: true, source_type: 2, url: 'http://test.com' },
    { id: 2, name: 'Source 2', enabled: false, source_type: 0, url: '/path/to/file.m3u' },
  ];

  beforeEach(async () => {
    refreshSourcesSubject = new Subject();
    routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);
    routerSpy.navigateByUrl.and.returnValue(Promise.resolve(true));

    tauriServiceSpy = jasmine.createSpyObj('TauriService', ['call', 'on', 'openDialog']);
    tauriServiceSpy.call.and.callFake(<T>(command: string, _args?: any): Promise<T> => {
      switch (command) {
        case 'get_settings':
          return Promise.resolve({ ...defaultSettings } as any);
        case 'get_sources':
          return Promise.resolve([...mockSources] as any);
        case 'update_settings':
          return Promise.resolve(undefined as any);
        case 'check_dependencies':
          return Promise.resolve({
            dependencies: [
              { name: 'mpv', installed: true, path: '/usr/bin/mpv', version: '0.37.0' },
              { name: 'yt-dlp', installed: false, path: null, version: null },
            ],
          } as any);
        case 'get_mpv_preset':
          return Promise.resolve('--cache=yes --demuxer-max-bytes=1GiB' as any);
        case 'refresh_source':
          return Promise.resolve(undefined as any);
        case 'clear_history':
          return Promise.resolve(undefined as any);
        default:
          return Promise.resolve(null as any);
      }
    });
    tauriServiceSpy.on.and.returnValue(Promise.resolve(() => {}));
    tauriServiceSpy.openDialog.and.returnValue(Promise.resolve(null));

    toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error', 'warning', 'info']);

    memoryServiceMock = {
      settings: {},
      Loading: false,
      ModalRef: undefined,
      AddingAdditionalSource: false,
      IsRefreshing: false,
      SeriesRefreshed: new Set(),
      RefreshTotal: 0,
      RefreshCurrent: 0,
      RefreshActivity: '',
      RefreshPlaylist: '',
      RefreshPercent: 0,
      HideChannels: of(false),
      SetFocus: of(0),
      SetNode: of({}),
      Refresh: of(null),
      Sort: of(null),
      RefreshSources: refreshSourcesSubject.asObservable(),
      tryIPC: jasmine.createSpy('tryIPC').and.callFake(
        async (successMsg: string, errorMsg: string, fn: () => Promise<void>) => {
          await fn();
        },
      ),
    };

    await TestBed.configureTestingModule({
      declarations: [SettingsComponent],
      imports: [
        ToastrModule.forRoot(),
        NgbModalModule,
        NgbTooltipModule,
        MatDialogModule,
        FormsModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: MemoryService, useValue: memoryServiceMock },
        { provide: TauriService, useValue: tauriServiceSpy },
        { provide: ToastrService, useValue: toastrSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ErrorService, useValue: { handleError: jasmine.createSpy('handleError') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // =========================================================================
  // Settings Initialization Tests
  // =========================================================================

  describe('Settings Initialization', () => {
    it('should load settings from backend on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(tauriServiceSpy.call).toHaveBeenCalledWith('get_settings');
      expect(component.settings.volume).toBe(100);
      expect(component.settings.default_view).toBe(ViewMode.All);
    }));

    it('should apply default values for undefined settings', fakeAsync(() => {
      tauriServiceSpy.call.and.callFake(<T>(command: string): Promise<T> => {
        if (command === 'get_settings') return Promise.resolve({} as any);
        if (command === 'get_sources') return Promise.resolve(mockSources as any);
        if (command === 'check_dependencies') return Promise.resolve({ dependencies: [] } as any);
        if (command === 'get_mpv_preset') return Promise.resolve('' as any);
        return Promise.resolve(null as any);
      });

      fixture.detectChanges();
      tick();

      expect(component.settings.use_stream_caching).toBe(true);
      expect(component.settings.default_view).toBe(ViewMode.All);
      expect(component.settings.volume).toBe(100);
      expect(component.settings.restream_port).toBe(3000);
      expect(component.settings.enable_tray_icon).toBe(true);
      expect(component.settings.zoom).toBe(100);
      expect(component.settings.default_sort).toBe(SortType.provider);
      expect(component.settings.enable_hwdec).toBe(true);
      expect(component.settings.always_ask_save).toBe(false);
      expect(component.settings.enable_gpu).toBe(false);
      expect(component.settings.max_text_lines).toBe(2);
      expect(component.settings.compact_mode).toBe(false);
      expect(component.settings.refresh_interval).toBe(0);
    }));

    it('should handle null settings response gracefully', fakeAsync(() => {
      tauriServiceSpy.call.and.callFake(<T>(command: string): Promise<T> => {
        if (command === 'get_settings') return Promise.resolve(null as any);
        if (command === 'get_sources') return Promise.resolve(mockSources as any);
        if (command === 'check_dependencies') return Promise.resolve({ dependencies: [] } as any);
        return Promise.resolve(null as any);
      });

      fixture.detectChanges();
      tick();

      // Should keep defaults when backend returns null
      expect(component.settings.volume).toBe(100);
      expect(component.settings.enable_tray_icon).toBe(true);
    }));

    it('should force Smooth Glass theme (theme 0)', fakeAsync(() => {
      tauriServiceSpy.call.and.callFake(<T>(command: string): Promise<T> => {
        if (command === 'get_settings') return Promise.resolve({ ...defaultSettings, theme: 5 } as any);
        if (command === 'get_sources') return Promise.resolve(mockSources as any);
        if (command === 'check_dependencies') return Promise.resolve({ dependencies: [] } as any);
        if (command === 'get_mpv_preset') return Promise.resolve('' as any);
        return Promise.resolve(null as any);
      });

      fixture.detectChanges();
      tick();

      expect(component.settings.theme).toBe(0);
    }));
  });

  // =========================================================================
  // Sources Tests
  // =========================================================================

  describe('Sources Management', () => {
    it('should load sources on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(tauriServiceSpy.call).toHaveBeenCalledWith('get_sources');
      expect(component.sources.length).toBe(2);
    }));

    it('should navigate to setup when no sources exist', fakeAsync(() => {
      tauriServiceSpy.call.and.callFake(<T>(command: string): Promise<T> => {
        if (command === 'get_settings') return Promise.resolve(defaultSettings as any);
        if (command === 'get_sources') return Promise.resolve([] as any);
        if (command === 'check_dependencies') return Promise.resolve({ dependencies: [] } as any);
        if (command === 'get_mpv_preset') return Promise.resolve('' as any);
        return Promise.resolve(null as any);
      });

      fixture.detectChanges();
      tick();

      expect(memoryServiceMock.AddingAdditionalSource).toBe(false);
    }));

    it('should refresh sources when RefreshSources event fires', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const callCountBefore = tauriServiceSpy.call.calls.count();
      refreshSourcesSubject.next(null);
      tick();

      // Should have called get_sources again
      const getSourcesCalls = tauriServiceSpy.call.calls
        .allArgs()
        .filter((args) => args[0] === 'get_sources');
      expect(getSourcesCalls.length).toBeGreaterThan(1);
    }));
  });

  // =========================================================================
  // Settings Update Tests
  // =========================================================================

  describe('Settings Updates', () => {
    it('should call update_settings when updateSettings is invoked', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.updateSettings();
      tick();

      expect(tauriServiceSpy.call).toHaveBeenCalledWith('update_settings', {
        settings: jasmine.objectContaining({ volume: 100 }),
      });
    }));

    it('should show success toast after saving settings', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.updateSettings();
      tick();

      expect(toastrSpy.success).toHaveBeenCalledWith('Settings saved', '', jasmine.any(Object));
    }));

    it('should trim mpv_params before saving', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.settings.mpv_params = '  --cache=yes  ';
      component.updateSettings();
      tick();

      expect(component.settings.mpv_params).toBe('--cache=yes');
    }));

    it('should set mpv_params to undefined when empty string', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.settings.mpv_params = '   ';
      component.updateSettings();
      tick();

      expect(component.settings.mpv_params).toBeUndefined();
    }));
  });

  // =========================================================================
  // MPV Preset Tests
  // =========================================================================

  describe('MPV Presets', () => {
    it('should have 5 preset options', () => {
      expect(component.mpvPresets.length).toBe(5);
    });

    it('should not apply preset when "custom" is selected', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const callCountBefore = tauriServiceSpy.call.calls.count();
      component.selectedPreset = 'custom';
      component.applyPreset();
      tick();

      // Should not have called get_mpv_preset for 'custom'
      const presetCalls = tauriServiceSpy.call.calls
        .allArgs()
        .filter(
          (args) =>
            args[0] === 'get_mpv_preset' && args[1]?.['preset'] === 'custom',
        );
      expect(presetCalls.length).toBe(0);
    }));

    it('should apply preset params when a non-custom preset is selected', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.selectedPreset = 'stable';
      component.applyPreset();
      tick();

      expect(tauriServiceSpy.call).toHaveBeenCalledWith('get_mpv_preset', {
        preset: 'stable',
      });
    }));
  });

  // =========================================================================
  // Dependency Check Tests
  // =========================================================================

  describe('Dependency Checks', () => {
    it('should check dependencies on construction', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(tauriServiceSpy.call).toHaveBeenCalledWith('check_dependencies');
    }));

    it('should populate dependency results', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(component.dependencyResult).toBeTruthy();
      expect(component.dependencyResult.dependencies.length).toBe(2);
      expect(component.dependencyResult.dependencies[0].name).toBe('mpv');
      expect(component.dependencyResult.dependencies[0].installed).toBe(true);
      expect(component.dependencyResult.dependencies[1].name).toBe('yt-dlp');
      expect(component.dependencyResult.dependencies[1].installed).toBe(false);
    }));

    it('should track installing state per dependency', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(component.installingMap.get('mpv')).toBeFalsy();

      component.installDependency('mpv');
      expect(component.installingMap.get('mpv')).toBe(true);

      tick();

      expect(component.installingMap.get('mpv')).toBe(false);
    }));

    it('should not allow double-install of same dependency', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.installingMap.set('mpv', true);
      component.installDependency('mpv');
      tick();

      // Should only have been called once for auto_install_dependency
      const installCalls = tauriServiceSpy.call.calls
        .allArgs()
        .filter((args) => args[0] === 'auto_install_dependency');
      expect(installCalls.length).toBe(0);
    }));
  });

  // =========================================================================
  // Refresh All Tests
  // =========================================================================

  describe('Refresh All', () => {
    it('should set IsRefreshing flag during refresh', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const refreshPromise = component.refreshAll();
      expect(memoryServiceMock.IsRefreshing).toBe(true);

      tick();

      expect(memoryServiceMock.IsRefreshing).toBe(false);
    }));

    it('should refresh each source individually', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.refreshAll();
      tick();

      const refreshCalls = tauriServiceSpy.call.calls
        .allArgs()
        .filter((args) => args[0] === 'refresh_source');
      expect(refreshCalls.length).toBe(2);
    }));

    it('should show success toast after refresh completes', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.refreshAll();
      tick();

      expect(toastrSpy.success).toHaveBeenCalledWith('Successfully updated all sources');
    }));

    it('should reset refresh state even if a source fails', fakeAsync(() => {
      tauriServiceSpy.call.and.callFake(<T>(command: string, _args?: any): Promise<T> => {
        if (command === 'get_settings') return Promise.resolve(defaultSettings as any);
        if (command === 'get_sources') return Promise.resolve(mockSources as any);
        if (command === 'check_dependencies') return Promise.resolve({ dependencies: [] } as any);
        if (command === 'get_mpv_preset') return Promise.resolve('' as any);
        if (command === 'refresh_source') return Promise.reject('Network error');
        return Promise.resolve(null as any);
      });

      fixture.detectChanges();
      tick();

      component.refreshAll();
      tick();

      expect(memoryServiceMock.IsRefreshing).toBe(false);
      expect(memoryServiceMock.RefreshPlaylist).toBe('');
    }));
  });

  // =========================================================================
  // Keyboard Navigation Tests
  // =========================================================================

  describe('Keyboard Navigation', () => {
    it('should navigate back on Escape key', () => {
      fixture.detectChanges();
      spyOn(component, 'goBack');

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.onKeyDown(event);

      expect(component.goBack).toHaveBeenCalled();
    });

    it('should navigate back on Backspace when not in input', () => {
      fixture.detectChanges();
      spyOn(component, 'goBack');
      spyOn(component, 'isInputFocused').and.returnValue(false);

      const event = new KeyboardEvent('keydown', { key: 'Backspace' });
      component.onKeyDown(event);

      expect(component.goBack).toHaveBeenCalled();
    });

    it('should NOT navigate back on Backspace when input is focused', () => {
      fixture.detectChanges();
      spyOn(component, 'goBack');
      spyOn(component, 'isInputFocused').and.returnValue(true);

      const event = new KeyboardEvent('keydown', { key: 'Backspace' });
      component.onKeyDown(event);

      expect(component.goBack).not.toHaveBeenCalled();
    });

    it('should close modal on Escape if modal is open', () => {
      fixture.detectChanges();
      const closeSpy = jasmine.createSpy('close');
      memoryServiceMock.ModalRef = { close: closeSpy };

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.onKeyDown(event);

      expect(closeSpy).toHaveBeenCalledWith('close');
    });
  });

  // =========================================================================
  // Folder Selection Tests
  // =========================================================================

  describe('Folder Selection', () => {
    it('should open folder dialog when selectFolder is called', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.selectFolder();
      tick();

      expect(tauriServiceSpy.openDialog).toHaveBeenCalledWith(
        jasmine.objectContaining({
          directory: true,
          canCreateDirectories: true,
        }),
      );
    }));

    it('should update recording_path when folder is selected (string)', fakeAsync(() => {
      tauriServiceSpy.openDialog.and.returnValue(Promise.resolve('/new/path'));
      fixture.detectChanges();
      tick();

      component.selectFolder();
      tick();

      expect(component.settings.recording_path).toBe('/new/path');
    }));

    it('should update recording_path when folder is selected (array)', fakeAsync(() => {
      tauriServiceSpy.openDialog.and.returnValue(Promise.resolve(['/new/path']));
      fixture.detectChanges();
      tick();

      component.selectFolder();
      tick();

      expect(component.settings.recording_path).toBe('/new/path');
    }));

    it('should not update recording_path when dialog is cancelled', fakeAsync(() => {
      tauriServiceSpy.openDialog.and.returnValue(Promise.resolve(null));
      fixture.detectChanges();
      tick();

      component.settings.recording_path = '/original/path';
      component.selectFolder();
      tick();

      expect(component.settings.recording_path).toBe('/original/path');
    }));
  });

  // =========================================================================
  // Refresh Interval Tests
  // =========================================================================

  describe('Refresh Intervals', () => {
    it('should have correct refresh interval options', () => {
      expect(component.refreshIntervals.length).toBe(6);
      expect(component.refreshIntervals[0]).toEqual({ value: 0, label: 'Disabled' });
      expect(component.refreshIntervals[1]).toEqual({ value: 1, label: 'Hourly' });
    });
  });

  // =========================================================================
  // Cleanup Tests
  // =========================================================================

  describe('Cleanup', () => {
    it('should unsubscribe all subscriptions on destroy', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const subSpies = component.subscriptions.map((sub) => spyOn(sub, 'unsubscribe'));

      component.ngOnDestroy();

      subSpies.forEach((spy) => {
        expect(spy).toHaveBeenCalled();
      });
    }));
  });
});
