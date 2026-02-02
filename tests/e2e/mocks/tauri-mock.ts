/**
 * Tauri Mock for Playwright E2E Tests
 * Bridges the gap between the Angular frontend and the missing Rust backend.
 */

export const TAURI_MOCK_SCRIPT = `
  window.__TAURI_INTERNALS__ = {
    invoke: async (command, args) => {
      console.log('Mock Tauri Invoke:', command, args);
      
      // Default Mock Data
      const mockData = {
        'is_container': false,
        'get_settings': {
          use_stream_caching: true,
          default_view: 0,
          volume: 100,
          restream_port: 3000,
          enable_tray_icon: true,
          zoom: 100,
          default_sort: 0,
          enable_hwdec: true,
          always_ask_save: false,
          enable_gpu: false,
          mpv_params: ''
        },
        'get_sources': [],
        'get_epg_ids': [],
        'check_dependencies': {
          mpv: { installed: true, version: '0.37.0' },
          ffmpeg: { installed: true, version: '6.1.0' }
        },
        'source_name_exists': false,
        'get_mpv_preset': '--no-video'
      };

      if (window.MOCK_IPC_OVERRIDE && window.MOCK_IPC_OVERRIDE[command]) {
        return window.MOCK_IPC_OVERRIDE[command](args);
      }

      if (command in mockData) {
        return mockData[command];
      }

      return null;
    },
    metadata: { tauri: '2.0.0' }
  };

  window.__TAURI__ = {
    event: {
      listen: async (event, handler) => {
        console.log('Mock Tauri Listen:', event);
        if (!window.__TAURI_HANDLERS__) window.__TAURI_HANDLERS__ = {};
        if (!window.__TAURI_HANDLERS__[event]) window.__TAURI_HANDLERS__[event] = [];
        window.__TAURI_HANDLERS__[event].push(handler);
        return () => {
          window.__TAURI_HANDLERS__[event] = window.__TAURI_HANDLERS__[event].filter(h => h !== handler);
        };
      },
      emit: async (event, payload) => {
        console.log('Mock Tauri Emit:', event, payload);
        if (window.__TAURI_HANDLERS__ && window.__TAURI_HANDLERS__[event]) {
          window.__TAURI_HANDLERS__[event].forEach(h => h({ payload }));
        }
      }
    }
  };
`;
