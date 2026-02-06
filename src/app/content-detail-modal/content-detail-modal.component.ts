import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Channel } from '../models/channel';
import { MovieData } from '../services/movie-metadata.service';

export { MovieData };

@Component({
  selector: 'app-content-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './content-detail-modal.component.html',
  styleUrls: ['./content-detail-modal.component.css'],
})
export class ContentDetailModalComponent {
  @Input() channel: Channel | null = null;
  @Input()
  @HostBinding('class.open')
  isOpen = false;

  @Input() isLoadingDetails = false;
  @Input() isLoadingMetadata = false;
  @Input() movieData: MovieData | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() play = new EventEmitter<void>();
  @Output() openImdb = new EventEmitter<void>();

  // Image loading states
  posterLoaded = false;

  formatVoteCount(votes: string | undefined | null): string {
    if (!votes || votes === 'N/A') return '';
    // OMDb returns votes as string like "1,234,567"
    const count = parseInt(votes.replace(/,/g, ''), 10);
    if (isNaN(count)) return '';
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  formatRuntime(minutes: any): string {
    if (!minutes || minutes === 'N/A' || isNaN(minutes)) return '';
    const num = typeof minutes === 'string' ? parseInt(minutes, 10) : minutes;
    if (isNaN(num) || num === 0) return '';

    const hours = Math.floor(num / 60);
    const mins = num % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  onOpenImdb(): void {
    this.openImdb.emit();
  }
}
