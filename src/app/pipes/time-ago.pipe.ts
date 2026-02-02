import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
  private readonly intervals = {
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };

  transform(value: any): string {
    if (!value) return '';

    const seconds = Math.floor((Date.now() - +new Date(value)) / 1000);
    if (seconds < 29) return 'Just now';

    for (const [unit, divisor] of Object.entries(this.intervals)) {
      const counter = Math.floor(seconds / divisor);
      if (counter > 0) {
        return `${counter} ${unit}${counter === 1 ? '' : 's'} ago`;
      }
    }
    return value;
  }
}
