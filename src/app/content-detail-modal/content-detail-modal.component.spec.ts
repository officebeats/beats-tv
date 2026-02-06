import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContentDetailModalComponent } from './content-detail-modal.component';
import { Channel } from '../models/channel';
import { MediaType } from '../models/mediaType';
import { MovieData } from '../services/movie-metadata.service';

describe('ContentDetailModalComponent', () => {
  let component: ContentDetailModalComponent;
  let fixture: ComponentFixture<ContentDetailModalComponent>;

  const mockChannel: Channel = {
    id: 1,
    name: 'Test Movie',
    media_type: MediaType.movie,
    image: 'http://example.com/poster.jpg',
    rating: 7.5,
    release_date: '2024-01-15',
    genre: 'Action',
    plot: 'A test movie plot.',
    cast: 'Actor 1, Actor 2',
    director: 'Director Name',
  } as Channel;

  const mockMovieData: MovieData = {
    title: 'Test Movie',
    year: '2024',
    rated: 'PG-13',
    runtime: 120,
    genres: ['Action', 'Thriller'],
    director: 'Director Name',
    writers: ['Writer 1', 'Writer 2'],
    actors: [{ name: 'Actor 1' }, { name: 'Actor 2' }],
    plot: 'An enhanced plot from OMDb.',
    posterUrl: 'http://example.com/omdb-poster.jpg',
    imdbRating: 8.2,
    imdbVotes: '1,234,567',
    metascore: 75,
    rottenTomatoes: '92%',
    awards: 'Won 2 Oscars',
    boxOffice: '$500,000,000',
    imdbId: 'tt1234567',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentDetailModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentDetailModalComponent);
    component = fixture.componentInstance;
  });

  // ─── Component Creation ──────────────────────────────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // ─── Display Logic ───────────────────────────────────────────────────

  describe('Display Logic', () => {
    it('should display channel name when no movie data', () => {
      component.channel = mockChannel;
      component.isOpen = true;
      fixture.detectChanges();

      const titleEl = fixture.nativeElement.querySelector('.title');
      expect(titleEl.textContent).toContain('Test Movie');
    });

    it('should display movie data when available', () => {
      component.channel = mockChannel;
      component.movieData = mockMovieData;
      component.isOpen = true;
      fixture.detectChanges();

      const genrePills = fixture.nativeElement.querySelectorAll('.genre-pill');
      expect(genrePills.length).toBe(2);
      expect(genrePills[0].textContent.trim()).toBe('Action');
      expect(genrePills[1].textContent.trim()).toBe('Thriller');
    });

    it('should show loading state when fetching metadata', () => {
      component.channel = mockChannel;
      component.isLoadingMetadata = true;
      component.isOpen = true;
      fixture.detectChanges();

      const loadingEl = fixture.nativeElement.querySelector('.metadata-loading');
      expect(loadingEl).toBeTruthy();
    });

    it('should show IMDb button when imdbId is available', () => {
      component.channel = mockChannel;
      component.movieData = mockMovieData;
      component.isOpen = true;
      fixture.detectChanges();

      const imdbBtn = fixture.nativeElement.querySelector('.btn-imdb');
      expect(imdbBtn).toBeTruthy();
    });

    it('should hide IMDb button when no imdbId', () => {
      component.channel = mockChannel;
      component.movieData = { ...mockMovieData, imdbId: undefined };
      component.isOpen = true;
      fixture.detectChanges();

      const imdbBtn = fixture.nativeElement.querySelector('.btn-imdb');
      expect(imdbBtn).toBeFalsy();
    });

    it('should show fallback channel rating when no IMDb rating', () => {
      component.channel = mockChannel;
      component.movieData = { ...mockMovieData, imdbRating: undefined };
      component.isOpen = true;
      fixture.detectChanges();

      const ratingBadge = fixture.nativeElement.querySelector('.rating-badge');
      expect(ratingBadge).toBeTruthy();
    });

    it('should show channel genre when no movie genres', () => {
      component.channel = mockChannel;
      component.movieData = { ...mockMovieData, genres: [] };
      component.isOpen = true;
      fixture.detectChanges();

      const genrePills = fixture.nativeElement.querySelectorAll('.genre-pill');
      expect(genrePills.length).toBe(1);
      expect(genrePills[0].textContent.trim()).toBe('Action');
    });
  });

  // ─── Formatting ──────────────────────────────────────────────────────

  describe('Formatting', () => {
    it('should format vote count in millions', () => {
      expect(component.formatVoteCount('1,234,567')).toBe('1.2M');
    });

    it('should format vote count in thousands', () => {
      expect(component.formatVoteCount('45,678')).toBe('45.7K');
    });

    it('should return empty string for N/A votes', () => {
      expect(component.formatVoteCount('N/A')).toBe('');
    });

    it('should return empty string for empty votes', () => {
      expect(component.formatVoteCount('')).toBe('');
    });

    it('should format runtime with hours and minutes', () => {
      expect(component.formatRuntime(136)).toBe('2h 16m');
    });

    it('should format runtime with only minutes', () => {
      expect(component.formatRuntime(45)).toBe('45m');
    });

    it('should return empty string for N/A runtime', () => {
      expect(component.formatRuntime('N/A')).toBe('');
    });

    it('should return empty string for zero runtime', () => {
      expect(component.formatRuntime(0)).toBe('');
    });

    it('should handle string runtime values', () => {
      expect(component.formatRuntime('120')).toBe('2h 0m');
    });
  });

  // ─── Events ──────────────────────────────────────────────────────────

  describe('Events', () => {
    it('should emit close event when backdrop clicked', () => {
      component.channel = mockChannel;
      component.isOpen = true;
      fixture.detectChanges();

      spyOn(component.close, 'emit');
      const backdrop = fixture.nativeElement.querySelector('.modal-backdrop');
      backdrop.click();

      expect(component.close.emit).toHaveBeenCalled();
    });

    it('should emit close event when close button clicked', () => {
      component.channel = mockChannel;
      component.isOpen = true;
      fixture.detectChanges();

      spyOn(component.close, 'emit');
      const closeBtn = fixture.nativeElement.querySelector('.btn-close');
      closeBtn.click();

      expect(component.close.emit).toHaveBeenCalled();
    });

    it('should emit play event when play button clicked', () => {
      component.channel = mockChannel;
      component.isOpen = true;
      fixture.detectChanges();

      spyOn(component.play, 'emit');
      const playBtn = fixture.nativeElement.querySelector('.btn-play');
      playBtn.click();

      expect(component.play.emit).toHaveBeenCalled();
    });

    it('should emit openImdb event', () => {
      spyOn(component.openImdb, 'emit');

      component.onOpenImdb();

      expect(component.openImdb.emit).toHaveBeenCalled();
    });
  });
});
