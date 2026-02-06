/*
 * Beats TV - Premium IPTV Player
 * OMDb Integration Module
 * 
 * Provides movie metadata from the Open Movie Database (OMDb) API
 * with local caching for instant display.
 * 
 * OMDb is free and provides:
 * - Movie descriptions (plot)
 * - Ratings (IMDb, Rotten Tomatoes, Metacritic)
 * - Cast, Director, Genre
 * - Poster images
 * - Release year, runtime
 */

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::sql;

// OMDb API Configuration
const OMDB_BASE_URL: &str = "https://www.omdbapi.com";
const CACHE_TTL_DAYS: i64 = 30;

// Default API key (free tier - 1,000 requests/day)
// Users can override this in settings for higher limits
const DEFAULT_API_KEY: &str = "b9bd48a6";

/// OMDb Movie response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OmdbMovieResponse {
    #[serde(rename = "Title")]
    pub title: Option<String>,
    #[serde(rename = "Year")]
    pub year: Option<String>,
    #[serde(rename = "Rated")]
    pub rated: Option<String>,
    #[serde(rename = "Released")]
    pub released: Option<String>,
    #[serde(rename = "Runtime")]
    pub runtime: Option<String>,
    #[serde(rename = "Genre")]
    pub genre: Option<String>,
    #[serde(rename = "Director")]
    pub director: Option<String>,
    #[serde(rename = "Writer")]
    pub writer: Option<String>,
    #[serde(rename = "Actors")]
    pub actors: Option<String>,
    #[serde(rename = "Plot")]
    pub plot: Option<String>,
    #[serde(rename = "Language")]
    pub language: Option<String>,
    #[serde(rename = "Country")]
    pub country: Option<String>,
    #[serde(rename = "Awards")]
    pub awards: Option<String>,
    #[serde(rename = "Poster")]
    pub poster: Option<String>,
    #[serde(rename = "Ratings")]
    pub ratings: Option<Vec<OmdbRating>>,
    #[serde(rename = "Metascore")]
    pub metascore: Option<String>,
    #[serde(rename = "imdbRating")]
    pub imdb_rating: Option<String>,
    #[serde(rename = "imdbVotes")]
    pub imdb_votes: Option<String>,
    #[serde(rename = "imdbID")]
    pub imdb_id: Option<String>,
    #[serde(rename = "Type")]
    pub media_type: Option<String>,
    #[serde(rename = "DVD")]
    pub dvd: Option<String>,
    #[serde(rename = "BoxOffice")]
    pub box_office: Option<String>,
    #[serde(rename = "Production")]
    pub production: Option<String>,
    #[serde(rename = "Website")]
    pub website: Option<String>,
    #[serde(rename = "Response")]
    pub response: Option<String>,
    #[serde(rename = "Error")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OmdbRating {
    #[serde(rename = "Source")]
    pub source: String,
    #[serde(rename = "Value")]
    pub value: String,
}

/// Cached movie data for local storage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OmdbCachedMovie {
    pub imdb_id: Option<String>,
    pub title: String,
    pub year: Option<String>,
    pub rated: Option<String>,
    pub runtime: Option<String>,
    pub genre: Option<String>,
    pub director: Option<String>,
    pub writer: Option<String>,
    pub actors: Option<String>,
    pub plot: Option<String>,
    pub poster: Option<String>,
    pub imdb_rating: Option<String>,
    pub imdb_votes: Option<String>,
    pub metascore: Option<String>,
    pub rotten_tomatoes: Option<String>,
    pub awards: Option<String>,
    pub box_office: Option<String>,
    pub fetched_at: i64,
}

/// Movie data formatted for the UI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovieData {
    pub title: String,
    pub year: Option<String>,
    pub rated: Option<String>,
    pub runtime: Option<i32>,
    pub genres: Vec<String>,
    pub director: Option<String>,
    pub writers: Vec<String>,
    pub actors: Vec<String>,
    pub plot: Option<String>,
    pub poster_url: Option<String>,
    pub imdb_rating: Option<f32>,
    pub imdb_votes: Option<String>,
    pub metascore: Option<i32>,
    pub rotten_tomatoes: Option<String>,
    pub awards: Option<String>,
    pub box_office: Option<String>,
    pub imdb_id: Option<String>,
}

/// Get OMDb API key - uses default free tier key
/// The default key has 1,000 requests/day which is sufficient for most users
fn get_api_key() -> String {
    // OMDb free tier key - no user configuration needed
    DEFAULT_API_KEY.to_string()
}

/// Search for a movie by title and optionally year
pub async fn search_movie(title: &str, year: Option<i32>) -> Result<Option<OmdbMovieResponse>> {
    let api_key = get_api_key();
    let client = reqwest::Client::new();
    
    let mut url = format!(
        "{}/?apikey={}&t={}&type=movie&plot=full",
        OMDB_BASE_URL,
        api_key,
        urlencoding::encode(title)
    );
    
    if let Some(y) = year {
        url.push_str(&format!("&y={}", y));
    }
    
    let response: OmdbMovieResponse = client
        .get(&url)
        .send()
        .await
        .context("Failed to connect to OMDb API")?
        .json()
        .await
        .context("Failed to parse OMDb response")?;
    
    // Check if the response was successful
    if response.response.as_deref() == Some("False") {
        return Ok(None);
    }
    
    Ok(Some(response))
}

