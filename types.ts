
export interface Position {
  x: number;
  y: number;
}

export enum ActionType {
  MOVE = 'MOVE',
  CLICK = 'CLICK',
  DRAW = 'DRAW',
  IDLE = 'IDLE'
}

export interface CursorAction {
  type: ActionType;
  target?: string;
  position?: Position;
  path?: Position[];
  label?: string;
}

export interface WindowState {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isOpen: boolean;
}
