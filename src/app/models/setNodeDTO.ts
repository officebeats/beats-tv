import { NodeType } from "./nodeType";

export class SetNodeDTO {
  constructor(
    public id: number,
    public name: string,
    public type: NodeType,
    public sourceId?: number
  ) {}
}
