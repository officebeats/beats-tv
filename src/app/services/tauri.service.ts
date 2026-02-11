import { Injectable, NgZone } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn, Event, emit } from '@tauri-apps/api/event';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getVersion } from '@tauri-apps/api/app';
import { open, OpenDialogOptions } from '@tauri-apps/plugin-dialog';
export { UnlistenFn, Event };

/**
 * Cache entry with timestamp and TTL
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

@Injectable({
  providedIn: 'root',
})
export class TauriService {
  // Cache management
  private cache = new Map<string, CacheEntry<unknown>>();
  private cacheStats: CacheStats = { hits: 0, misses: 0, size: 0 };
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Retry configuration
  private readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffFactor: 2,
  };

  // Cache cleanup interval
  private cacheCleanupInterval?: number;

  constructor(private zone: NgZone) {
    // Start periodic cache cleanup
    this.startCacheCleanup();
  }

  // ─── Public Methods ─────────────────────────────────────────────────────

  /**
   * Invokes a command on Rust backend via Tauri IPC with retry logic.
   * @param command The name of command.
   * @param args Optional arguments for command.
   * @param retryConfig Optional retry configuration.
   */
  async call<T>(
    command: string,
    args?: Record<string, unknown>,
    retryConfig?: Partial<RetryConfig>,
  ): Promise<T> {
    const config = { ...this.DEFAULT_RETRY_CONFIG, ...retryConfig };
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await invoke<T>(command, args);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on the last attempt
        if (attempt === config.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay,
        );

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Invokes a command with caching.
   * @param command The name of command.
   * @param args Optional arguments for command.
   * @param ttl Cache time-to-live in milliseconds.
   */
  async callWithCache<T>(
    command: string,
    args?: Record<string, unknown>,
    ttl?: number,
  ): Promise<T> {
    const cacheKey = this.getCacheKey(command, args);
    const cached = this.getFromCache<T>(cacheKey);

    if (cached !== null) {
      this.cacheStats.hits++;
      return cached;
    }

    this.cacheStats.misses++;
    const result = await this.call<T>(command, args);
    this.setCache(cacheKey, result, ttl ?? this.DEFAULT_CACHE_TTL);
    return result;
  }

  /**
   * Listens for an event from Rust backend.
   * Automatically handles NgZone wrapping so UI updates work correctly.
   * @param event The event name.
   * @param handler The callback function.
   * @returns A promise that resolves to an unlisten function.
   */
  async on<T>(event: string, handler: (payload: T) => void): Promise<UnlistenFn> {
    return await listen<T>(event, (eventObj: Event<T>) => {
      this.zone.run(() => {
        handler(eventObj.payload);
      });
    });
  }

  /**
   * Emits an event to backend.
   * @param event The name of event.
   * @param payload Optional payload to send with event.
   */
  async emit<T>(event: string, payload?: T): Promise<void> {
    await emit(event, payload);
  }

  async getAppVersion(): Promise<string> {
    return await getVersion();
  }

  async setZoom(factor: number): Promise<void> {
    await getCurrentWebview().setZoom(factor);
  }

  async openDialog(options: OpenDialogOptions): Promise<string | string[] | null> {
    return await open(options);
  }

  async saveDialog(options: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
    canCreateDirectories?: boolean;
    title?: string;
  }): Promise<string | null> {
    const { save } = await import('@tauri-apps/plugin-dialog');
    return await save(options);
  }

  async openUrl(url: string): Promise<void> {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
  }

  async clipboardWriteText(text: string): Promise<void> {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    await writeText(text);
  }

  // ─── Cache Management ─────────────────────────────────────────────────

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return { ...this.cacheStats };
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheStats.size = 0;
  }

  /**
   * Clear cache for a specific command
   */
  clearCommandCache(command: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(command + ':')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
    this.cacheStats.size = this.cache.size;
  }

  /**
   * Invalidate cache entries older than specified time
   */
  invalidateCacheOlderThan(maxAge: number): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.cacheStats.size = this.cache.size;
  }

  // ─── Private Methods ───────────────────────────────────────────────────

  /**
   * Get a value from cache
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.cacheStats.size = this.cache.size;
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache
   */
  private setCache<T>(key: string, value: T, ttl: number): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });
    this.cacheStats.size = this.cache.size;
  }

  /**
   * Generate cache key from command and args
   */
  private getCacheKey(command: string, args?: Record<string, unknown>): string {
    if (!args) {
      return command;
    }
    const argsString = JSON.stringify(args);
    return `${command}:${argsString}`;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    // Clean up expired cache entries every minute
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, 60 * 1000);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.cacheStats.size = this.cache.size;
  }

  /**
   * Cleanup on service destruction
   */
  ngOnDestroy(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    this.clearCache();
  }
}
