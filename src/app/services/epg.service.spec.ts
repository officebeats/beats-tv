/*
 * Beats TV - Premium IPTV Player
 * EpgService - Unit tests for EPG operations
 *
 * Comprehensive test suite for EpgService functionality.
 */

import { TestBed } from '@angular/core/testing';
import { EpgService } from './epg.service';
import { TauriService } from './tauri.service';

describe('EpgService', () => {
  let service: EpgService;
  let tauriService: jasmine.SpyObj<TauriService>;

  beforeEach(() => {
    const tauriSpy = jasmine.createSpyObj('TauriService', ['call']);

    TestBed.configureTestingModule({
      providers: [
        EpgService,
        { provide: TauriService, useValue: tauriSpy },
      ],
    });

    service = TestBed.inject(EpgService);
    tauriService = TestBed.inject(TauriService) as jasmine.SpyObj<TauriService>;
  });

  describe('getEpgIds', () => {
    it('should call Tauri get_epg_ids command', async () => {
      const mockEpgIds = ['epg1', 'epg2'];
      tauriService.call.and.returnValue(Promise.resolve(mockEpgIds));

      const result = await service.getEpgIds();

      expect(result).toEqual(mockEpgIds);
      expect(tauriService.call).toHaveBeenCalledWith('get_epg_ids');
    });

    it('should handle empty EPG list', async () => {
      tauriService.call.and.returnValue(Promise.resolve([]));

      const result = await service.getEpgIds();

      expect(result).toEqual([]);
      expect(tauriService.call).toHaveBeenCalledWith('get_epg_ids');
    });
  });

  describe('setEpgActive', () => {
    it('should call Tauri set_epg_active command with correct parameters', async () => {
      const epgId = 'epg1';
      const active = true;

      await service.setEpgActive(epgId, active);

      expect(tauriService.call).toHaveBeenCalledWith('set_epg_active', { id: epgId, active });
    });

    it('should call Tauri set_epg_active command with false parameter', async () => {
      const epgId = 'epg2';
      const active = false;

      await service.setEpgActive(epgId, active);

      expect(tauriService.call).toHaveBeenCalledWith('set_epg_active', { id: epgId, active });
    });
  });

  describe('checkEpgOnStart', () => {
    it('should call Tauri on_start_check_epg command', async () => {
      tauriService.call.and.returnValue(Promise.resolve());

      await service.checkEpgOnStart();

      expect(tauriService.call).toHaveBeenCalledWith('on_start_check_epg');
    });

    it('should not throw error if Tauri call fails', async () => {
      tauriService.call.and.returnValue(Promise.reject(new Error('EPG check failed')));

      const result = service.checkEpgOnStart();

      await expectAsync(result).toBeResolved();
    });

    it('should handle successful EPG check', async () => {
      tauriService.call.and.returnValue(Promise.resolve());

      const result = service.checkEpgOnStart();

      await expectAsync(result).toBeResolved();
    });
  });

  describe('error handling', () => {
    it('should handle Tauri call failures gracefully', async () => {
      tauriService.call.and.returnValue(Promise.reject(new Error('Tauri error')));

      const result = service.getEpgIds();

      await expectAsync(result).toBeRejectedWithError('Tauri error');
    });
  });
});
