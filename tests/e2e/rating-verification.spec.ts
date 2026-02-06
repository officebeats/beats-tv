import { test, expect } from './base';

test('Rating info is displayed correctly in File and Detail Modal', async ({
  page,
  setMockIpcOverride,
}) => {
  // 1. Mock Data
  const mockSettings = {
    zoom: 1,
    enable_tray_icon: true,
    always_ask_save: false,
    default_view: 0, // ViewMode.All
    refresh_on_start: false,
  };

  const mockSources = [
    {
      id: 1,
      name: 'Test Source',
      enabled: true,
      source_type: 0, // M3U
    },
  ];

  const mockChannel = {
    id: 101,
    name: 'Rated Movie Channel',
    image: 'http://example.com/poster.jpg',
    media_type: 1, // MediaType.movie
    rating: 8.5,
    release_date: '2023-01-01',
    group_title: 'Movies',
  };

  const mockOmdbData = {
    title: 'Rated Movie Channel',
    year: '2023',
    rated: 'PG-13',
    runtime: 120,
    genres: ['Action', 'Adventure'],
    director: 'Test Director',
    writers: ['Writer 1'],
    actors: ['Actor 1'],
    plot: 'A great movie test plot.',
    poster_url: 'http://example.com/poster.jpg',
    imdb_rating: 9.0, // Different from channel rating (8.5) to verify precedence
    imdb_votes: '1,000',
    metascore: 75,
    rotten_tomatoes: '85%',
    awards: 'Oscar Nominee',
    box_office: '$100M',
    imdb_id: 'tt1234567',
  };

  // 2. Override IPC
  await setMockIpcOverride({
    get_settings: mockSettings,
    get_sources: mockSources,
    get_app_version: '2.1.0',
    search: [mockChannel],
    get_playlists: [],
    // Mock the OMDb search which is called when opening details
    omdb_search_and_cache: mockOmdbData,
  });

  // 3. Navigate
  await page.goto('/');

  // 4. Verify Tile Rating (Should match channel.rating)
  const tileRatingBadge = page.locator('.badge-rating');
  await expect(tileRatingBadge).toBeVisible();
  await expect(tileRatingBadge).toContainText('8.5');

  // 5. Open Detail Modal
  await page.locator('.channel-item').first().click();

  // 6. Verify Modal Content and Rating
  // The modal logic fetches OMDb data which has rating 9.0
  const modal = page.locator('app-content-detail-modal');
  await expect(modal).toBeVisible();

  // Wait for the OMDb rating to appear (it's async)
  await expect(modal.locator('.rating-badge.imdb .rating-value')).toContainText('9.0');

  // Verify other OMDb data
  await expect(modal.locator('.plot-summary')).toContainText('A great movie test plot.');
});
