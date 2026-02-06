# TMDB Integration Plan for Beats TV

## Complete TMDB API Data Available

### Movie Details (`/movie/{id}`)
| Field | Description | Use Case |
|-------|-------------|----------|
| `title` | Movie title | Display |
| `original_title` | Original language title | International films |
| `overview` | Plot synopsis (up to 1000 chars) | Description panel |
| `release_date` | YYYY-MM-DD format | Sorting, display |
| `runtime` | Minutes | Duration display |
| `vote_average` | 0-10 rating | Star rating |
| `vote_count` | Number of votes | Rating confidence |
| `popularity` | TMDB popularity score | Trending sort |
| `poster_path` | Poster image path | Thumbnail |
| `backdrop_path` | Wide banner image | Hero/detail view |
| `genres` | Array of genre objects | Filtering |
| `tagline` | Marketing tagline | Subtitle |
| `status` | Released/In Production | Availability |
| `budget` | Production budget | Trivia |
| `revenue` | Box office revenue | Trivia |
| `spoken_languages` | Audio languages | Accessibility |
| `production_countries` | Country of origin | Filtering |
| `production_companies` | Studios | Filtering |
| `belongs_to_collection` | Franchise info | Related content |

### Credits (`/movie/{id}/credits`)
| Field | Description | Use Case |
|-------|-------------|----------|
| `cast[]` | Actor list with character names | Cast display |
| `cast[].profile_path` | Actor headshot | Visual cast list |
| `cast[].character` | Role played | Character info |
| `crew[]` | Director, writer, etc. | Credits |

### Reviews (`/movie/{id}/reviews`)
| Field | Description | Use Case |
|-------|-------------|----------|
| `results[].author` | Reviewer name | Attribution |
| `results[].content` | Review text | User reviews |
| `results[].rating` | Reviewer's rating | Review score |
| `results[].created_at` | Review date | Sorting |

### Videos (`/movie/{id}/videos`)
| Field | Description | Use Case |
|-------|-------------|----------|
| `results[].key` | YouTube/Vimeo ID | Trailer playback |
| `results[].type` | Trailer/Teaser/Clip | Filter trailers |
| `results[].site` | YouTube/Vimeo | Embed URL |

### Similar/Recommendations
| Endpoint | Description |
|----------|-------------|
| `/movie/{id}/similar` | Similar movies |
| `/movie/{id}/recommendations` | Personalized recommendations |

### Watch Providers (`/movie/{id}/watch/providers`)
| Field | Description |
|-------|-------------|
| `results.{country}.flatrate` | Streaming services |
| `results.{country}.rent` | Rental options |
| `results.{country}.buy` | Purchase options |

---

## Optimal Performance Architecture

### Strategy: **Predictive Pre-fetching + Local Cache**

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERACTION FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Grid View Loads                                             │
│     └─► Batch fetch metadata for visible tiles (36 items)       │
│         └─► Check SQLite cache first                            │
│             └─► If miss: Queue TMDB request                     │
│                                                                 │
│  2. User Hovers on Tile (200ms debounce)                        │
│     └─► Pre-fetch full details + credits + videos               │
│         └─► Store in memory cache                               │
│                                                                 │
│  3. User Clicks Tile (Detail Modal Opens)                       │
│     └─► INSTANT display from memory cache                       │
│         └─► Background: fetch reviews if not cached             │
│                                                                 │
│  4. User Scrolls Grid                                           │
│     └─► Intersection Observer triggers batch fetch              │
│         └─► Prioritize visible items                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Three-Tier Caching System

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Memory Cache   │ ──► │   SQLite Cache   │ ──► │    TMDB API      │
│   (Instant)      │     │   (Fast)         │     │   (Network)      │
│   ~10ms          │     │   ~5-20ms        │     │   ~100-300ms     │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ - Current view   │     │ - All fetched    │     │ - Fresh data     │
│ - Hovered items  │     │ - 30-day TTL     │     │ - Rate limited   │
│ - Recently used  │     │ - Compressed     │     │ - Requires net   │
│ - Max 100 items  │     │ - Unlimited      │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Database Schema Extension

