/*
 * Beats TV - Premium IPTV Player
 * TMDB Integration Module (Stubbed)
 *
 * Feature disabled as per user request to remove API key support.
 * Structs retained for compatibility.
 */

use anyhow::Result;
use serde::{Deserialize, Serialize};

// Image size presets (Retained if used elsewhere, though unlikely)
pub const IMG_POSTER_SMALL: &str = "w185";
pub const IMG_POSTER_MEDIUM: &str = "w342";
pub const IMG_POSTER_LARGE: &str = "w500";
pub const IMG_BACKDROP_SMALL: &str = "w780";
pub const IMG_BACKDROP_LARGE: &str = "w1280";
pub const IMG_PROFILE_SMALL: &str = "w185";

/// Full movie details with credits and videos
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TmdbMovieDetails {
    pub id: i64,
    pub title: String,
    pub original_title: Option<String>,
    pub tagline: Option<String>,
    pub overview: Option<String>,
    pub release_date: Option<String>,
    pub runtime: Option<i32>,
    pub vote_average: Option<f32>,
    pub vote_count: Option<i32>,
    pub popularity: Option<f32>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub genres: Option<Vec<Genre>>,
    pub imdb_id: Option<String>,
    pub status: Option<String>,
    pub budget: Option<i64>,
    pub revenue: Option<i64>,
    pub credits: Option<Credits>,
    pub videos: Option<Videos>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Genre {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Credits {
    pub cast: Option<Vec<CastMember>>,
    pub crew: Option<Vec<CrewMember>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CastMember {
    pub id: i64,
    pub name: String,
    pub character: Option<String>,
    pub profile_path: Option<String>,
    pub order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrewMember {
    pub id: i64,
    pub name: String,
    pub job: String,
    pub department: Option<String>,
    pub profile_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Videos {
    pub results: Option<Vec<Video>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Video {
    pub id: String,
    pub key: String,
    pub name: String,
    #[serde(rename = "type")]
    pub video_type: String,
    pub site: String,
    pub official: Option<bool>,
}

/// Cached movie data for local storage (Stubbed)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TmdbCachedMovie {
    pub tmdb_id: i64,
    pub imdb_id: Option<String>,
    pub title: String,
    pub original_title: Option<String>,
    pub tagline: Option<String>,
    pub overview: Option<String>,
    pub release_date: Option<String>,
    pub runtime: Option<i32>,
    pub vote_average: Option<f32>,
    pub vote_count: Option<i32>,
    pub popularity: Option<f32>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub genres: Option<String>,  // JSON string
    pub cast: Option<String>,    // JSON string (top 10)
    pub director: Option<String>,
    pub trailer_key: Option<String>,
    pub trailer_site: Option<String>,
    pub fetched_at: i64,
}

/// Search and get details (Stubbed)
pub async fn search_and_get_details(_title: &str, _year: Option<i32>) -> Result<Option<TmdbMovieDetails>> {
    // Feature disabled
    Ok(None)
}

