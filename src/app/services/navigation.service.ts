import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FocusArea, FocusAreaPrefix } from '../models/focusArea';
import { Node } from '../models/node';
import { Stack } from '../models/stack';

/**
 * NavigationService
 * 
 * Centralized service for managing keyboard navigation, focus areas, and navigation history.
 * Extracted from HomeComponent to improve separation of concerns and testability.
 */
@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  // Focus state
  private focusSubject = new BehaviorSubject<number>(0);
  private focusAreaSubject = new BehaviorSubject<FocusArea>(FocusArea.Tiles);
  
  // Navigation history
  private nodeStack: Stack = new Stack();
  
  // Observables
  public focus$: Observable<number> = this.focusSubject.asObservable();
  public focusArea$: Observable<FocusArea> = this.focusAreaSubject.asObservable();

  constructor() {}

  // ─── Focus Management ────────────────────────────────────────────────────

  /**
   * Get current focus index
   */
  get focus(): number {
    return this.focusSubject.value;
  }

  /**
   * Set focus index
   */
  set focus(value: number) {
    this.focusSubject.next(value);
  }

  /**
   * Get current focus area
   */
  get focusArea(): FocusArea {
    return this.focusAreaSubject.value;
  }

  /**
   * Set focus area
   */
  set focusArea(value: FocusArea) {
    this.focusAreaSubject.next(value);
  }

  /**
   * Focus on a specific element by ID
   */
  focusElement(id: string): void {
    setTimeout(() => {
      document.getElementById(id)?.focus();
    }, 0);
  }

  /**
   * Focus on the first channel tile
   */
  selectFirstChannel(): void {
    this.focusArea = FocusArea.Tiles;
    this.focus = 0;
    const firstElement = document.getElementById('first')?.firstChild as HTMLElement | null;
    firstElement?.focus();
  }

  /**
   * Focus on the first channel after a delay
   */
  selectFirstChannelDelayed(milliseconds: number): void {
    setTimeout(() => this.selectFirstChannel(), milliseconds);
  }

  /**
   * Focus on search input
   */
  focusSearch(searchInputElement?: HTMLElement): void {
    if (searchInputElement) {
      searchInputElement.focus();
    }
  }

  /**
   * Check if search input is currently focused
   */
  isSearchFocused(): boolean {
    return document.activeElement?.id === 'search';
  }

  // ─── Keyboard Navigation ─────────────────────────────────────────────────

  /**
   * Navigate based on arrow key or tab
   * @param key The key pressed (ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Tab, ShiftTab)
   * @param channelsLength Total number of channels available
   * @param reachedMax Whether pagination has reached the end
   * @param filtersVisible Whether filters are visible
   * @param shortFiltersMode Whether in short filters mode
   * @param lowSize Whether window is in mobile size
   * @returns Promise that resolves to true if loadMore should be called
   */
  async navigate(
    key: string,
    channelsLength: number,
    reachedMax: boolean,
    filtersVisible: boolean,
    shortFiltersMode: boolean,
    lowSize: boolean,
    currentPage: number
  ): Promise<boolean> {
    if (this.isSearchFocused()) return false;

    let tmpFocus = 0;
    
    // Calculate focus delta based on key
    switch (key) {
      case 'ArrowUp':
        tmpFocus -= 3;
        break;
      case 'ArrowDown':
        tmpFocus += 3;
        break;
      case 'ShiftTab':
      case 'ArrowLeft':
        tmpFocus -= 1;
        break;
      case 'Tab':
      case 'ArrowRight':
        tmpFocus += 1;
        break;
    }

    const goOverSize = shortFiltersMode ? 1 : 2;
    
    // Adjust for mobile layout
    if (lowSize && tmpFocus % 3 === 0 && this.focusArea === FocusArea.Tiles) {
      tmpFocus = tmpFocus / 3;
    }
    
    tmpFocus += this.focus;

    // Handle focus area transitions
    if (tmpFocus < 0) {
      this.changeFocusArea(false, filtersVisible, shortFiltersMode);
      return false;
    } else if (tmpFocus > goOverSize && this.focusArea === FocusArea.Filters) {
      this.changeFocusArea(true, filtersVisible, shortFiltersMode);
      return false;
    } else if (tmpFocus > 4 && this.focusArea === FocusArea.ViewMode) {
      this.changeFocusArea(true, filtersVisible, shortFiltersMode);
      return false;
    } else if (
      this.focusArea === FocusArea.Tiles &&
      tmpFocus >= currentPage * 36 &&
      !reachedMax
    ) {
      // Need to load more
      return true;
    } else {
      // Normal focus movement within current area
      if (tmpFocus >= channelsLength && this.focusArea === FocusArea.Tiles) {
        tmpFocus = (channelsLength === 0 ? 1 : channelsLength) - 1;
      }
      this.focus = tmpFocus;
      this.focusElement(`${FocusAreaPrefix[this.focusArea]}${this.focus}`);
      return false;
    }
  }

  /**
   * Change focus area (up or down)
   */
  private changeFocusArea(
    down: boolean,
    filtersVisible: boolean,
    shortFiltersMode: boolean
  ): void {
    const increment = down ? 1 : -1;
    this.focusArea += increment;
    
    // Skip filters if not visible
    if (this.focusArea === FocusArea.Filters && !filtersVisible) {
      this.focusArea += increment;
    }
    
    // Prevent going below 0
    if (this.focusArea < 0) {
      this.focusArea = 0;
    }
    
    this.applyFocusArea(down, shortFiltersMode);
  }

  /**
   * Apply focus to the appropriate element in the new focus area
   */
  private applyFocusArea(down: boolean, shortFiltersMode: boolean): void {
    this.focus = down
      ? 0
      : this.focusArea === FocusArea.Filters
        ? shortFiltersMode
          ? 1
          : 2
        : 4;
    
    const id = FocusAreaPrefix[this.focusArea] + this.focus;
    this.focusElement(id);
  }

  // ─── Navigation History (Node Stack) ─────────────────────────────────────

  /**
   * Add a node to the navigation stack
   */
  pushNode(node: Node): void {
    this.nodeStack.add(node);
  }

  /**
   * Remove and return the last node from the stack
   */
  popNode(): Node {
    return this.nodeStack.pop();
  }

  /**
   * Check if there are nodes in the stack
   */
  hasNodes(): boolean {
    return this.nodeStack.hasNodes();
  }

  /**
   * Clear all nodes from the stack
   */
  clearNodes(): void {
    this.nodeStack.clear();
  }

  /**
   * Get the current node stack (for debugging/display)
   */
  getNodeStack(): Stack {
    return this.nodeStack;
  }

  // ─── Reset ───────────────────────────────────────────────────────────────

  /**
   * Reset navigation state to defaults
   */
  reset(): void {
    this.focus = 0;
    this.focusArea = FocusArea.Tiles;
    this.nodeStack.clear();
  }
}