```sql
-- New table for TMDB metadata cache
CREATE TABLE IF NOT EXISTS tmdb_cache (
    id INTEGER PRIMARY KEY,
    tmdb_id INTEGER UNIQUE,
    imdb_id TEXT,
    title TEXT,
    original_title TEXT,
    overview TEXT,
    tagline TEXT,
    release_date TEXT,
    runtime INTEGER,
    vote_average REAL,
    vote_count INTEGER,
    popularity REAL,
    poster_path TEXT,
    backdrop_path TEXT,
    genres TEXT,  -- JSON array
    cast TEXT,    -- JSON array (top 10)
    director TEXT,
    trailer_key TEXT,
    trailer_site TEXT,
    fetched_at INTEGER,  -- Unix timestamp
    UNIQUE(tmdb_id)
);

CREATE INDEX idx_tmdb_title ON tmdb_cache(title);
CREATE INDEX idx_tmdb_imdb ON tmdb_cache(imdb_id);
CREATE INDEX idx_tmdb_fetched ON tmdb_cache(fetched_at);

-- Link channels to TMDB data
ALTER TABLE channels ADD COLUMN tmdb_id INTEGER;
CREATE INDEX idx_channels_tmdb ON channels(tmdb_id);
```

### Rust Backend Implementation

```rust
// src-tauri/src/tmdb.rs

use serde::{Deserialize, Serialize};
use anyhow::{Result, Context};

const TMDB_API_KEY: &str = "YOUR_API_KEY";
const TMDB_BASE_URL: &str = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE: &str = "https://image.tmdb.org/t/p";

#[derive(Debug, Serialize, Deserialize)]
pub struct TmdbMovie {
    pub id: i64,
    pub title: String,
    pub original_title: Option<String>,
    pub overview: Option<String>,
    pub tagline: Option<String>,
    pub release_date: Option<String>,
    pub runtime: Option<i32>,
    pub vote_average: Option<f32>,
    pub vote_count: Option<i32>,
    pub popularity: Option<f32>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub genres: Option<Vec<Genre>>,
    pub imdb_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Genre {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TmdbCredits {
    pub cast: Vec<CastMember>,
    pub crew: Vec<CrewMember>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CastMember {
    pub id: i64,
    pub name: String,
    pub character: Option<String>,
    pub profile_path: Option<String>,
    pub order: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CrewMember {
    pub id: i64,
    pub name: String,
    pub job: String,
    pub department: String,
}

// Search by title with year hint for accuracy
pub async fn search_movie(title: &str, year: Option<i32>) -> Result<Vec<TmdbMovie>> {
    let client = reqwest::Client::new();
    let mut url = format!(
        "{}/search/movie?api_key={}&query={}&include_adult=false",
        TMDB_BASE_URL, TMDB_API_KEY, urlencoding::encode(title)
    );
    
    if let Some(y) = year {
        url.push_str(&format!("&year={}", y));
    }
    
    let response: SearchResponse = client.get(&url).send().await?.json().await?;
    Ok(response.results)
}

// Get full details with credits and videos in ONE request
pub async fn get_movie_details(tmdb_id: i64) -> Result<TmdbMovieDetails> {
    let client = reqwest::Client::new();
    let url = format!(
        "{}/movie/{}?api_key={}&append_to_response=credits,videos,external_ids",
        TMDB_BASE_URL, tmdb_id, TMDB_API_KEY
    );
    
    let response: TmdbMovieDetails = client.get(&url).send().await?.json().await?;
    Ok(response)
}

// Batch search for multiple titles (parallel requests)
pub async fn batch_search(titles: Vec<String>) -> Vec<Option<TmdbMovie>> {
    use futures::future::join_all;
    
    let futures: Vec<_> = titles.iter()
        .map(|title| search_movie(title, None))
        .collect();
    
    let results = join_all(futures).await;
    
    results.into_iter()
        .map(|r| r.ok().and_then(|v| v.into_iter().next()))
        .collect()
}
```

