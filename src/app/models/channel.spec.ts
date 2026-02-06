import { Channel } from './channel';

describe('Channel Model', () => {
  // ─── Validation ────────────────────────────────────────────────────────

  describe('isValidForPlayback', () => {
    it('should return true for valid channel', () => {
      expect(
        Channel.isValidForPlayback({
          url: 'http://example.com/stream',
          name: 'Test Channel',
        }),
      ).toBeTrue();
    });

    it('should return false for missing URL', () => {
      expect(Channel.isValidForPlayback({ name: 'Test' })).toBeFalse();
    });

    it('should return false for empty URL', () => {
      expect(Channel.isValidForPlayback({ url: '', name: 'Test' })).toBeFalse();
    });

    it('should return false for missing name', () => {
      expect(Channel.isValidForPlayback({ url: 'http://example.com' })).toBeFalse();
    });

    it('should return false for empty object', () => {
      expect(Channel.isValidForPlayback({})).toBeFalse();
    });
  });

  // ─── URL Validation ────────────────────────────────────────────────────

  describe('isValidUrl', () => {
    it('should accept http URLs', () => {
      expect(Channel.isValidUrl('http://example.com/stream')).toBeTrue();
    });

    it('should accept https URLs', () => {
      expect(Channel.isValidUrl('https://example.com/stream')).toBeTrue();
    });

    it('should reject ftp URLs', () => {
      expect(Channel.isValidUrl('ftp://example.com/file')).toBeFalse();
    });

    it('should reject javascript URLs', () => {
      expect(Channel.isValidUrl('javascript:alert(1)')).toBeFalse();
    });

    it('should reject empty string', () => {
      expect(Channel.isValidUrl('')).toBeFalse();
    });

    it('should reject undefined', () => {
      expect(Channel.isValidUrl(undefined)).toBeFalse();
    });

    it('should reject malformed URLs', () => {
      expect(Channel.isValidUrl('not-a-url')).toBeFalse();
    });
  });

  // ─── Name Sanitization ────────────────────────────────────────────────

  describe('sanitizeName', () => {
    it('should return name as-is for normal names', () => {
      expect(Channel.sanitizeName('Test Channel')).toBe('Test Channel');
    });

    it('should trim whitespace', () => {
      expect(Channel.sanitizeName('  Test Channel  ')).toBe('Test Channel');
    });

    it('should remove angle brackets (XSS prevention)', () => {
      expect(Channel.sanitizeName('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    });

    it('should truncate long names to 100 characters', () => {
      const longName = 'A'.repeat(150);
      expect(Channel.sanitizeName(longName).length).toBe(100);
    });

    it('should return "Unknown Channel" for undefined', () => {
      expect(Channel.sanitizeName(undefined)).toBe('Unknown Channel');
    });

    it('should return "Unknown Channel" for empty string', () => {
      expect(Channel.sanitizeName('')).toBe('Unknown Channel');
    });
  });
});
