import { MediaType } from './mediaType';

export class Channel {
  id?: number;
  name?: string;
  group_id?: number;
  image?: string;
  url?: string;
  media_type?: MediaType;
  source_id?: number;
  favorite?: boolean;
  stream_id?: number;
  tv_archive?: boolean;
  hidden?: boolean;
  // Metadata fields
  rating?: number;
  genre?: string;
  release_date?: string;
  plot?: string;
  cast?: string;
  director?: string;
  added?: string;

  /**
   * Validates that the channel has required fields for playback
   */
  static isValidForPlayback(channel: Partial<Channel>): boolean {
    return !!(
      channel.url &&
      typeof channel.url === 'string' &&
      channel.url.length > 0 &&
      channel.name &&
      typeof channel.name === 'string'
    );
  }

  /**
   * Sanitizes channel name for display
   */
  static sanitizeName(name?: string): string {
    if (!name) return 'Unknown Channel';
    return name
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .substring(0, 100); // Limit length
  }

  /**
   * Validates URL format for security
   */
  static isValidUrl(url?: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
