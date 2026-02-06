import { Filters } from './filters';
import { ViewMode } from './viewMode';
import { MediaType } from './mediaType';

describe('Filters Model', () => {
  // ─── Validation ────────────────────────────────────────────────────────

  describe('validate', () => {
    it('should validate a complete filters object', () => {
      const filters: Filters = {
        source_ids: [1, 2],
        media_types: [MediaType.livestream],
        view_type: ViewMode.All,
        page: 1,
        use_keywords: false,
      };

      expect(Filters.validate(filters)).toBeTrue();
    });

    it('should reject filters without source_ids', () => {
      expect(
        Filters.validate({
          media_types: [MediaType.livestream],
          view_type: ViewMode.All,
          page: 1,
          use_keywords: false,
        }),
      ).toBeFalse();
    });

    it('should reject filters without media_types', () => {
      expect(
        Filters.validate({
          source_ids: [1],
          view_type: ViewMode.All,
          page: 1,
          use_keywords: false,
        }),
      ).toBeFalse();
    });

    it('should reject filters without view_type', () => {
      expect(
        Filters.validate({
          source_ids: [1],
          media_types: [MediaType.livestream],
          page: 1,
          use_keywords: false,
        }),
      ).toBeFalse();
    });

    it('should reject filters without page', () => {
      expect(
        Filters.validate({
          source_ids: [1],
          media_types: [MediaType.livestream],
          view_type: ViewMode.All,
          use_keywords: false,
        }),
      ).toBeFalse();
    });

    it('should accept view_type of 0 (ViewMode.All)', () => {
      const filters: Filters = {
        source_ids: [1],
        media_types: [MediaType.livestream],
        view_type: ViewMode.All, // 0
        page: 1,
        use_keywords: false,
      };

      expect(Filters.validate(filters)).toBeTrue();
    });
  });

  // ─── Query Sanitization ────────────────────────────────────────────────

  describe('sanitizeQuery', () => {
    it('should return undefined for empty query', () => {
      expect(Filters.sanitizeQuery('')).toBeUndefined();
    });

    it('should return undefined for undefined query', () => {
      expect(Filters.sanitizeQuery(undefined)).toBeUndefined();
    });

    it('should trim whitespace', () => {
      expect(Filters.sanitizeQuery('  test  ')).toBe('test');
    });

    it('should remove angle brackets', () => {
      expect(Filters.sanitizeQuery('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    });

    it('should truncate to 100 characters', () => {
      const longQuery = 'A'.repeat(150);
      expect(Filters.sanitizeQuery(longQuery)!.length).toBe(100);
    });

    it('should preserve normal search terms', () => {
      expect(Filters.sanitizeQuery('CNN News')).toBe('CNN News');
    });
  });

  // ─── Default Creation ──────────────────────────────────────────────────

  describe('createDefault', () => {
    it('should create filters with safe defaults', () => {
      const defaults = Filters.createDefault();

      expect(defaults.source_ids).toEqual([]);
      expect(defaults.media_types).toEqual([]);
      expect(defaults.view_type).toBe(ViewMode.All);
      expect(defaults.page).toBe(1);
      expect(defaults.use_keywords).toBeFalse();
      expect(defaults.show_hidden).toBeFalse();
    });

    it('should create a valid filters object', () => {
      const defaults = Filters.createDefault();
      expect(Filters.validate(defaults)).toBeTrue();
    });
  });
});
