import { Injectable } from '@angular/core';
import { TauriService } from './tauri.service';

export interface CastMember {
  name: string;
  character?: string;
}

export interface MovieData {
  title: string;
  year?: string;
  rated?: string;
  runtime?: number;
  genres: string[];
  director?: string;
  writers: string[];
  actors: CastMember[];
  plot?: string;
  posterUrl?: string;
  imdbRating?: number;
  imdbVotes?: string;
  metascore?: number;
  rottenTomatoes?: string;
  awards?: string;
  boxOffice?: string;
  imdbId?: string;
}

interface OmdbMovieData {
  title: string;
  year?: string;
  rated?: string;
  runtime?: number;
  genres: string[];
  director?: string;
  writers: string[];
  actors: string[];
  plot?: string;
  poster_url?: string;
  imdb_rating?: number;
  imdb_votes?: string;
  metascore?: number;
  rotten_tomatoes?: string;
  awards?: string;
  box_office?: string;
  imdb_id?: string;
}

/**
 * Three-tier caching service for movie metadata (OMDb)
 * 
 * Tier 1: Memory Cache (~10ms) - Fastest, cleared on app reload
 * Tier 2: SQLite Cache (~20ms) - Persistent, 30-day TTL
 * Tier 3: OMDb API (~100-300ms) - Network request (free, no API key needed)
 */
@Injectable({
  providedIn: 'root'
})
export class MovieMetadataService {
  // Memory cache (Tier 1)
  private memoryCache = new Map<string, MovieData>();
  private pendingRequests = new Map<string, Promise<MovieData | null>>();
  
  // Hover prefetch debounce timer
  private prefetchTimer: any = null;
  private readonly PREFETCH_DELAY = 200; // ms

  constructor(private tauri: TauriService) {}

  /**
   * Get movie data with three-tier caching
   * Priority: Memory -> SQLite -> OMDb API
   */
  async getMovieData(title: string, year?: number): Promise<MovieData | null> {
    const cacheKey = this.getCacheKey(title, year);
    
    // Tier 1: Check memory cache first (~10ms)
    const memoryCached = this.memoryCache.get(cacheKey);
    if (memoryCached) {
      console.log('[OMDb] Memory cache hit:', title);
      return memoryCached;
    }
    
    // Check for pending request to avoid duplicate API calls
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      console.log('[OMDb] Reusing pending request:', title);
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
        console.log('[OMDb] Prefetching:', title);
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
  ): Promise<MovieData | null> {
    try {
      // Clean the title for better search
      const cleanTitle = this.cleanTitle(title);
      const searchYear = year || this.extractYear(title);
      
      // Call the Rust backend which handles SQLite cache (Tier 2) and OMDb API (Tier 3)
      const result = await this.tauri.call<OmdbMovieData | null>('omdb_search_and_cache', {
        title: cleanTitle,
        year: searchYear
      });
      
      if (!result) {
        return null;
      }
      
      // Transform the raw OMDb data to our UI format
      const movieData = this.transformOmdbData(result);
      
      // Store in memory cache (Tier 1)
      this.memoryCache.set(cacheKey, movieData);
      
      return movieData;
    } catch (error) {
      console.error('[OMDb] Error fetching movie data:', error);
      return null;
    }
  }

  private transformOmdbData(omdbResult: OmdbMovieData): MovieData {
    // Transform actors array to CastMember format
    const actors: CastMember[] = (omdbResult.actors || []).map(name => ({
      name,
      character: undefined
    }));

    return {
      title: omdbResult.title,
      year: omdbResult.year,
      rated: omdbResult.rated,
      runtime: omdbResult.runtime,
      genres: omdbResult.genres || [],
      director: omdbResult.director,
      writers: omdbResult.writers || [],
      actors,
      plot: omdbResult.plot,
      posterUrl: omdbResult.poster_url,
      imdbRating: omdbResult.imdb_rating,
      imdbVotes: omdbResult.imdb_votes,
      metascore: omdbResult.metascore,
      rottenTomatoes: omdbResult.rotten_tomatoes,
      awards: omdbResult.awards,
      boxOffice: omdbResult.box_office,
      imdbId: omdbResult.imdb_id
    };
  }

  private getCacheKey(title: string, year?: number): string {
    return year ? `${title}:${year}` : title;
  }
}
