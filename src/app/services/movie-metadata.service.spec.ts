import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MovieMetadataService, MovieData } from './movie-metadata.service';
import { TauriService } from './tauri.service';

describe('MovieMetadataService', () => {
  let service: MovieMetadataService;
  let tauriService: jasmine.SpyObj<TauriService>;

  const mockOmdbResult = {
    title: 'The Matrix',
    year: '1999',
    rated: 'R',
    runtime: 136,
    genres: ['Action', 'Sci-Fi'],
    director: 'Lana Wachowski',
    writers: ['Lana Wachowski', 'Lilly Wachowski'],
    actors: ['Keanu Reeves', 'Laurence Fishburne'],
    plot: 'A computer hacker learns about the true nature of reality.',
    poster_url: 'https://example.com/poster.jpg',
    imdb_rating: 8.7,
    imdb_votes: '1,900,000',
    metascore: 73,
    rotten_tomatoes: '88%',
    awards: 'Won 4 Oscars',
    box_office: '$171,479,930',
    imdb_id: 'tt0133093',
  };

  beforeEach(() => {
    tauriService = jasmine.createSpyObj('TauriService', ['call']);

    TestBed.configureTestingModule({
      providers: [
        MovieMetadataService,
        { provide: TauriService, useValue: tauriService },
      ],
    });

    service = TestBed.inject(MovieMetadataService);
  });

  // ─── Core Functionality ────────────────────────────────────────────────

  describe('getMovieData', () => {
    it('should fetch movie data from backend', async () => {
      tauriService.call.and.returnValue(Promise.resolve(mockOmdbResult));

      const result = await service.getMovieData('The Matrix');

      expect(result).toBeTruthy();
      expect(result!.title).toBe('The Matrix');
      expect(result!.imdbRating).toBe(8.7);
      expect(result!.genres).toEqual(['Action', 'Sci-Fi']);
    });

    it('should transform actors to CastMember format', async () => {
      tauriService.call.and.returnValue(Promise.resolve(mockOmdbResult));

      const result = await service.getMovieData('The Matrix');

      expect(result!.actors.length).toBe(2);
      expect(result!.actors[0].name).toBe('Keanu Reeves');
      expect(result!.actors[1].name).toBe('Laurence Fishburne');
    });

    it('should return null when backend returns null', async () => {
      tauriService.call.and.returnValue(Promise.resolve(null));

      const result = await service.getMovieData('Unknown Movie');

      expect(result).toBeNull();
    });

    it('should return null on backend error', async () => {
      tauriService.call.and.returnValue(Promise.reject('API Error'));

      const result = await service.getMovieData('Error Movie');

      expect(result).toBeNull();
    });
  });

  // ─── Memory Cache (Tier 1) ─────────────────────────────────────────────

  describe('Memory Cache', () => {
    it('should cache results in memory after first fetch', async () => {
      tauriService.call.and.returnValue(Promise.resolve(mockOmdbResult));

      // First call - fetches from backend
      await service.getMovieData('The Matrix');
      expect(tauriService.call).toHaveBeenCalledTimes(1);

      // Second call - should use memory cache
      const result = await service.getMovieData('The Matrix');
      expect(tauriService.call).toHaveBeenCalledTimes(1); // No additional call
      expect(result!.title).toBe('The Matrix');
    });

    it('should use different cache keys for different years', async () => {
      tauriService.call.and.returnValue(Promise.resolve(mockOmdbResult));

      await service.getMovieData('The Matrix', 1999);
      await service.getMovieData('The Matrix', 2003);

      expect(tauriService.call).toHaveBeenCalledTimes(2);
    });

    it('should clear memory cache', async () => {
      tauriService.call.and.returnValue(Promise.resolve(mockOmdbResult));

      await service.getMovieData('The Matrix');
      service.clearMemoryCache();

      // Should fetch again after cache clear
      await service.getMovieData('The Matrix');
      expect(tauriService.call).toHaveBeenCalledTimes(2);
    });

    it('should report cache statistics', async () => {
      tauriService.call.and.returnValue(Promise.resolve(mockOmdbResult));

      expect(service.getCacheStats().memory).toBe(0);

      await service.getMovieData('The Matrix');
      expect(service.getCacheStats().memory).toBe(1);

      await service.getMovieData('Inception');
      expect(service.getCacheStats().memory).toBe(2);
    });
  });

  // ─── Deduplication ─────────────────────────────────────────────────────

  describe('Request Deduplication', () => {
    it('should not make duplicate API calls for same title', async () => {
      let resolvePromise: (value: any) => void;
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      tauriService.call.and.returnValue(slowPromise);

      // Start two concurrent requests for the same title
      const promise1 = service.getMovieData('The Matrix');
      const promise2 = service.getMovieData('The Matrix');

      // Resolve the backend call
      resolvePromise!(mockOmdbResult);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Should only have made one backend call
      expect(tauriService.call).toHaveBeenCalledTimes(1);
      expect(result1!.title).toBe('The Matrix');
      expect(result2!.title).toBe('The Matrix');
    });
  });

  // ─── Title Cleaning ────────────────────────────────────────────────────

  describe('Title Cleaning', () => {
    it('should remove HD/SD/4K suffixes', () => {
      expect(service.cleanTitle('The Matrix HD')).toBe('The Matrix');
      expect(service.cleanTitle('Inception 4K')).toBe('Inception');
      expect(service.cleanTitle('Avatar UHD')).toBe('Avatar');
    });

    it('should remove country prefixes', () => {
      expect(service.cleanTitle('US| The Matrix')).toBe('The Matrix');
      expect(service.cleanTitle('[EN]: Inception')).toBe('Inception');
    });

    it('should remove year in parentheses from title', () => {
      expect(service.cleanTitle('The Matrix (1999)')).toBe('The Matrix');
    });

    it('should handle already clean titles', () => {
      expect(service.cleanTitle('The Matrix')).toBe('The Matrix');
    });
  });

  // ─── Year Extraction ──────────────────────────────────────────────────

  describe('Year Extraction', () => {
    it('should extract year from title with parentheses', () => {
      expect(service.extractYear('The Matrix (1999)')).toBe(1999);
    });

    it('should return undefined when no year present', () => {
      expect(service.extractYear('The Matrix')).toBeUndefined();
    });
  });

  // ─── Prefetch ──────────────────────────────────────────────────────────

  describe('Prefetch', () => {
    it('should cancel prefetch on cancelPrefetch call', fakeAsync(() => {
      tauriService.call.and.returnValue(Promise.resolve(mockOmdbResult));

      service.prefetchMovieData('The Matrix');
      service.cancelPrefetch();

      tick(300); // Wait past debounce

      expect(tauriService.call).not.toHaveBeenCalled();
    }));

    it('should not prefetch if already cached', fakeAsync(async () => {
      tauriService.call.and.returnValue(Promise.resolve(mockOmdbResult));

      // First, cache the data
      await service.getMovieData('The Matrix');
      const callCount = tauriService.call.calls.count();

      // Now prefetch - should skip since it's cached
      service.prefetchMovieData('The Matrix');
      tick(300);

      expect(tauriService.call.calls.count()).toBe(callCount);
    }));
  });
});
