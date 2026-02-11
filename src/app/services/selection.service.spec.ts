import { TestBed } from '@angular/core/testing';
import { SelectionService } from './selection.service';
import { Channel } from '../models/channel';
import { MediaType } from '../models/mediaType';
import { PlaylistService } from './playlist.service';
import { PlaylistManagerService } from './playlist-manager.service';
import { ToastrService } from 'ngx-toastr';

describe('SelectionService', () => {
  let service: SelectionService;
  let mockChannels: Channel[];

  beforeEach(() => {
    const mockPlaylistManager = jasmine.createSpyObj('PlaylistManagerService', ['bulkUpdate']);
    const mockPlaylist = jasmine.createSpyObj('PlaylistService', ['bulkUpdate']);
    const mockToast = jasmine.createSpyObj('ToastrService', ['success', 'error', 'info']);

    TestBed.configureTestingModule({
      providers: [
        { provide: PlaylistManagerService, useValue: mockPlaylistManager },
        { provide: PlaylistService, useValue: mockPlaylist },
        { provide: ToastrService, useValue: mockToast },
      ],
    });
    service = TestBed.inject(SelectionService);

    // Create mock channels
    mockChannels = [
      { id: 1, name: 'Channel 1', media_type: MediaType.livestream } as Channel,
      { id: 2, name: 'Channel 2', media_type: MediaType.movie } as Channel,
      { id: 3, name: 'Channel 3', media_type: MediaType.serie } as Channel,
      { id: 4, name: 'Channel 4', media_type: MediaType.livestream } as Channel,
      { id: 5, name: 'Channel 5', media_type: MediaType.movie } as Channel,
    ];
  });

  afterEach(() => {
    service.reset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── Selection Mode ──────────────────────────────────────────────────────

  describe('Selection Mode', () => {
    it('should initialize with selection mode disabled', () => {
      expect(service.selectionMode).toBe(false);
    });

    it('should toggle selection mode on', () => {
      service.toggleSelectionMode();
      expect(service.selectionMode).toBe(true);
    });

    it('should toggle selection mode off and clear selections', () => {
      service.selectChannel(1);
      service.enableSelectionMode();
      
      service.toggleSelectionMode();
      
      expect(service.selectionMode).toBe(false);
      expect(service.selectedCount).toBe(0);
    });

    it('should enable selection mode', () => {
      service.enableSelectionMode();
      expect(service.selectionMode).toBe(true);
    });

    it('should disable selection mode and clear selections', () => {
      service.selectChannel(1);
      service.selectChannel(2);
      
      service.disableSelectionMode();
      
      expect(service.selectionMode).toBe(false);
      expect(service.selectedCount).toBe(0);
    });

    it('should emit selection mode changes via observable', (done) => {
      service.selectionMode$.subscribe((mode) => {
        if (mode === true) {
          expect(mode).toBe(true);
          done();
        }
      });
      service.enableSelectionMode();
    });
  });

  // ─── Channel Selection ───────────────────────────────────────────────────

  describe('Channel Selection', () => {
    it('should initialize with no selected channels', () => {
      expect(service.selectedCount).toBe(0);
      expect(service.hasSelection()).toBe(false);
    });

    it('should select a channel', () => {
      service.selectChannel(1);
      
      expect(service.isChannelSelected(1)).toBe(true);
      expect(service.selectedCount).toBe(1);
    });

    it('should deselect a channel', () => {
      service.selectChannel(1);
      service.deselectChannel(1);
      
      expect(service.isChannelSelected(1)).toBe(false);
      expect(service.selectedCount).toBe(0);
    });

    it('should toggle channel selection on', () => {
      service.toggleChannelSelection(1);
      
      expect(service.isChannelSelected(1)).toBe(true);
    });

    it('should toggle channel selection off', () => {
      service.selectChannel(1);
      service.toggleChannelSelection(1);
      
      expect(service.isChannelSelected(1)).toBe(false);
    });

    it('should select multiple channels', () => {
      service.selectMultiple([1, 2, 3]);
      
      expect(service.selectedCount).toBe(3);
      expect(service.isChannelSelected(1)).toBe(true);
      expect(service.isChannelSelected(2)).toBe(true);
      expect(service.isChannelSelected(3)).toBe(true);
    });

    it('should deselect multiple channels', () => {
      service.selectMultiple([1, 2, 3, 4]);
      service.deselectMultiple([2, 4]);
      
      expect(service.selectedCount).toBe(2);
      expect(service.isChannelSelected(1)).toBe(true);
      expect(service.isChannelSelected(2)).toBe(false);
      expect(service.isChannelSelected(3)).toBe(true);
      expect(service.isChannelSelected(4)).toBe(false);
    });

    it('should clear all selections', () => {
      service.selectMultiple([1, 2, 3]);
      service.clearSelection();
      
      expect(service.selectedCount).toBe(0);
      expect(service.hasSelection()).toBe(false);
    });

    it('should select all channels', () => {
      service.selectAll(mockChannels);
      
      expect(service.selectedCount).toBe(5);
      mockChannels.forEach(channel => {
        expect(service.isChannelSelected(channel.id!)).toBe(true);
      });
    });

    it('should get selected channel IDs', () => {
      service.selectMultiple([1, 3, 5]);
      const ids = service.getSelectedIds();
      
      expect(ids).toEqual([1, 3, 5]);
    });

    it('should emit selection changes via observable', (done) => {
      let emissionCount = 0;
      service.selectedChannels$.subscribe((selected) => {
        emissionCount++;
        if (emissionCount === 2) { // Skip initial emission
          expect(selected.size).toBe(1);
          expect(selected.has(1)).toBe(true);
          done();
        }
      });
      service.selectChannel(1);
    });
  });

  // ─── Bulk Operations ─────────────────────────────────────────────────────

  describe('Bulk Operations', () => {
    it('should get selected channels from list', () => {
      service.selectMultiple([1, 3, 5]);
      const selected = service.getSelectedChannels(mockChannels);
      
      expect(selected.length).toBe(3);
      expect(selected[0].id).toBe(1);
      expect(selected[1].id).toBe(3);
      expect(selected[2].id).toBe(5);
    });

    it('should invert selection', () => {
      service.selectMultiple([1, 2]);
      service.invertSelection(mockChannels);
      
      expect(service.selectedCount).toBe(3);
      expect(service.isChannelSelected(1)).toBe(false);
      expect(service.isChannelSelected(2)).toBe(false);
      expect(service.isChannelSelected(3)).toBe(true);
      expect(service.isChannelSelected(4)).toBe(true);
      expect(service.isChannelSelected(5)).toBe(true);
    });

    it('should select channels matching predicate', () => {
      service.selectWhere(mockChannels, (channel) => channel.media_type === MediaType.movie);
      
      expect(service.selectedCount).toBe(2);
      expect(service.isChannelSelected(2)).toBe(true);
      expect(service.isChannelSelected(5)).toBe(true);
    });

    it('should handle empty channel list', () => {
      service.selectAll([]);
      expect(service.selectedCount).toBe(0);
    });

    it('should handle channels without IDs', () => {
      const channelsWithoutIds: Channel[] = [
        { name: 'No ID' } as Channel,
      ];
      
      service.selectAll(channelsWithoutIds);
      expect(service.selectedCount).toBe(0);
    });
  });

  // ─── Statistics ──────────────────────────────────────────────────────────

  describe('Statistics', () => {
    it('should calculate selection statistics', () => {
      service.selectMultiple([1, 2, 3]);
      const stats = service.getSelectionStats(mockChannels);
      
      expect(stats.total).toBe(5);
      expect(stats.selected).toBe(3);
      expect(stats.percentage).toBe(60);
    });

    it('should handle empty selection', () => {
      const stats = service.getSelectionStats(mockChannels);
      
      expect(stats.total).toBe(5);
      expect(stats.selected).toBe(0);
      expect(stats.percentage).toBe(0);
    });

    it('should handle empty channel list', () => {
      const stats = service.getSelectionStats([]);
      
      expect(stats.total).toBe(0);
      expect(stats.selected).toBe(0);
      expect(stats.percentage).toBe(0);
    });

    it('should calculate 100% selection', () => {
      service.selectAll(mockChannels);
      const stats = service.getSelectionStats(mockChannels);
      
      expect(stats.percentage).toBe(100);
    });
  });

  // ─── Reset ───────────────────────────────────────────────────────────────

  describe('Reset', () => {
    it('should reset all state', () => {
      service.enableSelectionMode();
      service.selectMultiple([1, 2, 3]);
      
      service.reset();
      
      expect(service.selectionMode).toBe(false);
      expect(service.selectedCount).toBe(0);
      expect(service.hasSelection()).toBe(false);
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle selecting same channel multiple times', () => {
      service.selectChannel(1);
      service.selectChannel(1);
      service.selectChannel(1);
      
      expect(service.selectedCount).toBe(1);
    });

    it('should handle deselecting non-selected channel', () => {
      service.deselectChannel(999);
      
      expect(service.selectedCount).toBe(0);
    });

    it('should handle toggling non-existent channel', () => {
      service.toggleChannelSelection(999);
      
      expect(service.isChannelSelected(999)).toBe(true);
      expect(service.selectedCount).toBe(1);
    });

    it('should maintain selection when toggling mode on', () => {
      service.selectChannel(1);
      service.enableSelectionMode();
      
      expect(service.isChannelSelected(1)).toBe(true);
    });
  });
});
