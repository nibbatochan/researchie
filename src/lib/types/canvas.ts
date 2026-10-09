export type CanvasNodeMode = 'compact' | 'detailed';

export type CanvasShapeType = 'sticky' | 'rectangle' | 'circle' | 'heading';

export interface CanvasFolder {
  id: string;
  title: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasShape {
  id: string;
  type: CanvasShapeType;
  text: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasLink {
  id: string;
  fromId: string;
  toId: string;
  fromPort?: 'top' | 'bottom' | 'left' | 'right';
  toPort?: 'top' | 'bottom' | 'left' | 'right';
  label?: string;
  type: 'supports' | 'contradicts' | 'derives' | 'relates';
}

export interface CanvasNodePosition {
  x: number;
  y: number;
}

export interface CanvasNodeSize {
  width: number;
  height: number;
}