/// Search and cache movie data
pub async fn search_and_cache(title: &str, year: Option<i32>) -> Result<Option<MovieData>> {
    // First check cache
    if let Ok(Some(cached)) = sql::get_omdb_cache_by_title(title) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        
        // Check if cache is still valid (30 days)
        if now - cached.fetched_at < CACHE_TTL_DAYS * 24 * 60 * 60 {
            return Ok(Some(cached_to_movie_data(cached)));
        }
    }
    
    // Search OMDb
    let response = search_movie(title, year).await?;
    
    if let Some(movie) = response {
        // Cache the result
        let cached = response_to_cached(&movie);
        let _ = sql::upsert_omdb_cache(cached.clone());
        
        return Ok(Some(cached_to_movie_data(cached)));
    }
    
    Ok(None)
}

/// Convert OMDb response to cached format
fn response_to_cached(response: &OmdbMovieResponse) -> OmdbCachedMovie {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    
    // Extract Rotten Tomatoes rating from ratings array
    let rotten_tomatoes = response.ratings.as_ref()
        .and_then(|ratings| {
            ratings.iter()
                .find(|r| r.source == "Rotten Tomatoes")
                .map(|r| r.value.clone())
        });
    
    OmdbCachedMovie {
        imdb_id: response.imdb_id.clone(),
        title: response.title.clone().unwrap_or_default(),
        year: response.year.clone(),
        rated: response.rated.clone(),
        runtime: response.runtime.clone(),
        genre: response.genre.clone(),
        director: response.director.clone(),
        writer: response.writer.clone(),
        actors: response.actors.clone(),
        plot: response.plot.clone(),
        poster: response.poster.clone(),
        imdb_rating: response.imdb_rating.clone(),
        imdb_votes: response.imdb_votes.clone(),
        metascore: response.metascore.clone(),
        rotten_tomatoes,
        awards: response.awards.clone(),
        box_office: response.box_office.clone(),
        fetched_at: now,
    }
}

/// Convert cached data to MovieData for UI
fn cached_to_movie_data(cached: OmdbCachedMovie) -> MovieData {
    // Parse runtime (e.g., "142 min" -> 142)
    let runtime = cached.runtime.as_ref()
        .and_then(|r| r.split_whitespace().next())
        .and_then(|r| r.parse::<i32>().ok());
    
    // Parse genres (comma-separated)
    let genres: Vec<String> = cached.genre
        .as_ref()
        .map(|g| g.split(", ").map(|s| s.to_string()).collect())
        .unwrap_or_default();
    
    // Parse writers (comma-separated)
    let writers: Vec<String> = cached.writer
        .as_ref()
        .map(|w| w.split(", ").map(|s| s.to_string()).collect())
        .unwrap_or_default();
    
    // Parse actors (comma-separated)
    let actors: Vec<String> = cached.actors
        .as_ref()
        .map(|a| a.split(", ").map(|s| s.to_string()).collect())
        .unwrap_or_default();
    
    // Parse IMDb rating (e.g., "8.5" -> 8.5)
    let imdb_rating = cached.imdb_rating.as_ref()
        .and_then(|r| r.parse::<f32>().ok());
    
    // Parse metascore (e.g., "74" -> 74)
    let metascore = cached.metascore.as_ref()
        .and_then(|m| m.parse::<i32>().ok());
    
    // Clean up poster URL (OMDb returns "N/A" for missing posters)
    let poster_url = cached.poster.filter(|p| p != "N/A" && !p.is_empty());
    
    MovieData {
        title: cached.title,
        year: cached.year,
        rated: cached.rated.filter(|r| r != "N/A"),
        runtime,
        genres,
        director: cached.director.filter(|d| d != "N/A"),
        writers,
        actors,
        plot: cached.plot.filter(|p| p != "N/A"),
        poster_url,
        imdb_rating,
        imdb_votes: cached.imdb_votes.filter(|v| v != "N/A"),
        metascore,
        rotten_tomatoes: cached.rotten_tomatoes,
        awards: cached.awards.filter(|a| a != "N/A"),
        box_office: cached.box_office.filter(|b| b != "N/A"),
        imdb_id: cached.imdb_id,
    }
}

/// Clean movie title for better search results
pub fn clean_title(title: &str) -> String {
    // Remove common IPTV prefixes/suffixes
    let cleaned = title
        .trim()
        // Remove quality indicators
        .replace(" HD", "")
        .replace(" SD", "")
        .replace(" 4K", "")
        .replace(" UHD", "")
        .replace(" FHD", "")
        // Remove year in parentheses at end (we'll extract it separately)
        .trim()
        .to_string();
    
    // Remove country prefixes like "US| " or "[UK] "
    let re = regex::Regex::new(r"^[\[\(]?[A-Z]{2,3}[\]\)]?[:\|\-\s]+").unwrap();
    re.replace(&cleaned, "").trim().to_string()
}

/// Extract year from title if present
pub fn extract_year(title: &str) -> Option<i32> {
    let re = regex::Regex::new(r"\((\d{4})\)").unwrap();
    re.captures(title)
        .and_then(|caps| caps.get(1))
        .and_then(|m| m.as_str().parse().ok())
}
