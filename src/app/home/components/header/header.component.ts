import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ViewEncapsulation,
} from '@angular/core';
import { fromEvent, filter, map, debounceTime, Subscription } from 'rxjs';
import { FilterService } from '../../../services/filter.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  @Input() selectedCount = 0;
  @Input() selectionMode = false;
  @Input() bulkDisabled = false;
  @Input() bulkMenu: any;
  @Input() loading = false;

  @Output() toggleSelectionMode = new EventEmitter<void>();
  @Output() clearSelection = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();
  @Output() reloadRequested = new EventEmitter<void>();
  @Output() searchChanged = new EventEmitter<string>();
  @Output() openCategoryManager = new EventEmitter<void>();

  @ViewChild('searchInput') searchInput!: ElementRef;

  private searchSubscription?: Subscription;

  constructor(public filterService: FilterService) {}

  ngAfterViewInit() {
    this.searchSubscription = fromEvent(this.searchInput.nativeElement, 'keyup')
      .pipe(
        filter((event: any) => event.key !== 'Escape'),
        map((event: any) => event.target.value),
        debounceTime(300),
      )
      .subscribe((term: string) => {
        this.searchChanged.emit(term);
      });
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
  }

  onReload() {
    this.reloadRequested.emit();
  }

  focusSearch() {
    this.searchInput.nativeElement.focus();
  }

  clearSearch() {
    this.searchInput.nativeElement.value = '';
    this.searchChanged.emit('');
  }
}
