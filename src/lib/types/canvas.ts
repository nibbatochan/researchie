export type CanvasNodeMode = 'compact' | 'detailed';

export type CanvasTool =
  | 'pointer'
  | 'hand'
  | 'connect'
  | 'sticky'
  | 'text'
  | 'section'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'shape';

// Figma's essential basic shape set
export type FigmaBasicShapeType =
  | 'rectangle'
  | 'square'
  | 'ellipse'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'polygon'
  | 'star';

export type CanvasShapeType = 'sticky' | 'text' | 'heading' | FigmaBasicShapeType;

export interface CanvasAtomNode {
  instanceId: string;
  atomId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  zIndex?: number;
  locked?: boolean;
  color?: string;
  mode?: CanvasNodeMode;
}

export interface CanvasFolder {
  id: string;
  title: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  locked?: boolean;
}

export interface CanvasShape {
  id: string;
  type: CanvasShapeType;
  text: string;
  color: string; // Fill color
  strokeColor?: string; // Stroke color
  strokeWidth?: number;
  textColor?: string;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  locked?: boolean;
}

export interface CanvasConnector {
  id: string;
  fromId: string;
  toId: string;
  fromPort?: 'top' | 'bottom' | 'left' | 'right';
  toPort?: 'top' | 'bottom' | 'left' | 'right';
  style?: 'curved' | 'straight';
  lineType?: 'solid' | 'dashed';
  hasArrow?: boolean;
  color?: string;
  label?: string;
}

// Backward compatibility alias
export type CanvasLink = CanvasConnector;

export interface CanvasDrawingPath {
  id: string;
  tool: 'pen' | 'highlighter';
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth: number;
  zIndex?: number;
}

export interface CanvasNodePosition {
  x: number;
  y: number;
}

export interface CanvasNodeSize {
  width: number;
  height: number;
}

export interface CanvasMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasData {
  id: string;
  name: string;
  nodes: CanvasAtomNode[];
  folders: CanvasFolder[];
  shapes: CanvasShape[];
  connectors: CanvasConnector[];
  drawings: CanvasDrawingPath[];
}
