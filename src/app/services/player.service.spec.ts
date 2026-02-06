import { TestBed } from '@angular/core/testing';
import { PlayerService } from './player.service';
import { TauriService } from './tauri.service';
import { Channel } from '../models/channel';
import { MediaType } from '../models/mediaType';

describe('PlayerService', () => {
  let service: PlayerService;
  let tauriService: jasmine.SpyObj<TauriService>;

  beforeEach(() => {
    tauriService = jasmine.createSpyObj('TauriService', ['call']);
    tauriService.call.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        PlayerService,
        { provide: TauriService, useValue: tauriService },
      ],
    });

    service = TestBed.inject(PlayerService);
  });

  // ─── Play ──────────────────────────────────────────────────────────────

  describe('play', () => {
    it('should call Tauri play command with valid channel', async () => {
      const channel: Channel = {
        id: 1,
        name: 'Test Channel',
        url: 'http://example.com/stream.m3u8',
        media_type: MediaType.livestream,
      } as Channel;

      await service.play(channel);

      expect(tauriService.call).toHaveBeenCalledWith('play', {
        channel,
        record: false,
        recordPath: undefined,
      });
    });

    it('should throw error for channel without URL', async () => {
      const channel: Channel = {
        id: 1,
        name: 'No URL Channel',
        url: undefined,
        media_type: MediaType.livestream,
      } as Channel;

      await expectAsync(service.play(channel)).toBeRejectedWithError(
        'Invalid channel: missing required fields (url or name)',
      );
    });

    it('should throw error for channel without name', async () => {
      const channel: Channel = {
        id: 1,
        name: undefined,
        url: 'http://example.com/stream',
        media_type: MediaType.livestream,
      } as Channel;

      await expectAsync(service.play(channel)).toBeRejectedWithError(
        'Invalid channel: missing required fields (url or name)',
      );
    });

    it('should throw error for channel with invalid URL protocol', async () => {
      const channel: Channel = {
        id: 1,
        name: 'Bad Protocol',
        url: 'ftp://example.com/stream',
        media_type: MediaType.livestream,
      } as Channel;

      await expectAsync(service.play(channel)).toBeRejectedWithError(
        'Invalid channel URL: must be a valid HTTP or HTTPS URL',
      );
    });

    it('should support recording mode', async () => {
      const channel: Channel = {
        id: 1,
        name: 'Record Channel',
        url: 'http://example.com/stream.m3u8',
        media_type: MediaType.livestream,
      } as Channel;

      await service.play(channel, true, '/path/to/recording.ts');

      expect(tauriService.call).toHaveBeenCalledWith('play', {
        channel,
        record: true,
        recordPath: '/path/to/recording.ts',
      });
    });
  });

  // ─── Last Watched ──────────────────────────────────────────────────────

  describe('addLastWatched', () => {
    it('should call Tauri add_last_watched with valid ID', async () => {
      await service.addLastWatched(42);

      expect(tauriService.call).toHaveBeenCalledWith('add_last_watched', { id: 42 });
    });

    it('should throw error for invalid channel ID (0)', async () => {
      await expectAsync(service.addLastWatched(0)).toBeRejectedWithError('Invalid channel ID');
    });

    it('should throw error for negative channel ID', async () => {
      await expectAsync(service.addLastWatched(-1)).toBeRejectedWithError('Invalid channel ID');
    });
  });
});
