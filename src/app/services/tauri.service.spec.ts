import { TestBed } from '@angular/core/testing';
import { TauriService } from './tauri.service';

describe('TauriService', () => {
  let service: TauriService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TauriService],
    });

    service = TestBed.inject(TauriService);
  });

  afterEach(() => {
    // Clean up service
    if (service) {
      service.ngOnDestroy();
    }
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with empty cache', () => {
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear all cache entries', () => {
      service.clearCache();
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should clear cache for specific command', () => {
      service.clearCommandCache('test_command');
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should invalidate cache older than specified time', () => {
      service.invalidateCacheOlderThan(1000);
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should return cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect('hits' in stats).toBe(true);
      expect('misses' in stats).toBe(true);
      expect('size' in stats).toBe(true);
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
      expect(typeof stats.size).toBe('number');
    });
  });

  describe('Public Methods', () => {
    it('should have call method', () => {
      expect(typeof service.call).toBe('function');
    });

    it('should have callWithCache method', () => {
      expect(typeof service.callWithCache).toBe('function');
    });

    it('should have on method', () => {
      expect(typeof service.on).toBe('function');
    });

    it('should have emit method', () => {
      expect(typeof service.emit).toBe('function');
    });

    it('should have getAppVersion method', () => {
      expect(typeof service.getAppVersion).toBe('function');
    });

    it('should have setZoom method', () => {
      expect(typeof service.setZoom).toBe('function');
    });

    it('should have openDialog method', () => {
      expect(typeof service.openDialog).toBe('function');
    });

    it('should have saveDialog method', () => {
      expect(typeof service.saveDialog).toBe('function');
    });

    it('should have openUrl method', () => {
      expect(typeof service.openUrl).toBe('function');
    });

    it('should have clipboardWriteText method', () => {
      expect(typeof service.clipboardWriteText).toBe('function');
    });

    it('should have getCacheStats method', () => {
      expect(typeof service.getCacheStats).toBe('function');
    });

    it('should have clearCache method', () => {
      expect(typeof service.clearCache).toBe('function');
    });

    it('should have clearCommandCache method', () => {
      expect(typeof service.clearCommandCache).toBe('function');
    });

    it('should have invalidateCacheOlderThan method', () => {
      expect(typeof service.invalidateCacheOlderThan).toBe('function');
    });

    it('should have ngOnDestroy method', () => {
      expect(typeof service.ngOnDestroy).toBe('function');
    });
  });
});
