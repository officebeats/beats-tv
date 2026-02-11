import { Component, Input, HostBinding } from '@angular/core';

export type IconName =
  | 'home'
  | 'grid'
  | 'heart'
  | 'clock'
  | 'check'
  | 'dots-vertical'
  | 'settings'
  | 'eye'
  | 'pencil'
  | 'star'
  | 'close'
  | 'search'
  | 'filter'
  | 'download'
  | 'share'
  | 'delete'
  | 'edit'
  | 'record'
  | 'epg'
  | 'restream';

@Component({
  selector: 'app-icon',
  template: `
    <svg
      [attr.viewBox]="viewBox"
      [attr.fill]="fill"
      [attr.stroke]="stroke"
      [attr.stroke-width]="strokeWidth"
      [attr.stroke-linecap]="strokeLinecap"
      [attr.stroke-linejoin]="strokeLinejoin"
      class="icon"
      [class.icon-sm]="size === 'sm'"
      [class.icon-md]="size === 'md'"
      [class.icon-lg]="size === 'lg'"
      [attr.aria-hidden]="ariaHidden"
      [attr.aria-label]="ariaLabel"
    >
      <ng-container [ngSwitch]="name">
        <!-- Home -->
        <g *ngSwitchCase="'home'">
          <path d="M3 9.5L12 3L21 9.5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V9.5Z" />
          <path d="M9 21V12H15V21" />
        </g>

        <!-- Grid -->
        <g *ngSwitchCase="'grid'">
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
        </g>

        <!-- Heart -->
        <g *ngSwitchCase="'heart'">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </g>

        <!-- Clock -->
        <g *ngSwitchCase="'clock'">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6V12L16 14.5" />
        </g>

        <!-- Check -->
        <g *ngSwitchCase="'check'">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </g>

        <!-- Dots Vertical -->
        <g *ngSwitchCase="'dots-vertical'">
          <circle cx="12" cy="8" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="16" r="1.5" />
        </g>

        <!-- Settings -->
        <g *ngSwitchCase="'settings'">
          <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
        </g>

        <!-- Eye -->
        <g *ngSwitchCase="'eye'">
          <path d="M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z" />
        </g>

        <!-- Pencil -->
        <g *ngSwitchCase="'pencil'">
          <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
        </g>

        <!-- Star -->
        <g *ngSwitchCase="'star'">
          <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z" />
        </g>

        <!-- Close -->
        <g *ngSwitchCase="'close'">
          <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
        </g>

        <!-- Search -->
        <g *ngSwitchCase="'search'">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </g>

        <!-- Filter -->
        <g *ngSwitchCase="'filter'">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </g>

        <!-- Download -->
        <g *ngSwitchCase="'download'">
          <path d="M19,9H15V3H9V9H5L12,16L19,9M5,18V20H19V18H5Z" />
        </g>

        <!-- Share -->
        <g *ngSwitchCase="'share'">
          <path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19C20.92,17.39 19.61,16.08 18,16.08Z" />
        </g>

        <!-- Delete -->
        <g *ngSwitchCase="'delete'">
          <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
        </g>

        <!-- Edit -->
        <g *ngSwitchCase="'edit'">
          <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
        </g>

        <!-- Record -->
        <g *ngSwitchCase="'record'">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
        </g>

        <!-- EPG -->
        <g *ngSwitchCase="'epg'">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="9" y1="4" x2="9" y2="20" />
        </g>

        <!-- Restream -->
        <g *ngSwitchCase="'restream'">
          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
        </g>
      </ng-container>
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .icon {
        width: 24px;
        height: 24px;
        transition: transform var(--transition-fast);
      }

      .icon-sm {
        width: 16px;
        height: 16px;
      }

      .icon-md {
        width: 24px;
        height: 24px;
      }

      .icon-lg {
        width: 32px;
        height: 32px;
      }

      :host:hover .icon {
        transform: scale(1.05);
      }
    `,
  ],
})
export class IconComponent {
  @Input() name: IconName = 'home';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() fill: string = 'none';
  @Input() stroke: string = 'currentColor';
  @Input() strokeWidth: string = '2';
  @Input() strokeLinecap: string = 'round';
  @Input() strokeLinejoin: string = 'round';
  @Input() viewBox: string = '0 0 24 24';
  @Input() ariaLabel: string | null = null;
  @Input() ariaHidden: boolean = true;

  @HostBinding('class') get hostClasses(): string {
    return `icon-${this.size}`;
  }
}