### Frontend Integration (Angular)

```typescript
// src/app/services/tmdb.service.ts

@Injectable({ providedIn: 'root' })
export class TmdbService {
  private memoryCache = new Map<number, TmdbMovie>();
  private pendingRequests = new Map<string, Promise<TmdbMovie | null>>();
  
  constructor(private tauri: TauriService) {}
  
  // Pre-fetch on hover with deduplication
  async prefetch(title: string): Promise<void> {
    const cacheKey = title.toLowerCase();
    
    if (this.pendingRequests.has(cacheKey)) {
      return; // Already fetching
    }
    
    const promise = this.tauri.call<TmdbMovie | null>('tmdb_search', { title });
    this.pendingRequests.set(cacheKey, promise);
    
    try {
      const result = await promise;
      if (result) {
        this.memoryCache.set(result.id, result);
      }
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  // Instant get from cache
  getFromCache(tmdbId: number): TmdbMovie | undefined {
    return this.memoryCache.get(tmdbId);
  }
  
  // Batch prefetch for visible grid items
  async batchPrefetch(titles: string[]): Promise<void> {
    const uncached = titles.filter(t => !this.memoryCache.has(t.hashCode()));
    if (uncached.length === 0) return;
    
    const results = await this.tauri.call<TmdbMovie[]>('tmdb_batch_search', { 
      titles: uncached 
    });
    
    results.forEach(movie => {
      if (movie) this.memoryCache.set(movie.id, movie);
    });
  }
}
```

### UI Component Enhancement

```typescript
// channel-tile.component.ts - Add hover prefetch

@Component({...})
export class ChannelTileComponent {
  private hoverTimeout: any;
  
  @HostListener('mouseenter')
  onMouseEnter() {
    // Debounce 200ms to avoid excessive requests
    this.hoverTimeout = setTimeout(() => {
      if (this.channel.media_type === MediaType.Movie) {
        this.tmdbService.prefetch(this.channel.name);
      }
    }, 200);
  }
  
  @HostListener('mouseleave')
  onMouseLeave() {
    clearTimeout(this.hoverTimeout);
  }
}
```

---

## Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| First paint (cached) | < 50ms | Memory cache |
| First paint (SQLite) | < 100ms | Local DB query |
| First paint (network) | < 500ms | Parallel requests |
| Hover-to-detail | < 200ms | Pre-fetch on hover |
| Grid scroll | 60fps | Virtual scrolling + batch fetch |
| Memory usage | < 50MB | LRU cache eviction |

---

## Implementation Phases

### Phase 1: Core Integration (2-3 hours)
- [ ] Add TMDB API key configuration in settings
- [ ] Create `tmdb.rs` module with search/details functions
- [ ] Add `tmdb_cache` table to SQLite
- [ ] Implement basic search command

### Phase 2: Caching Layer (1-2 hours)
- [ ] Implement SQLite caching with TTL
- [ ] Add memory cache in Angular service
- [ ] Implement cache invalidation

### Phase 3: UI Integration (2-3 hours)
- [ ] Add hover prefetch to channel tiles
- [ ] Enhance content-detail-modal with TMDB data
- [ ] Add trailer playback button
- [ ] Display cast with photos

### Phase 4: Optimization (1-2 hours)
- [ ] Implement batch search for grid view
- [ ] Add Intersection Observer for scroll-based loading
- [ ] Implement LRU cache eviction
- [ ] Add offline fallback

---

## API Key Setup

1. Create free account at https://www.themoviedb.org/signup
2. Go to Settings → API → Create → Developer
3. Copy API Key (v3 auth)
4. Add to app settings or environment variable

**Rate Limits**: ~40 requests/10 seconds (very generous for this use case)
