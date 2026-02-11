import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NavigationService } from './navigation.service';
import { FocusArea } from '../models/focusArea';
import { Node } from '../models/node';
import { NodeType } from '../models/nodeType';

describe('NavigationService', () => {
  let service: NavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NavigationService);
  });

  afterEach(() => {
    service.reset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── Focus Management ────────────────────────────────────────────────────

  describe('Focus Management', () => {
    it('should initialize with focus 0 and FocusArea.Tiles', () => {
      expect(service.focus).toBe(0);
      expect(service.focusArea).toBe(FocusArea.Tiles);
    });

    it('should update focus value', () => {
      service.focus = 5;
      expect(service.focus).toBe(5);
    });

    it('should update focus area', () => {
      service.focusArea = FocusArea.Filters;
      expect(service.focusArea).toBe(FocusArea.Filters);
    });

    it('should emit focus changes via observable', (done) => {
      service.focus$.subscribe((focus) => {
        if (focus === 10) {
          expect(focus).toBe(10);
          done();
        }
      });
      service.focus = 10;
    });

    it('should emit focus area changes via observable', (done) => {
      service.focusArea$.subscribe((area) => {
        if (area === FocusArea.ViewMode) {
          expect(area).toBe(FocusArea.ViewMode);
          done();
        }
      });
      service.focusArea = FocusArea.ViewMode;
    });

    it('should focus element by ID', fakeAsync(() => {
      const mockElement = document.createElement('button');
      mockElement.id = 'test-element';
      document.body.appendChild(mockElement);

      spyOn(mockElement, 'focus');
      service.focusElement('test-element');

      tick(10);
      expect(mockElement.focus).toHaveBeenCalled();
      document.body.removeChild(mockElement);
    }));

    it('should select first channel', () => {
      const mockFirst = document.createElement('div');
      mockFirst.id = 'first';
      const mockChild = document.createElement('button');
      mockFirst.appendChild(mockChild);
      document.body.appendChild(mockFirst);
      
      spyOn(mockChild, 'focus');
      service.selectFirstChannel();
      
      expect(service.focusArea).toBe(FocusArea.Tiles);
      expect(service.focus).toBe(0);
      expect(mockChild.focus).toHaveBeenCalled();
      
      document.body.removeChild(mockFirst);
    });

    it('should select first channel after delay', (done) => {
      spyOn(service, 'selectFirstChannel');
      service.selectFirstChannelDelayed(50);
      
      setTimeout(() => {
        expect(service.selectFirstChannel).toHaveBeenCalled();
        done();
      }, 60);
    });

    it('should check if search is focused', () => {
      const mockSearch = document.createElement('input');
      mockSearch.id = 'search';
      document.body.appendChild(mockSearch);
      
      mockSearch.focus();
      expect(service.isSearchFocused()).toBe(true);
      
      mockSearch.blur();
      expect(service.isSearchFocused()).toBe(false);
      
      document.body.removeChild(mockSearch);
    });
  });

  // ─── Keyboard Navigation ─────────────────────────────────────────────────

  describe('Keyboard Navigation', () => {
    it('should return false when search is focused', async () => {
      const mockSearch = document.createElement('input');
      mockSearch.id = 'search';
      document.body.appendChild(mockSearch);
      mockSearch.focus();
      
      const result = await service.navigate('ArrowDown', 10, false, true, false, false, 1);
      
      expect(result).toBe(false);
      document.body.removeChild(mockSearch);
    });

    it('should navigate down (ArrowDown)', async () => {
      service.focus = 0;
      service.focusArea = FocusArea.Tiles;
      
      await service.navigate('ArrowDown', 100, false, true, false, false, 1);
      
      expect(service.focus).toBe(3);
    });

    it('should navigate up (ArrowUp)', async () => {
      service.focus = 5;
      service.focusArea = FocusArea.Tiles;
      
      await service.navigate('ArrowUp', 100, false, true, false, false, 1);
      
      expect(service.focus).toBe(2);
    });

    it('should navigate right (ArrowRight)', async () => {
      service.focus = 0;
      service.focusArea = FocusArea.Tiles;
      
      await service.navigate('ArrowRight', 100, false, true, false, false, 1);
      
      expect(service.focus).toBe(1);
    });

    it('should navigate left (ArrowLeft)', async () => {
      service.focus = 5;
      service.focusArea = FocusArea.Tiles;
      
      await service.navigate('ArrowLeft', 100, false, true, false, false, 1);
      
      expect(service.focus).toBe(4);
    });

    it('should return true when reaching pagination threshold', async () => {
      service.focus = 35;
      service.focusArea = FocusArea.Tiles;
      
      const result = await service.navigate('ArrowDown', 36, false, true, false, false, 1);
      
      expect(result).toBe(true);
    });

    it('should not exceed channel length', async () => {
      service.focus = 8;
      service.focusArea = FocusArea.Tiles;
      
      await service.navigate('ArrowDown', 10, false, true, false, false, 1);
      
      expect(service.focus).toBe(9); // Should cap at channelsLength - 1
    });

    it('should handle mobile layout (lowSize)', async () => {
      service.focus = 0;
      service.focusArea = FocusArea.Tiles;
      
      await service.navigate('ArrowDown', 100, false, true, false, true, 1);
      
      expect(service.focus).toBe(1); // 3 / 3 = 1 in mobile mode
    });

    it('should change focus area when navigating up from tiles', async () => {
      service.focus = 0;
      service.focusArea = FocusArea.Tiles;
      
      await service.navigate('ArrowUp', 100, false, true, false, false, 1);
      
      expect(service.focusArea).toBeLessThan(FocusArea.Tiles);
    });
  });

  // ─── Navigation History ──────────────────────────────────────────────────

  describe('Navigation History', () => {
    it('should push node to stack', () => {
      const node = new Node(1, 'Test', NodeType.Category, '', undefined);
      service.pushNode(node);
      
      expect(service.hasNodes()).toBe(true);
    });

    it('should pop node from stack', () => {
      const node1 = new Node(1, 'Test1', NodeType.Category, '', undefined);
      const node2 = new Node(2, 'Test2', NodeType.Series, '', undefined);
      
      service.pushNode(node1);
      service.pushNode(node2);
      
      const popped = service.popNode();
      expect(popped.id).toBe(2);
      expect(popped.name).toBe('Test2');
    });

    it('should check if stack has nodes', () => {
      expect(service.hasNodes()).toBe(false);
      
      const node = new Node(1, 'Test', NodeType.Category, '', undefined);
      service.pushNode(node);
      
      expect(service.hasNodes()).toBe(true);
    });

    it('should clear all nodes', () => {
      const node1 = new Node(1, 'Test1', NodeType.Category, '', undefined);
      const node2 = new Node(2, 'Test2', NodeType.Series, '', undefined);
      
      service.pushNode(node1);
      service.pushNode(node2);
      
      service.clearNodes();
      
      expect(service.hasNodes()).toBe(false);
    });

    it('should get node stack', () => {
      const stack = service.getNodeStack();
      expect(stack).toBeDefined();
      expect(stack.hasNodes()).toBe(false);
    });
  });

  // ─── Reset ───────────────────────────────────────────────────────────────

  describe('Reset', () => {
    it('should reset all navigation state', () => {
      service.focus = 10;
      service.focusArea = FocusArea.Filters;
      service.pushNode(new Node(1, 'Test', NodeType.Category, '', undefined));

      service.reset();

      expect(service.focus).toBe(0);
      expect(service.focusArea).toBe(FocusArea.Tiles as any);
      expect(service.hasNodes()).toBe(false);
    });
  });
});
