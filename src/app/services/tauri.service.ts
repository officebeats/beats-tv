import { Injectable, NgZone } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn, Event, emit } from '@tauri-apps/api/event';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getVersion } from '@tauri-apps/api/app';
import { open, OpenDialogOptions } from '@tauri-apps/plugin-dialog';
export { UnlistenFn, Event };

@Injectable({
  providedIn: 'root',
})
export class TauriService {
  private isBrowser = false;

  constructor(private zone: NgZone) {
    // Check if we are running in a Tauri environment
    this.isBrowser = (window as any).__TAURI__ === undefined;
    if (this.isBrowser) {
      console.warn('Running in browser mode. Tauri APIs will be mocked.');
    }
  }

  /**
   * Invokes a command on the Rust backend.
   * @param command The name of the command.
   * @param args Optional arguments for the command.
   */
  async call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    if (this.isBrowser) {
      return this.mockInvoke<T>(command, args);
    }
    try {
      return await invoke<T>(command, args);
    } catch (error) {
      console.error(`Tauri command "${command}" failed:`, error);
      throw error;
    }
  }

  /**
   * Listens for an event from the Rust backend.
   * Automatically handles NgZone wrapping so UI updates work correctly.
   * @param event The event name.
   * @param handler The callback function.
   * @returns A promise that resolves to an unlisten function.
   */
  async on<T>(event: string, handler: (payload: T) => void): Promise<UnlistenFn> {
    if (this.isBrowser) {
      return (() => {}) as any;
    }
    return await listen<T>(event, (eventObj: Event<T>) => {
      this.zone.run(() => {
        handler(eventObj.payload);
      });
    });
  }

  /**
   * Emits an event to the backend.
   * @param event The name of the event.
   * @param payload Optional payload to send with the event.
   */
  async emit<T>(event: string, payload?: T): Promise<void> {
    if (this.isBrowser) {
      console.log(`Mock Emit: ${event}`, payload);
      return;
    }
    try {
      await emit(event, payload);
    } catch (error) {
      console.error(`Tauri emit "${event}" failed:`, error);
      throw error;
    }
  }

  async getAppVersion(): Promise<string> {
    if (this.isBrowser) return '2.1.0-browser';
    return await getVersion();
  }

  async setZoom(factor: number): Promise<void> {
    if (this.isBrowser) return;
    await getCurrentWebview().setZoom(factor);
  }

  async openDialog(options: OpenDialogOptions): Promise<string | string[] | null> {
    if (this.isBrowser) return null;
    return await open(options);
  }

  async saveDialog(options: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
    canCreateDirectories?: boolean;
    title?: string;
  }): Promise<string | null> {
    if (this.isBrowser) return null;
    const { save } = await import('@tauri-apps/plugin-dialog');
    return await save(options);
  }

  async openUrl(url: string): Promise<void> {
    if (this.isBrowser) {
      window.open(url, '_blank');
      return;
    }
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
  }

  async clipboardWriteText(text: string): Promise<void> {
    if (this.isBrowser) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    await writeText(text);
  }

  // --- Persistent Worker ---
  private worker: Worker | null = null;
  private workerUrl: string | null = null;

  private initWorker() {
    if (this.worker) return;

    const workerCode = `
      self.onmessage = async (e) => {
        const { id, type, url, source, mediaType, baseUrl } = e.data;
        
        try {
          if (type === 'FETCH') {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Fetch failed");
            const data = await response.json();
            
            const results = data.map(item => {
                let year;
                const yr = item.year || item.release_date || item.releasedate;
                
                // 1. Try explicit fields
                if (yr) {
                    const yrStr = String(yr);
                    if (yrStr.length === 4 && yrStr >= '1900' && yrStr <= '2099') {
                        year = yrStr;
                    } else if (yrStr.length >= 10 && yrStr[4] === '-') {
                        year = yrStr.substring(0, 4);
                    }
                }
                
                // 2. Fallback: Parse from Name (Common in IPTV)
                // Looks for (2024) or [2024] or - 2024
                if (!year && item.name) {
                    // Optimized regex: Matches 4 digits starting with 19 or 20, surrounded by non-digits
                    const match = item.name.match(/\\b(19\\d{2}|20\\d{2})\\b/);
                    if (match && match[1]) {
                        year = match[1];
                    }
                }

                // 3. Fallback: Parse from 'added' timestamp
                if (!year && item.added) {
                    const addedNum = parseInt(item.added, 10);
                    // Check if reasonable timestamp (e.g. > 1990)
                    // 631152000 = 1990-01-01
                    if (!isNaN(addedNum) && addedNum > 631152000) {
                        const date = new Date(addedNum * 1000);
                        const y = date.getFullYear();
                        // Allow up to slightly in future (2100) for pre-releases or bad clocks
                        if (y >= 1900 && y <= 2100) {
                            year = y.toString();
                        }
                    }
                }
                
                const streamUrl = mediaType === 2 
                  ? '' 
                  : \`\${baseUrl}/\${mediaType === 1 ? 'movie' : 'live'}/\${source.username}/\${source.password}/\${item.stream_id}.\${item.container_extension || 'mp4'}\`;

                return {
                    id: item.stream_id || item.series_id,
                    name: item.name,
                    image: item.stream_icon || item.cover,
                    media_type: mediaType,
                    rating: item.rating ? parseFloat(item.rating) : undefined,
                    group_title: item.category_id,
                    release_date: year,
                    url: streamUrl
                };
            });
            
            self.postMessage({ id, success: true, results, mediaType });
          }
        } catch (error) {
          self.postMessage({ id, success: false, error: error.message });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.workerUrl = URL.createObjectURL(blob);
    this.worker = new Worker(this.workerUrl);

    // Global listener for worker responses
    this.worker.onmessage = (e) => {
      // Handled by promises in the call map, but we can also handle generic sync events here if needed
    };
  }

  // Helper to run a worker task
  private runWorkerTask(payload: any): Promise<any> {
    this.initWorker();
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substr(2, 9);

      const handler = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.worker?.removeEventListener('message', handler);
          if (e.data.success) resolve(e.data.results);
          else reject(e.data.error);
        }
      };

      this.worker?.addEventListener('message', handler);
      this.worker?.postMessage({ ...payload, id, type: 'FETCH' });
    });
  }

  // NEW: Prefetch everything in background
  public prefetchMockData(source: any) {
    console.log('[TauriService] Starting background prefetch...');
    let baseUrl = source.url;
    if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    const types = [
      { id: 0, action: 'get_live_streams' },
      { id: 1, action: 'get_vod_streams' },
      { id: 2, action: 'get_series' },
    ];

    types.forEach((t) => {
      // Check if already in DB before fetching
      this.dbCheck(t.id).then((exists) => {
        if (!exists) {
          const fetchUrl = `${baseUrl}/player_api.php?username=${source.username}&password=${source.password}&action=${t.action}`;
          this.runWorkerTask({ url: fetchUrl, source, mediaType: t.id, baseUrl })
            .then((results) => {
              this.saveToDB(t.id, results);
              // Also update memory cache if initialized
              if ((window as any)._mockChannelCache) {
                (window as any)._mockChannelCache[t.id] = results;
              }
              console.log(`[Prefetch] Completed for type ${t.id}: ${results.length} items`);
            })
            .catch(console.error);
        }
      });
    });
  }

  // DB Helpers attached to class instance for reuse
  private dbCheck(type: number): Promise<boolean> {
    return new Promise((resolve) => {
      const r = indexedDB.open('MockCacheDB_v5', 1);
      r.onupgradeneeded = (e: any) =>
        e.target.result.createObjectStore('channels', { keyPath: 'type' });
      r.onsuccess = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('channels')) {
          resolve(false);
          return;
        }
        const tx = db.transaction('channels', 'readonly');
        tx.objectStore('channels').count(type).onsuccess = (ev: any) =>
          resolve(ev.target.result > 0);
      };
      r.onerror = () => resolve(false);
    });
  }

  private saveToDB(type: number, data: any[]) {
    const r = indexedDB.open('MockCacheDB_v5', 1);
    r.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction('channels', 'readwrite');
      tx.objectStore('channels').put({ type, data });
    };
  }

  private async getFromDB(type: number): Promise<any[]> {
    return new Promise((resolve) => {
      const request = indexedDB.open('MockCacheDB_v5', 1);
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('channels')) {
          resolve([]);
          return;
        }
        const tx = db.transaction('channels', 'readonly');
        const getReq = tx.objectStore('channels').get(type);
        getReq.onsuccess = () => resolve(getReq.result ? getReq.result.data : []);
        getReq.onerror = () => resolve([]);
      };
      request.onerror = () => resolve([]);
    });
  }

  private async mockInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    // console.log(`Mocking Tauri call: ${command}`, args);

    switch (command) {
      case 'get_settings':
        return {
          zoom: 1,
          enable_tray_icon: true,
          always_ask_save: false,
          default_view: 0,
          refresh_on_start: false,
        } as any as T;
      case 'get_sources': {
        let sourcesJson = localStorage.getItem('mock_sources');

        // AUTO-INJECT USER PLAYLIST IF MISSING (For testing)
        if (!sourcesJson || sourcesJson === '[]') {
          const initialSource = [
            {
              id: 8888,
              name: 'Strong8k2-PC',
              url: 'http://zfruvync.duperab.xyz',
              username: 'PE1S9S8U',
              password: '11EZZUMW',
              enabled: true,
              source_type: 2, // Xtream
            },
          ];
          sourcesJson = JSON.stringify(initialSource);
          localStorage.setItem('mock_sources', sourcesJson);
        }

        const sources = sourcesJson ? JSON.parse(sourcesJson) : [];

        // TRIGGER PREFETCH ON APP START/SOURCE LOAD
        if (sources.length > 0 && !(window as any)._prefetchStarted) {
          (window as any)._prefetchStarted = true;
          this.prefetchMockData(sources[0]);
        }

        return sources as any as T;
      }
      case 'source_name_exists':
        return false as any as T;
      case 'get_xtream':
      case 'get_m3u8':
      case 'add_source':
      case 'get_m3u8_from_link': {
        // Simulate adding a source
        const currentSources = JSON.parse(localStorage.getItem('mock_sources') || '[]');
        const sourceData = (args?.['source'] as any) || args;
        const newSource = {
          id: Math.floor(Math.random() * 1000000),
          name: sourceData.name || 'New Source',
          url: sourceData.url,
          username: sourceData.username,
          password: sourceData.password,
          enabled: true,
          source_type: sourceData.source_type !== undefined ? sourceData.source_type : 2,
        };
        currentSources.push(newSource);
        localStorage.setItem('mock_sources', JSON.stringify(currentSources));

        // Trigger prefetch for new source immediately
        this.prefetchMockData(newSource);

        return newSource as any as T;
      }
      case 'delete_source': {
        const id = args?.['id'] as number;
        const currentSources = JSON.parse(localStorage.getItem('mock_sources') || '[]');
        const updatedSources = currentSources.filter((s: any) => s.id !== id);
        localStorage.setItem('mock_sources', JSON.stringify(updatedSources));
        return true as any as T;
      }
      case 'toggle_source': {
        const id = args?.['sourceId'] as number;
        const value = args?.['value'] as boolean;
        const currentSources = JSON.parse(localStorage.getItem('mock_sources') || '[]');
        const source = currentSources.find((s: any) => s.id === id);
        if (source) {
          source.enabled = value;
        }
        localStorage.setItem('mock_sources', JSON.stringify(currentSources));
        return true as any as T;
      }
      case 'load_channels':
      case 'search': {
        const filters = args?.['filters'] as any;
        const mediaTypes = filters?.media_types || [];
        const limit = filters?.limit || 50;
        const page = filters?.page || 1;

        // --- 1. Initialize Memory Cache ---
        if (!(window as any)._mockChannelCache) {
          (window as any)._mockChannelCache = {
            0: null, // Live
            1: null, // Movies
            2: null, // Series
          };
        }
        const cache = (window as any)._mockChannelCache;

        // --- 2. Determine Action & Media Type ---
        let action = 'get_live_streams';
        let mediaType = 0;

        if (mediaTypes.includes(1)) {
          action = 'get_vod_streams';
          mediaType = 1;
        } else if (mediaTypes.includes(2)) {
          action = 'get_series';
          mediaType = 2;
        }

        let results: any[] = [];

        // --- 3. Memory Cache -> IndexedDB -> Active Prefetch -> Worker Fallback ---
        console.time(`[Perf] DataLoad-${mediaType}`);

        if (cache[mediaType]) {
          console.log(`[Perf] Cache Hit for type ${mediaType}`);
          results = cache[mediaType];
        } else {
          // Initialize promise cache if missing
          if (!(window as any)._prefetchPromises) (window as any)._prefetchPromises = {};

          const dbData = await this.getFromDB(mediaType);

          if (dbData && dbData.length > 0) {
            console.log(`[Perf] DB Hit for type ${mediaType}, count: ${dbData.length}`);
            cache[mediaType] = dbData;
            results = dbData;
          } else if ((window as any)._prefetchPromises[mediaType]) {
            // WAIT FOR EXISTING PREFETCH (Fixes 20s delay)
            console.log(`[Perf] Waiting for background prefetch for type ${mediaType}...`);
            try {
              results = await (window as any)._prefetchPromises[mediaType];
              if (results) {
                cache[mediaType] = results;
                this.saveToDB(mediaType, results);
              }
            } catch (e) {
              console.error('[Perf] Prefetch wait failed', e);
            }
          } else {
            // FALLBACK: Fresh Fetch
            console.log(`[Perf] Cold fetch for type ${mediaType}`);
            const sourcesJson = localStorage.getItem('mock_sources');
            const sources = sourcesJson ? JSON.parse(sourcesJson) : [];
            if (sources.length === 0) return [] as any as T;
            const source = sources[0];

            let baseUrl = source.url;
            if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

            const fetchUrl = `${baseUrl}/player_api.php?username=${source.username}&password=${source.password}&action=${action}`;

            try {
              const taskPromise = this.runWorkerTask({ url: fetchUrl, source, mediaType, baseUrl });
              (window as any)._prefetchPromises[mediaType] = taskPromise; // Store for others

              results = await taskPromise;
              if (results.length > 0) {
                cache[mediaType] = results;
                this.saveToDB(mediaType, results);
              }
            } catch (err) {
              console.error('Worker fetch failed', err);
              return [] as any as T;
            }
          }
        }
        console.timeEnd(`[Perf] DataLoad-${mediaType}`);

        // --- 4. Filtering & Pagination ---
        let filtered = results;
        const query = filters?.query?.toLowerCase();
        if (query) {
          filtered = filtered.filter((c: any) => c.name.toLowerCase().includes(query));
        }

        // --- SORTING IMPLEMENTATION ---
        const sort = filters?.sort ?? 2; // Default Provider (2)
        if (sort !== 2 && filtered.length > 0) {
          console.time('[Perf] Sort');
          // Clone if referencing cache directly to prevent mutation
          if (filtered === results) filtered = results.slice();

          filtered.sort((a: any, b: any) => {
            const nameA = a.name || '';
            const nameB = b.name || '';
            const rateA = a.rating || 0;
            const rateB = b.rating || 0;
            const dateA = a.release_date || '0000';
            const dateB = b.release_date || '0000';

            switch (sort) {
              case 0:
                return nameA.localeCompare(nameB); // Alpha Asc
              case 1:
                return nameB.localeCompare(nameA); // Alpha Desc
              case 3:
                return rateB - rateA; // Rating Desc
              case 4:
                return rateA - rateB; // Rating Asc
              case 5:
                return dateA.localeCompare(dateB); // Date Asc
              case 6:
                return dateB.localeCompare(dateA); // Date Desc
              default:
                return 0;
            }
          });
          console.timeEnd('[Perf] Sort');
        }

        const start = (page - 1) * limit;
        const end = start + limit;
        const paginated = filtered.slice(start, end);

        return paginated as any as T;
      }
      case 'omdb_search_and_cache': {
        const title = (args?.['title'] as string) || '';

        // 1. Try to find the item in our cache to get the ID
        // We know we likely just clicked it, so it should be in the cache
        const cache = (window as any)._mockChannelCache;
        let foundItem = null;
        let foundType = 1; // Default to movie

        if (cache) {
          // Check Movies (1)
          if (cache[1]) {
            foundItem = cache[1].find((c: any) => c.name === title);
            if (foundItem) foundType = 1;
          }
          // Check Series (2) if not found
          if (!foundItem && cache[2]) {
            foundItem = cache[2].find((c: any) => c.name === title);
            if (foundItem) foundType = 2;
          }
        }

        if (foundItem) {
          const sourcesJson = localStorage.getItem('mock_sources');
          const sources = sourcesJson ? JSON.parse(sourcesJson) : [];
          if (sources.length > 0) {
            const source = sources[0];
            const action = foundType === 2 ? 'get_series_info' : 'get_vod_info';
            const idParam = foundType === 2 ? 'series_id' : 'vod_id';

            let baseUrl = source.url;
            if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

            const fetchUrl = `${baseUrl}/player_api.php?username=${source.username}&password=${source.password}&action=${action}&${idParam}=${foundItem.id}`;

            console.log(
              `Fetching detailed info for "${title}" (ID: ${foundItem.id}) from ${fetchUrl}`,
            );

            try {
              const response = await fetch(fetchUrl);
              if (response.ok) {
                const data = await response.json();
                const info = data.info;

                // Map Xtream Info to "OMDB" format expected by UI
                // Validate API title - if too short or just numbers, use original
                let apiTitle = info.name || info.title;
                if (!apiTitle || apiTitle.length < 3 || /^\d+$/.test(apiTitle)) {
                  apiTitle = title; // Use original channel name
                }

                return {
                  title: apiTitle,
                  year: info.releasedate || info.year || foundItem.release_date,
                  rated: 'N/A', // Xtream doesn't send rating usually
                  runtime: info.duration,
                  genres: (info.genre || '').split(',').map((s: string) => s.trim()),
                  director: info.director || '',
                  writers: [], // Usually missing
                  actors: (info.cast || '').split(',').map((s: string) => s.trim()),
                  plot: info.plot || info.description || 'No description available.',
                  poster_url: info.cover || info.movie_image || foundItem.image,
                  imdb_rating: parseFloat(info.rating || foundItem.rating || '0'),
                  imdb_votes: 'N/A',
                  // Use info.youtube_trailer if available? UI might not use it yet
                } as any as T;
              }
            } catch (e) {
              console.error('Failed to fetch real details', e);
            }
          }
        }

        console.warn('Could not find item in cache or fetch failed, returning fallback.');
        return {
          title: title || 'Unknown Title',
          plot: 'Details could not be retrieved from the provider.',
          imdb_rating: 0,
          poster_url: 'assets/images/no-poster.png',
        } as any as T;
      }
      default:
        return null as any as T;
    }
  }
}
