import { Injectable } from '@angular/core';
import { UnlistenFn } from '@tauri-apps/api/event';
import { OpenDialogOptions } from '@tauri-apps/plugin-dialog';

@Injectable()
export class MockTauriService {
  async call<T>(command: string, args?: any): Promise<T> {
    // Default mock responses for common commands
    if (command === 'is_container') {
      return false as any;
    }
    if (command === 'get_app_version') {
      return '2.0.6' as any;
    }
    return Promise.resolve({} as T);
  }

  async on<T>(event: string, handler: (payload: T) => void): Promise<UnlistenFn> {
    return Promise.resolve(() => {});
  }

  async emit<T>(event: string, payload?: T): Promise<void> {
    return Promise.resolve();
  }

  async getAppVersion(): Promise<string> {
    return '2.0.6';
  }

  async setZoom(factor: number): Promise<void> {
    return Promise.resolve();
  }

  async openDialog(options: OpenDialogOptions): Promise<string | string[] | null> {
    return null;
  }

  async saveDialog(options: any): Promise<string | null> {
    return null;
  }

  async openUrl(url: string): Promise<void> {
    return Promise.resolve();
  }

  async clipboardWriteText(text: string): Promise<void> {
    return Promise.resolve();
  }
}
