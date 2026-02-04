import { MediaType } from './mediaType';
import { SortType } from './sortType';
import { ViewMode } from './viewMode';

export class Filters {
  public query?: string;
  public source_ids!: number[];
  public media_types!: MediaType[];
  public view_type!: ViewMode;
  public page!: number;
  public group_id?: number;
  public series_id?: number;
  public use_keywords!: boolean;
  public sort?: SortType;
  public season?: number;
  public rating_min?: number;
  public genre?: string;
  public show_hidden?: boolean;

  /**
   * Validates that the filter object has all required fields
   */
  static validate(filters: Partial<Filters>): filters is Filters {
    return !!(
      filters.source_ids &&
      Array.isArray(filters.source_ids) &&
      filters.media_types &&
      Array.isArray(filters.media_types) &&
      filters.view_type !== undefined &&
      filters.page !== undefined &&
      filters.use_keywords !== undefined
    );
  }

  /**
   * Sanitizes the query string to prevent injection attacks
   */
  static sanitizeQuery(query?: string): string | undefined {
    if (!query) return undefined;
    // Remove any potentially dangerous characters
    return query
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .substring(0, 100); // Limit length
  }

  /**
   * Creates a default Filters object with safe defaults
   */
  static createDefault(): Filters {
    return {
      source_ids: [],
      media_types: [],
      view_type: ViewMode.All,
      page: 1,
      use_keywords: false,
      show_hidden: false,
    };
  }
}
