import { NodeType } from "./nodeType";
import { ViewMode } from "./viewMode";

export class Node {
  readonly scrollPosition: number;

  constructor(
    readonly id: number,
    readonly name: string,
    readonly type: NodeType,
    public query?: string,
    public fromViewType?: ViewMode
  ) {
    this.scrollPosition = window.scrollY;
  }

  toString(): string {
    return `Viewing: ${this.name}`;
  }
}
