import { Injectable } from '@angular/core';
import { TauriService } from './tauri.service';
import { Settings } from '../models/settings';
import { BehaviorSubject, Observable } from 'rxjs';
import { Channel } from '../models/channel';
import { MediaType } from '../models/mediaType';

export interface DetectedPattern {
  prefix: string;
  count: number;
}

@Injectable({
  providedIn: 'root',
})
export class FilterService {
  constructor() {}

  isChannelVisible(channel: Channel): boolean {
    return channel.hidden === false || channel.hidden === undefined;
  }
}
