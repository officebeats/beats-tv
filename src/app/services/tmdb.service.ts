import { Injectable } from '@angular/core';
import { TauriService } from './tauri.service';

export interface TmdbCastMember {
  name: string;
  character: string;
  profileUrl: string | null;
  photoLoaded?: boolean;
}

export interface TmdbMovieData {
  title: string;
  originalTitle?: string;
  tagline?: string;
  overview?: string;
  releaseYear?: string;
  runtime?: number;
  voteAverage?: number;
  voteCount?: number;
  certification?: string;
  genres?: string[];
  backdropUrl?: string;
  posterUrl?: string;
  cast?: TmdbCastMember[];
  director?: string;
  trailerKey?: string;
  status?: string;
}

interface TmdbMovieDetails {
  id: number;
  title: string;
  original_title?: string;
  tagline?: string;
  overview?: string;
  release_date?: string;
  runtime?: number;
  vote_average?: number;
  vote_count?: number;
  poster_path?: string;
  backdrop_path?: string;
  genres?: { id: number; name: string }[];
  credits?: {
    cast?: Array<{
      name: string;
      character?: string;
      profile_path?: string;
    }>;
    crew?: Array<{
      name: string;
      job: string;
    }>;
  };
  videos?: {
    results?: Array<{
      key: string;
      site: string;
      type: string;
    }>;
  };
  status?: string;
}

/**
 * Three-tier caching service for TMDB movie data
 * 
 * Tier 1: Memory Cache (~10ms) - Fastest, cleared on app reload
 * Tier 2: SQLite Cache (~20ms) - Persistent, 30-day TTL
 * Tier 3: TMDB API (~100-300ms) - Network request with rate limiting
 */
@Injectable({
  providedIn: 'root'
})
export class TmdbService {
  // Memory cache (Tier 1)
  private memoryCache = new Map<string, TmdbMovieData>();
  private pendingRequests = new Map<string, Promise<TmdbMovieData | null>>();
  
  // Hover prefetch debounce timer
  private prefetchTimer: any = null;
  private readonly PREFETCH_DELAY = 200; // ms

  constructor(private tauri: TauriService) {}

  /**
   * Get movie data with three-tier caching
   * Priority: Memory -> SQLite -> TMDB API
   */
  async getMovieData(title: string, year?: number): Promise<TmdbMovieData | null> {
    const cacheKey = this.getCacheKey(title, year);
    
    // Tier 1: Check memory cache first (~10ms)
    const memoryCached = this.memoryCache.get(cacheKey);
    if (memoryCached) {
      console.log('[TMDB] Memory cache hit:', title);
      return memoryCached;
    }
    
    // Check for pending request to avoid duplicate API calls
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      console.log('[TMDB] Reusing pending request:', title);
      return pending;
    }
    
    // Create the fetch promise
    const fetchPromise = this.fetchMovieData(title, year, cacheKey);
    this.pendingRequests.set(cacheKey, fetchPromise);
    
    try {
      const result = await fetchPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Prefetch movie data on hover (debounced)
   * This starts loading data before the user clicks
   */
  prefetchMovieData(title: string, year?: number): void {
    // Clear any existing timer
    if (this.prefetchTimer) {
      clearTimeout(this.prefetchTimer);
    }
    
    // Set a new timer for debounced prefetch
    this.prefetchTimer = setTimeout(() => {
      const cacheKey = this.getCacheKey(title, year);
      
      // Only prefetch if not already cached
      if (!this.memoryCache.has(cacheKey)) {
        console.log('[TMDB] Prefetching:', title);
        this.getMovieData(title, year).catch(() => {
          // Silently fail on prefetch - it's just optimization
        });
      }
    }, this.PREFETCH_DELAY);
  }

  /**
   * Cancel any pending prefetch
   */
  cancelPrefetch(): void {
    if (this.prefetchTimer) {
      clearTimeout(this.prefetchTimer);
      this.prefetchTimer = null;
    }
  }

  /**
   * Clear the memory cache
   */
  clearMemoryCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { memory: number; pending: number } {
    return {
      memory: this.memoryCache.size,
      pending: this.pendingRequests.size
    };
  }

  /**
   * Clean a movie title for better search results
   */
  cleanTitle(title: string): string {
    return title
      .replace(/\s*(HD|SD|4K|UHD|FHD)\s*$/i, '')
      .replace(/^\[?[A-Z]{2,3}\]?[\|:]\s*/i, '')
      .replace(/\s*\(\d{4}\)\s*$/, '')
      .trim();
  }

  /**
   * Extract year from title if present
   */
  extractYear(title: string): number | undefined {
    const match = title.match(/\((\d{4})\)/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  // Private methods

  private async fetchMovieData(
    title: string, 
    year: number | undefined, 
    cacheKey: string
  ): Promise<TmdbMovieData | null> {
    try {
      // Clean the title for better search
      const cleanTitle = this.cleanTitle(title);
      const searchYear = year || this.extractYear(title);
      
      // Call the Rust backend which handles SQLite cache (Tier 2) and TMDB API (Tier 3)
      const result = await this.tauri.call<TmdbMovieDetails | null>('tmdb_search_and_cache', {
        title: cleanTitle,
        year: searchYear
      });
      
      if (!result) {
        return null;
      }
      
      // Transform the raw TMDB data to our UI format
      const movieData = this.transformTmdbData(result);
      
      // Store in memory cache (Tier 1)
      this.memoryCache.set(cacheKey, movieData);
      
      return movieData;
    } catch (error) {
      console.error('[TMDB] Error fetching movie data:', error);
      return null;
    }
  }

  private transformTmdbData(tmdbResult: TmdbMovieDetails): TmdbMovieData {
    // Get top 10 cast members with photos
    const cast = tmdbResult.credits?.cast?.slice(0, 10).map(actor => ({
      name: actor.name,
      character: actor.character || '',
      profileUrl: actor.profile_path
        ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
        : null
    })) || [];

    // Find the first YouTube trailer
    const trailer = tmdbResult.videos?.results?.find(
      v => v.site === 'YouTube' && v.type === 'Trailer'
    );

    // Find director from crew
    const director = tmdbResult.credits?.crew?.find(c => c.job === 'Director')?.name;

    return {
      title: tmdbResult.title,
      originalTitle: tmdbResult.original_title,
      tagline: tmdbResult.tagline,
      overview: tmdbResult.overview,
      releaseYear: tmdbResult.release_date ? tmdbResult.release_date.substring(0, 4) : undefined,
      runtime: tmdbResult.runtime,
      voteAverage: tmdbResult.vote_average,
      voteCount: tmdbResult.vote_count,
      genres: tmdbResult.genres?.map(g => g.name) || [],
      backdropUrl: tmdbResult.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${tmdbResult.backdrop_path}`
        : undefined,
      posterUrl: tmdbResult.poster_path
        ? `https://image.tmdb.org/t/p/w500${tmdbResult.poster_path}`
        : undefined,
      cast,
      director,
      trailerKey: trailer?.key,
      status: tmdbResult.status
    };
  }

  private getCacheKey(title: string, year?: number): string {
    return year ? `${title}:${year}` : title;
  }
}
