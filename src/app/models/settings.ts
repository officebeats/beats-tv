export class Settings {
  recording_path?: string;
  use_stream_caching?: boolean;
  mpv_params?: string;
  default_view?: number;
  volume?: number;
  refresh_on_start?: boolean;
  restream_port?: number;
  enable_tray_icon?: boolean;
  zoom?: number;
  default_sort?: number;
  enable_hwdec?: boolean;
  always_ask_save?: boolean;
  enable_gpu?: boolean;
  use_single_column?: boolean;
  max_text_lines?: number;
  compact_mode?: boolean;
  refresh_interval?: number;
  last_refresh?: number;
  enhanced_video?: boolean;
  theme?: number; // 0=Smooth Glass, 1=Matrix Terminal (Deprecated, locked to 0)
  vpn_mode?: boolean; // VPN mode for unstable connections

  /**
   * Validates settings values
   */
  static validate(settings: Partial<Settings>): string[] {
    const errors: string[] = [];

    if (settings.zoom !== undefined && (settings.zoom < 0.5 || settings.zoom > 3)) {
      errors.push('Zoom must be between 0.5 and 3');
    }

    if (settings.volume !== undefined && (settings.volume < 0 || settings.volume > 100)) {
      errors.push('Volume must be between 0 and 100');
    }

    if (
      settings.restream_port !== undefined &&
      (settings.restream_port < 1024 || settings.restream_port > 65535)
    ) {
      errors.push('Restream port must be between 1024 and 65535');
    }

    if (settings.refresh_interval !== undefined && settings.refresh_interval < 0) {
      errors.push('Refresh interval must be non-negative');
    }

    if (settings.max_text_lines !== undefined && settings.max_text_lines < 1) {
      errors.push('Max text lines must be at least 1');
    }

    return errors;
  }

  /**
   * Sanitizes MPV params to prevent command injection
   */
  static sanitizeMpvParams(params?: string): string | undefined {
    if (!params) return undefined;

    // Remove any potentially dangerous characters
    return params
      .trim()
      .replace(/[;&|`$]/g, '') // Remove shell metacharacters
      .substring(0, 1000); // Limit length
  }

  /**
   * Creates default settings
   */
  static createDefault(): Settings {
    return {
      use_stream_caching: true,
      enable_hwdec: true,
      enable_tray_icon: true,
      zoom: 1,
      volume: 100,
      default_view: 0,
      default_sort: 0,
      theme: 0,
      vpn_mode: false,
    };
  }
}
