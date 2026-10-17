'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Minus, 
  ArrowsOut, 
  Quotes, 
  Code, 
  Image as ImageIcon, 
  LinkSimple, 
  FileText, 
  Trash, 
  X, 
  ArrowSquareOut,
  ArrowsClockwise,
  BookOpen,
  Rows,
  ListDashes,
  PencilSimple,
  TextT,
  Sticker,
  Cursor,
  HandGrabbing,
  ArrowsIn,
  ArrowsOutSimple,
  Eye,
  SquaresFour,
  CornersOut,
  CornersIn,
  Sparkle,
  Tag,
  MagnifyingGlass,
  Check,
  Copy,
  Lock,
  LockOpen,
  DownloadSimple,
  Square,
  Circle,
  FolderSimple,
  ArrowRight,
  ArrowLeft,
  CaretRight,
  CaretDown,
  Palette,
  DotsThreeVertical,
  SidebarSimple,
  FrameCorners,
  ArrowsDownUp,
  ArrowsLeftRight,
  LineSegment,
  PaintBrush,
  Eraser,
  DiamondsFour,
  Polygon,
  Database,
  Cloud,
  Star,
  Selection,
  ShareNetwork,
  Compass,
  ArrowCounterClockwise,
  ArrowClockwise
} from '@phosphor-icons/react';
import { ResearchAtom, ResearchProject, AtomType } from '@/lib/types/research';
import { 
  CanvasFolder, 
  CanvasShape, 
  CanvasConnector, 
  CanvasAtomNode,
  CanvasDrawingPath,
  CanvasMeta,
  CanvasData,
  CanvasNodePosition, 
  CanvasNodeSize,
  CanvasNodeMode,
  CanvasShapeType,
  FigmaBasicShapeType,
  CanvasTool
} from '@/lib/types/canvas';
import { buildIsolatedBlockDoc } from '@/lib/utils/htmlBlockNormalizer';
import { semanticHighlightText } from '@/lib/utils/semanticHighlight';
import { getAtomHighlightText } from '@/components/AtomCard';
import { buildDeepLink } from '@/lib/utils/textFragments';
import { usePrefs } from '@/lib/prefs/prefsContext';
import {
  boxBounds,
  boxCenter,
  angleFrom,
  normalizeAngle,
  portPoint,
  resizeBox,
  snapAngle,
  type Box,
  type ResizeDirection,
} from '@/lib/canvas/geometry';
import { CanvasExportModal } from './CanvasExportModal';

const getAtomTypeSemanticStyle = (type: AtomType) => {
  switch (type) {
    case 'quote':
    case 'text':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/40';
    case 'block':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40';
    case 'image':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40';
    case 'link':
      return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/40';
    case 'note':
    default:
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/40';
  }
};

interface ResearchCanvasProps {
  project: ResearchProject | null;
  atoms: ResearchAtom[];
  onDeleteAtom?: (id: string) => void;
  onCreateAtom?: (newAtom: {
    projectId: string;
    type: AtomType;
    title?: string;
    content: { text?: string; description?: string; targetUrl?: string; imageUrl?: string; markdownContent?: string; sanitizedHtml?: string; rawText?: string };
    metadata?: { sourceUrl?: string; pageTitle?: string };
    tags?: string[];
  }) => void;
  onOpenAISidebar?: (tab: 'ask' | 'summarize', initialSelection?: ResearchAtom[]) => void;
  onOpenPdfReader?: (docId?: string, pageNumber?: number, text?: string) => void;
  showMinimap?: boolean;
  onToggleMinimap?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  /** Goes up each time the page's Export button is pressed, which opens the export dialog. */
  exportOpenSignal?: number;
}

// Finite Infinite Plane Dimensions
const CANVAS_WIDTH = 24000;
const CANVAS_HEIGHT = 18000;
const CANVAS_CENTER_X = CANVAS_WIDTH / 2;
const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2;

const DRAG_THRESHOLD = 3;
const DRAWER_WIDTH = 320;
const HIGHLIGHTER_COLORS = ['#F59E0B', '#FACC15', '#4ADE80', '#F472B6', '#38BDF8'];
const HIGHLIGHTER_THICKNESSES = [8, 14, 22, 32];
const ROTATE_HANDLE_OFFSET = 30;

// Smallest size each kind of item can be scaled to.
const MIN_SIZE = {
  node: { width: 120, height: 56 },
  folder: { width: 120, height: 80 },
  text: { width: 24, height: 16 },
  line: { width: 24, height: 8 },
  shape: { width: 24, height: 24 },
};

const SECTION_COLORS = [
  { name: 'Blue', border: 'border-blue-500/50', bg: 'bg-blue-500/5', headerBg: 'bg-blue-600', text: 'text-blue-600 dark:text-blue-400' },
  { name: 'Emerald', border: 'border-emerald-500/50', bg: 'bg-emerald-500/5', headerBg: 'bg-emerald-600', text: 'text-emerald-600 dark:text-emerald-400' },
  { name: 'Amber', border: 'border-amber-500/50', bg: 'bg-amber-500/5', headerBg: 'bg-amber-600', text: 'text-amber-600 dark:text-amber-400' },
  { name: 'Purple', border: 'border-purple-500/50', bg: 'bg-purple-500/5', headerBg: 'bg-purple-600', text: 'text-purple-600 dark:text-purple-400' },
  { name: 'Rose', border: 'border-rose-500/50', bg: 'bg-rose-500/5', headerBg: 'bg-rose-600', text: 'text-rose-600 dark:text-rose-400' },
  { name: 'Slate', border: 'border-slate-500/50', bg: 'bg-slate-500/5', headerBg: 'bg-slate-700', text: 'text-slate-600 dark:text-slate-300' },
];

const STICKY_COLORS = [
  { name: 'Yellow', bg: 'bg-[#FEF08A] dark:bg-[#EAB308]/20', border: 'border-[#FACC15] dark:border-[#EAB308]', text: 'text-amber-950 dark:text-amber-100' },
  { name: 'Blue', bg: 'bg-[#BAE6FD] dark:bg-[#0284C7]/20', border: 'border-[#38BDF8] dark:border-[#0284C7]', text: 'text-sky-950 dark:text-sky-100' },
  { name: 'Green', bg: 'bg-[#BBF7D0] dark:bg-[#16A34A]/20', border: 'border-[#4ADE80] dark:border-[#16A34A]', text: 'text-emerald-950 dark:text-emerald-100' },
  { name: 'Purple', bg: 'bg-[#DDD6FE] dark:bg-[#7C3AED]/20', border: 'border-[#A78BFA] dark:border-[#7C3AED]', text: 'text-purple-950 dark:text-purple-100' },
  { name: 'Rose', bg: 'bg-[#FECDD3] dark:bg-[#E11D48]/20', border: 'border-[#FB7185] dark:border-[#E11D48]', text: 'text-rose-950 dark:text-rose-100' },
];

const PEN_COLORS = ['#325FEC', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#1E293B', '#FAFAFA'];
const PEN_THICKNESSES = [2, 4, 8, 14];

const FIGMA_BASIC_SHAPES: Array<{ type: FigmaBasicShapeType; label: string }> = [
  { type: 'rectangle', label: 'Rectangle' },
  { type: 'square', label: 'Square' },
  { type: 'ellipse', label: 'Ellipse' },
  { type: 'circle', label: 'Circle' },
  { type: 'line', label: 'Line' },
  { type: 'arrow', label: 'Arrow' },
  { type: 'polygon', label: 'Polygon (Triangle)' },
  { type: 'star', label: 'Star' },
];

const SHAPE_FILL_PRESETS = [
  { name: 'Blue Tint', bg: 'bg-blue-500/10 dark:bg-blue-500/20', stroke: '#325FEC', text: 'text-blue-900 dark:text-blue-200' },
  { name: 'Emerald Tint', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', stroke: '#10B981', text: 'text-emerald-900 dark:text-emerald-200' },
  { name: 'Amber Tint', bg: 'bg-amber-500/10 dark:bg-amber-500/20', stroke: '#F59E0B', text: 'text-amber-900 dark:text-amber-200' },
  { name: 'Purple Tint', bg: 'bg-purple-500/10 dark:bg-purple-500/20', stroke: '#8B5CF6', text: 'text-purple-900 dark:text-purple-200' },
  { name: 'Rose Tint', bg: 'bg-rose-500/10 dark:bg-rose-500/20', stroke: '#EF4444', text: 'text-rose-900 dark:text-rose-200' },
  { name: 'White / Neutral', bg: 'bg-white dark:bg-[#18181B]', stroke: '#94A3B8', text: 'text-slate-900 dark:text-zinc-100' },
];

type CanvasDragState =
  | {
      type: 'item';
      id: string;
      itemType: 'node' | 'shape' | 'folder';
      startClientX: number;
      startClientY: number;
      startPositions: Record<string, { x: number; y: number }>;
      containedNodeIds?: string[];
      containedShapeIds?: string[];
      containedFolderIds?: string[];
      isDragging: boolean;
    }
  | {
      type: 'resize';
      id: string;
      itemType: 'node' | 'shape' | 'folder';
      direction: ResizeDirection;
      startClientX: number;
      startClientY: number;
      initialX: number;
      initialY: number;
      initialW: number;
      initialH: number;
      initialRotation: number;
      initialFontSize: number;
    }
  | {
      type: 'rotate';
      id: string;
      itemType: 'node' | 'shape';
      centerX: number;
      centerY: number;
      startAngle: number;
      initialRotation: number;
    }
  | {
      type: 'marquee';
      startCanvasX: number;
      startCanvasY: number;
      currentCanvasX: number;
      currentCanvasY: number;
    }
  | null;

const distanceToSegment = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

const strokeNear = (points: Array<{ x: number; y: number }>, pt: { x: number; y: number }, radius: number) => {
  if (points.length === 1) return Math.hypot(points[0].x - pt.x, points[0].y - pt.y) < radius;
  for (let i = 1; i < points.length; i++) {
    if (distanceToSegment(pt, points[i - 1], points[i]) < radius) return true;
  }
  return false;
};

const HANDLE_ANGLE: Record<ResizeDirection, number> = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 };
const resizeCursor = (dir: ResizeDirection, rotation: number) => {
  const a = (((HANDLE_ANGLE[dir] + rotation) % 180) + 180) % 180;
  if (a < 22.5 || a >= 157.5) return 'ns-resize';
  if (a < 67.5) return 'nesw-resize';
  if (a < 112.5) return 'ew-resize';
  return 'nwse-resize';
};

const STICKY_STROKES: Record<string, string> = {
  Yellow: '#FACC15',
  Blue: '#38BDF8',
  Green: '#4ADE80',
  Purple: '#A78BFA',
  Rose: '#FB7185',
};

export const ResearchCanvas: React.FC<ResearchCanvasProps> = ({
  project,
  atoms,
  onDeleteAtom,
  onCreateAtom,
  onOpenAISidebar,
  onOpenPdfReader,
  showMinimap = false,
  onToggleMinimap,
  isSidebarCollapsed,
  onToggleSidebar,
  exportOpenSignal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas scope: One canvas per project / sub-project
  const projectId = project?.id || 'demo_project';
  const canvasStorageKey = `researchie_canvas_${projectId}`;

  // Primary Canvas Document State
  const [nodes, setNodes] = useState<CanvasAtomNode[]>([]);
  const [folders, setFolders] = useState<CanvasFolder[]>([]);
  const [shapes, setShapes] = useState<CanvasShape[]>([]);
  const [connectors, setConnectors] = useState<CanvasConnector[]>([]);
  const [drawings, setDrawings] = useState<CanvasDrawingPath[]>([]);

  // History Stack for Undo/Redo
  const [history, setHistory] = useState<Array<{
    nodes: CanvasAtomNode[];
    folders: CanvasFolder[];
    shapes: CanvasShape[];
    connectors: CanvasConnector[];
    drawings: CanvasDrawingPath[];
  }>>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isHistoryAction = useRef(false);

  // Viewport Pan & Zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.85);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-hide minimap zoom timer state
  const [isZooming, setIsZooming] = useState(false);
  const zoomTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active Tool: Pointer, Hand, Connect, Sticky, Text, Section, Pen, Highlighter, Eraser, Shape
  const [activeTool, setActiveTool] = useState<CanvasTool>('pointer');

  // Pen & Highlighter styling
  const [penColor, setPenColor] = useState<string>('#325FEC');
  const [penThickness, setPenThickness] = useState<number>(3);
  const [highlighterColor, setHighlighterColor] = useState<string>('#F59E0B');
  const [highlighterThickness, setHighlighterThickness] = useState<number>(14);

  // Drawing in progress
  const [activeDrawing, setActiveDrawing] = useState<CanvasDrawingPath | null>(null);

  // Flowchart Shape creation menu
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dragging / Resizing
  const [dragState, setDragState] = useState<CanvasDragState>(null);

  // Connecting Ports State (Activated when activeTool === 'connect')
  const [connectingFrom, setConnectingFrom] = useState<{ id: string; port: 'top' | 'bottom' | 'left' | 'right' } | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredPortTarget, setHoveredPortTarget] = useState<{ id: string; port: 'top' | 'bottom' | 'left' | 'right' } | null>(null);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);

  // Side Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerFilter, setDrawerFilter] = useState<string>('all');
  const [draggingAtomId, setDraggingAtomId] = useState<string | null>(null);

  // Inline editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Export dialog (opened from the page's Export button)
  const [isExportOpen, setIsExportOpen] = useState(false);
  useEffect(() => {
    if (exportOpenSignal) setIsExportOpen(true);
  }, [exportOpenSignal]);

  // Real heights of atom cards. They grow with their content, so the stored height is only a minimum.
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});
  const nodeEls = useRef(new Map<string, HTMLElement>());
  const nodeObserver = useRef<ResizeObserver | null>(null);
  const nodeRefCache = useRef(new Map<string, (el: HTMLElement | null) => void>());
  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      setMeasuredHeights((prev) => {
        let next = prev;
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const id = el.dataset.nodeId;
          if (!id) continue;
          const h = el.offsetHeight;
          if (Math.abs((prev[id] ?? -1) - h) > 0.5) {
            if (next === prev) next = { ...prev };
            next[id] = h;
          }
        }
        return next;
      });
    });
    nodeObserver.current = ro;
    nodeEls.current.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, []);
  const nodeRef = (id: string) => {
    let cb = nodeRefCache.current.get(id);
    if (!cb) {
      cb = (el) => {
        if (el) {
          nodeEls.current.set(id, el);
          nodeObserver.current?.observe(el);
        } else {
          const old = nodeEls.current.get(id);
          if (old) nodeObserver.current?.unobserve(old);
          nodeEls.current.delete(id);
        }
      };
      nodeRefCache.current.set(id, cb);
    }
    return cb;
  };
  const nodeHeight = useCallback(
    (n: CanvasAtomNode) => measuredHeights[n.instanceId] ?? n.height ?? 100,
    [measuredHeights]
  );
  const eraserDidErase = useRef(false);
  const pendingFit = useRef(false);
  const initialPlacementDone = useRef(false);
  const textDirty = useRef(false);
  const fitRef = useRef<(maxZoom?: number) => void>(() => {});

  // Lookup map for fast atom resolution by atomId
  const atomsById = useMemo(() => {
    const map = new Map<string, ResearchAtom>();
    atoms.forEach((a) => map.set(a.id, a));
    return map;
  }, [atoms]);

  // Counts of atoms placed on canvas
  const placedAtomCounts = useMemo(() => {
    const counts = new Map<string, number>();
    nodes.forEach((n) => {
      counts.set(n.atomId, (counts.get(n.atomId) || 0) + 1);
    });
    return counts;
  }, [nodes]);

  // Record history snapshot helper
  const pushHistorySnapshot = useCallback((
    newNodes: CanvasAtomNode[],
    newFolders: CanvasFolder[],
    newShapes: CanvasShape[],
    newConnectors: CanvasConnector[],
    newDrawings: CanvasDrawingPath[]
  ) => {
    if (isHistoryAction.current) return;
    setHistory((prev) => {
      const slice = prev.slice(0, historyIndex + 1);
      const next = [
        ...slice,
        {
          nodes: newNodes,
          folders: newFolders,
          shapes: newShapes,
          connectors: newConnectors,
          drawings: newDrawings,
        },
      ];
      if (next.length > 30) next.shift();
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const prefs = usePrefs();
  // Load the canvas of the open project. A project with nothing saved starts empty.
  useEffect(() => {
    let data: CanvasData | null = null;
    try {
      const raw = prefs.get(canvasStorageKey);
      if (raw) data = JSON.parse(raw);
    } catch {}

    const loaded = {
      nodes: data?.nodes || [],
      folders: data?.folders || [],
      shapes: data?.shapes || [],
      connectors: data?.connectors || [],
      drawings: data?.drawings || [],
    };
    setNodes(loaded.nodes);
    setFolders(loaded.folders);
    setShapes(loaded.shapes);
    setConnectors(loaded.connectors);
    setDrawings(loaded.drawings);
    setHistory([loaded]);
    setHistoryIndex(0);
    setSelectedIds(new Set());
    setEditingItemId(null);
    setMeasuredHeights({});
    initialPlacementDone.current = !!data;
    pendingFit.current = true;
  }, [canvasStorageKey, projectId]);

  // First visit: put the first clips on the canvas once this project's clips have arrived.
  useEffect(() => {
    if (initialPlacementDone.current) return;
    const own = atoms.filter((a) => projectId === 'all' || a.projectId === projectId);
    if (own.length === 0) return;
    initialPlacementDone.current = true;
    const initialNodes: CanvasAtomNode[] = own.slice(0, 6).map((atom, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      return {
        instanceId: `inst-${atom.id}-${Date.now()}-${idx}`,
        atomId: atom.id,
        x: CANVAS_CENTER_X - 520 + col * 380,
        y: CANVAS_CENTER_Y - 260 + row * 240,
        width: 340,
        mode: 'compact',
      };
    });
    setNodes(initialNodes);
    setHistory([{ nodes: initialNodes, folders: [], shapes: [], connectors: [], drawings: [] }]);
    setHistoryIndex(0);
    pendingFit.current = true;
  }, [atoms, projectId, canvasStorageKey]);

  // Auto-Save Canvas with Debounce per project
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        const data: CanvasData = {
          id: projectId,
          name: project?.title || 'Canvas',
          nodes,
          folders,
          shapes,
          connectors,
          drawings,
        };
        prefs.set(canvasStorageKey, JSON.stringify(data));
      } catch {}
    }, 400);
    return () => clearTimeout(timeout);
  }, [nodes, folders, shapes, connectors, drawings, canvasStorageKey, projectId, project?.title]);

  // Center initial viewport on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: rect.width / 2 - CANVAS_CENTER_X * zoom,
        y: rect.height / 2 - CANVAS_CENTER_Y * zoom,
      });
    }
  }, []);

  // UNDO & REDO actions
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isHistoryAction.current = true;
      const prev = history[historyIndex - 1];
      setNodes(prev.nodes);
      setFolders(prev.folders);
      setShapes(prev.shapes);
      setConnectors(prev.connectors);
      setDrawings(prev.drawings);
      setHistoryIndex(historyIndex - 1);
      setTimeout(() => { isHistoryAction.current = false; }, 50);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isHistoryAction.current = true;
      const next = history[historyIndex + 1];
      setNodes(next.nodes);
      setFolders(next.folders);
      setShapes(next.shapes);
      setConnectors(next.connectors);
      setDrawings(next.drawings);
      setHistoryIndex(historyIndex + 1);
      setTimeout(() => { isHistoryAction.current = false; }, 50);
    }
  }, [history, historyIndex]);

  // Stacking: every shape and atom has a z value. A missing value falls back to the old order
  // (shapes in the order they were made, then atoms), so canvases saved earlier look the same.
  const zById = useMemo(() => {
    const map: Record<string, number> = {};
    shapes.forEach((sh, i) => (map[sh.id] = sh.zIndex ?? 10 + i));
    nodes.forEach((n, i) => (map[n.instanceId] = n.zIndex ?? 10 + shapes.length + i));
    return map;
  }, [shapes, nodes]);
  const topZ = useCallback(() => Math.max(9, ...Object.values(zById)) + 1, [zById]);

  // Layer Reordering: Ctrl + [ (Send backward), Ctrl + ] (Bring forward)
  const handleLayerOrder = useCallback(
    (direction: 'backward' | 'forward') => {
      if (selectedIds.size === 0) return;
      const stack = [
        ...shapes.map((sh) => ({ id: sh.id, z: zById[sh.id] })),
        ...nodes.map((n) => ({ id: n.instanceId, z: zById[n.instanceId] })),
      ]
        .sort((a, b) => a.z - b.z)
        .map((i) => i.id);

      if (direction === 'forward') {
        for (let i = stack.length - 2; i >= 0; i--) {
          if (selectedIds.has(stack[i]) && !selectedIds.has(stack[i + 1])) [stack[i], stack[i + 1]] = [stack[i + 1], stack[i]];
        }
      } else {
        for (let i = 1; i < stack.length; i++) {
          if (selectedIds.has(stack[i]) && !selectedIds.has(stack[i - 1])) [stack[i], stack[i - 1]] = [stack[i - 1], stack[i]];
        }
      }

      const z = new Map(stack.map((id, i) => [id, 10 + i]));
      const nextShapes = shapes.map((sh) => ({ ...sh, zIndex: z.get(sh.id) }));
      const nextNodes = nodes.map((n) => ({ ...n, zIndex: z.get(n.instanceId) }));
      setShapes(nextShapes);
      setNodes(nextNodes);
      pushHistorySnapshot(nextNodes, folders, nextShapes, connectors, drawings);
    },
    [selectedIds, shapes, nodes, folders, connectors, drawings, zById, pushHistorySnapshot]
  );

  // Keyboard Shortcuts: tools, Space to pan, Undo/Redo, Delete, arrows to nudge, Layering, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }
      const mod = e.ctrlKey || e.metaKey;

      if (e.code === 'Space') {
        if (target.tagName !== 'BUTTON') e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      } else if (mod && e.key === '[') {
        e.preventDefault();
        handleLayerOrder('backward');
      } else if (mod && e.key === ']') {
        e.preventDefault();
        handleLayerOrder('forward');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnectorId) {
          e.preventDefault();
          const next = connectors.filter((c) => c.id !== selectedConnectorId);
          setConnectors(next);
          pushHistorySnapshot(nodes, folders, shapes, next, drawings);
          setSelectedConnectorId(null);
        } else if (selectedIds.size > 0) {
          e.preventDefault();
          const nextNodes = nodes.filter((n) => !selectedIds.has(n.instanceId));
          const nextFolders = folders.filter((f) => !selectedIds.has(f.id));
          const nextShapes = shapes.filter((s) => !selectedIds.has(s.id));
          const nextConnectors = connectors.filter((c) => !selectedIds.has(c.fromId) && !selectedIds.has(c.toId) && !selectedIds.has(c.id));
          setNodes(nextNodes);
          setFolders(nextFolders);
          setShapes(nextShapes);
          setConnectors(nextConnectors);
          pushHistorySnapshot(nextNodes, nextFolders, nextShapes, nextConnectors, drawings);
          setSelectedIds(new Set());
        }
      } else if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        setSelectedIds(new Set());
        setConnectingFrom(null);
        setSelectedConnectorId(null);
        setEditingItemId(null);
        setIsShapeMenuOpen(false);
        setActiveTool('pointer');
      } else if (!mod && !e.altKey && e.key.startsWith('Arrow') && selectedIds.size > 0) {
        // Nudge the selection: 1 px, or 10 px with Shift
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const nextNodes = nodes.map((n) => (selectedIds.has(n.instanceId) ? { ...n, x: n.x + dx, y: n.y + dy } : n));
        const nextFolders = folders.map((f) => (selectedIds.has(f.id) ? { ...f, x: f.x + dx, y: f.y + dy } : f));
        const nextShapes = shapes.map((s) => (selectedIds.has(s.id) ? { ...s, x: s.x + dx, y: s.y + dy } : s));
        setNodes(nextNodes);
        setFolders(nextFolders);
        setShapes(nextShapes);
        pushHistorySnapshot(nextNodes, nextFolders, nextShapes, connectors, drawings);
      } else if (!mod && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'v') setActiveTool('pointer');
        else if (k === 'h') setActiveTool('hand');
        else if (k === 'c') setActiveTool('connect');
        else if (k === 's') setActiveTool('sticky');
        else if (k === 't') setActiveTool('text');
        else if (k === 'p') setActiveTool('pen');
        else if (k === 'e') setActiveTool('eraser');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isFullscreen, selectedIds, selectedConnectorId, nodes, folders, shapes, connectors, drawings, handleUndo, handleRedo, handleLayerOrder, pushHistorySnapshot]);

  // Trigger temporary minimap visibility on zoom (shows only while zooming)
  const triggerZoomMinimap = useCallback(() => {
    setIsZooming(true);
    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    zoomTimerRef.current = setTimeout(() => {
      setIsZooming(false);
    }, 400);
  }, []);

  // Zoom the view around a point (coordinates are relative to the canvas element)
  const zoomAt = useCallback(
    (nextZoom: number, anchorX: number, anchorY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const z = Math.min(Math.max(nextZoom, 0.15), 2.5);
      const newPanX = anchorX - (anchorX - pan.x) * (z / zoom);
      const newPanY = anchorY - (anchorY - pan.y) * (z / zoom);
      setZoom(z);
      setPan({
        x: Math.max(-CANVAS_WIDTH * z + 400, Math.min(rect.width - 200, newPanX)),
        y: Math.max(-CANVAS_HEIGHT * z + 300, Math.min(rect.height - 150, newPanY)),
      });
      triggerZoomMinimap();
    },
    [zoom, pan, triggerZoomMinimap]
  );

  // The zoom buttons zoom around the middle of the view
  const zoomByButton = (delta: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    zoomAt(zoom + delta, rect.width / 2, rect.height / 2);
  };

  // Wheel: Ctrl, Alt or Cmd zooms, plain wheel pans. This is a native listener because React's onWheel
  // is passive and cannot stop the browser from zooming the whole page.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('[data-canvas-no-wheel]')) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      if (e.altKey || e.ctrlKey || e.metaKey) {
        zoomAt(zoom * (e.deltaY < 0 ? 1.12 : 0.88), e.clientX - rect.left, e.clientY - rect.top);
      } else {
        setPan((prev) => ({ x: prev.x - e.deltaX * 0.9, y: prev.y - e.deltaY * 0.9 }));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, zoomAt]);

  // Helper to convert screen client coords to canvas coordinates
  const clientToCanvas = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Section containment checking
  const isContainedInFolder = (x: number, y: number, folder: CanvasFolder) => {
    return (
      x >= folder.x &&
      x <= folder.x + folder.width &&
      y >= folder.y &&
      y <= folder.y + folder.height
    );
  };

  const getContainedEntities = useCallback((folder: CanvasFolder) => {
    const containedNodes = nodes
      .filter((n) => isContainedInFolder(n.x + (n.width || 340) / 2, n.y + nodeHeight(n) / 2, folder))
      .map((n) => n.instanceId);

    const containedShapes = shapes
      .filter((s) => isContainedInFolder(s.x + s.width / 2, s.y + s.height / 2, folder))
      .map((s) => s.id);

    const containedFolders = folders
      .filter((f) => f.id !== folder.id && isContainedInFolder(f.x + f.width / 2, f.y + f.height / 2, folder))
      .map((f) => f.id);

    return { containedNodes, containedShapes, containedFolders };
  }, [nodes, shapes, folders, nodeHeight]);

  // The box of any canvas item: where it is, how big, and how far it is turned
  const getItemBox = useCallback(
    (entityId: string): (Box & { kind: 'node' | 'shape' | 'folder' }) | null => {
      const node = nodes.find((n) => n.instanceId === entityId);
      if (node) return { kind: 'node', x: node.x, y: node.y, width: node.width || 340, height: nodeHeight(node), rotation: node.rotation || 0 };
      const folder = folders.find((f) => f.id === entityId);
      if (folder) return { kind: 'folder', x: folder.x, y: folder.y, width: folder.width, height: folder.height, rotation: 0 };
      const shape = shapes.find((sh) => sh.id === entityId);
      if (shape) return { kind: 'shape', x: shape.x, y: shape.y, width: shape.width, height: shape.height, rotation: shape.rotation || 0 };
      return null;
    },
    [nodes, folders, shapes, nodeHeight]
  );

  // Helper to get port position for any canvas item (follows rotation)
  const getPortCoordinates = useCallback(
    (entityId: string, port: 'top' | 'bottom' | 'left' | 'right' = 'right') => {
      const box = getItemBox(entityId);
      return box ? portPoint(box, port) : null;
    },
    [getItemBox]
  );

  // Handle Drag Atom from Drawer onto Canvas
  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    const atomId = e.dataTransfer.getData('researchie/atomId') || draggingAtomId;
    if (!atomId) return;

    const { x, y } = clientToCanvas(e.clientX, e.clientY);
    const newInstance: CanvasAtomNode = {
      instanceId: `inst-${atomId}-${Date.now()}`,
      atomId,
      x: x - 170,
      y: y - 50,
      width: 340,
      mode: 'compact',
      zIndex: topZ(),
    };

    const nextNodes = [...nodes, newInstance];
    setNodes(nextNodes);
    pushHistorySnapshot(nextNodes, folders, shapes, connectors, drawings);
    setSelectedIds(new Set([newInstance.instanceId]));
    setDraggingAtomId(null);
  };

  // Add Atom via Button in Drawer
  const handleAddAtomToCanvas = (atomId: string) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { x, y } = clientToCanvas(rect.left + rect.width / 2, rect.top + rect.height / 2);

    const offset = (nodes.length % 5) * 30;
    const newInstance: CanvasAtomNode = {
      instanceId: `inst-${atomId}-${Date.now()}`,
      atomId,
      x: x - 170 + offset,
      y: y - 50 + offset,
      width: 340,
      mode: 'compact',
      zIndex: topZ(),
    };

    const nextNodes = [...nodes, newInstance];
    setNodes(nextNodes);
    pushHistorySnapshot(nextNodes, folders, shapes, connectors, drawings);
    setSelectedIds(new Set([newInstance.instanceId]));
  };

  // Ends a text edit. The text is already saved as it is typed; this records one undo step.
  // Text that was left empty is removed, like in other design tools.
  const finishEditing = () => {
    if (editingItemId === null) return;
    const editing = shapes.find((sh) => sh.id === editingItemId);
    if (editing && editing.type === 'text' && editing.text.trim() === '') {
      const nextShapes = shapes.filter((sh) => sh.id !== editing.id);
      const nextConnectors = connectors.filter((c) => c.fromId !== editing.id && c.toId !== editing.id);
      setShapes(nextShapes);
      setConnectors(nextConnectors);
      pushHistorySnapshot(nodes, folders, nextShapes, nextConnectors, drawings);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(editing.id);
        return next;
      });
      textDirty.current = false;
    } else if (textDirty.current) {
      pushHistorySnapshot(nodes, folders, shapes, connectors, drawings);
      textDirty.current = false;
    }
    setEditingItemId(null);
  };

  // Creation of tools
  const handleCreateNewSection = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { x, y } = clientToCanvas(rect.left + rect.width / 2, rect.top + rect.height / 2);

    const colorObj = SECTION_COLORS[folders.length % SECTION_COLORS.length];
    const newFolder: CanvasFolder = {
      id: `folder-${Date.now()}`,
      title: `Section ${folders.length + 1}`,
      color: colorObj.border,
      x: x - 260,
      y: y - 220,
      width: 520,
      height: 440,
    };
    const nextFolders = [...folders, newFolder];
    setFolders(nextFolders);
    pushHistorySnapshot(nodes, nextFolders, shapes, connectors, drawings);
    setSelectedIds(new Set([newFolder.id]));
    setActiveTool('pointer');
  };

  const handleCreateShapeAt = (type: CanvasShapeType, canvasX?: number, canvasY?: number) => {
    const preset = SHAPE_FILL_PRESETS[shapes.length % SHAPE_FILL_PRESETS.length];
    let w = 220;
    let h = 130;
    let fontSize = 13;
    let colorClass = preset.bg;
    let strokeColor = preset.stroke;
    let strokeWidth = 2;

    if (type === 'sticky') {
      const sticky = STICKY_COLORS[shapes.length % STICKY_COLORS.length];
      w = 200;
      h = 160;
      fontSize = 14;
      colorClass = sticky.bg;
      strokeColor = STICKY_STROKES[sticky.name] || '#FACC15';
      strokeWidth = 1.5;
    } else if (type === 'text') {
      w = 240;
      h = 44;
      fontSize = 20;
      colorClass = 'bg-transparent';
      strokeColor = 'transparent';
      strokeWidth = 0;
    } else if (type === 'square' || type === 'circle') {
      w = 160;
      h = 160;
    } else if (type === 'ellipse') {
      h = 140;
    } else if (type === 'line') {
      w = 200;
      h = 24;
    } else if (type === 'arrow') {
      w = 200;
      h = 32;
    } else if (type === 'polygon') {
      w = 180;
      h = 160;
    } else if (type === 'star') {
      w = 180;
      h = 180;
    }

    let posX = canvasX;
    let posY = canvasY;
    if (posX === undefined || posY === undefined) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pt = clientToCanvas(rect.left + rect.width / 2, rect.top + rect.height / 2);
      posX = pt.x - w / 2;
      posY = pt.y - h / 2;
    }

    const newShape: CanvasShape = {
      id: `shape-${Date.now()}`,
      type,
      text: '',
      color: colorClass,
      strokeColor,
      strokeWidth,
      fontWeight: 'medium',
      fontSize,
      x: posX,
      y: posY,
      width: w,
      height: h,
      zIndex: topZ(),
    };

    const nextShapes = [...shapes, newShape];
    setShapes(nextShapes);
    pushHistorySnapshot(nodes, folders, nextShapes, connectors, drawings);
    setSelectedIds(new Set([newShape.id]));
    setActiveTool('pointer');
    setIsShapeMenuOpen(false);
    // Notes and text are made to be typed into: start typing at once.
    if (type === 'sticky' || type === 'text') setEditingItemId(newShape.id);
  };

  // Erase every drawing the pointer touches
  const eraseDrawingsAt = (pt: { x: number; y: number }) => {
    const radius = 12 / zoom + 4;
    setDrawings((prev) => {
      const next = prev.filter((d) => !strokeNear(d.points, pt, radius + d.strokeWidth / 2));
      if (next.length === prev.length) return prev;
      eraserDidErase.current = true;
      return next;
    });
  };

  // Canvas Mouse Down: Tool selection / Pan / Marquee / Draw
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // The toolbar, the drawer, the zoom bar and the like are not the canvas
    if (target.closest('[data-canvas-ui]')) return;
    const canvasPt = clientToCanvas(e.clientX, e.clientY);

    // Clicking away from a text being edited ends the edit
    finishEditing();

    // New notes and text are placed wherever you click
    // (preventDefault: otherwise the browser takes focus away from the text box that is about to open)
    if (activeTool === 'sticky') {
      e.preventDefault();
      handleCreateShapeAt('sticky', canvasPt.x - 100, canvasPt.y - 80);
      return;
    }
    if (activeTool === 'text') {
      e.preventDefault();
      handleCreateShapeAt('text', canvasPt.x - 120, canvasPt.y - 22);
      return;
    }

    // Drawing tools work on top of anything
    if (activeTool === 'pen' || activeTool === 'highlighter') {
      const isPen = activeTool === 'pen';
      setActiveDrawing({
        id: `draw-${Date.now()}`,
        tool: activeTool,
        points: [canvasPt],
        color: isPen ? penColor : highlighterColor,
        strokeWidth: isPen ? penThickness : highlighterThickness,
      });
      return;
    }

    // Eraser: rub out drawings (items are erased by clicking them)
    if (activeTool === 'eraser') {
      eraseDrawingsAt(canvasPt);
      return;
    }

    const isBackground =
      isSpacePressed ||
      activeTool === 'hand' ||
      target === containerRef.current ||
      target.tagName === 'svg' ||
      target.classList.contains('canvas-background-plane');

    if (!isBackground) return;

    if (isSpacePressed || activeTool === 'hand') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else {
      // Start Marquee Selection Box
      setDragState({
        type: 'marquee',
        startCanvasX: canvasPt.x,
        startCanvasY: canvasPt.y,
        currentCanvasX: canvasPt.x,
        currentCanvasY: canvasPt.y,
      });
      if (!e.shiftKey) {
        setSelectedIds(new Set());
      }
    }

    setSelectedConnectorId(null);
    setConnectingFrom(null);
    setIsShapeMenuOpen(false);
  };

  // Mouse Move: Dragging, Resizing, Rotating, Marquee, Drawing, Connectors
  const handleMouseMove = (e: Pick<MouseEvent, 'clientX' | 'clientY' | 'buttons' | 'shiftKey'>) => {
    if (!containerRef.current) return;
    const canvasPt = clientToCanvas(e.clientX, e.clientY);
    if (connectingFrom) setMouseCanvasPos(canvasPt);

    // Pan Viewport
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
      return;
    }

    // Active Drawing Path
    if (activeDrawing) {
      setActiveDrawing((prev) => {
        if (!prev) return null;
        const last = prev.points[prev.points.length - 1];
        if (last && Math.hypot(last.x - canvasPt.x, last.y - canvasPt.y) < 1 / zoom) return prev;
        return { ...prev, points: [...prev.points, canvasPt] };
      });
      return;
    }

    // Eraser Tool Drag
    if (activeTool === 'eraser' && e.buttons === 1) {
      eraseDrawingsAt(canvasPt);
    }

    if (!dragState) return;

    // Marquee Selection Box Drag
    if (dragState.type === 'marquee') {
      setDragState({
        ...dragState,
        currentCanvasX: canvasPt.x,
        currentCanvasY: canvasPt.y,
      });

      const minX = Math.min(dragState.startCanvasX, canvasPt.x);
      const maxX = Math.max(dragState.startCanvasX, canvasPt.x);
      const minY = Math.min(dragState.startCanvasY, canvasPt.y);
      const maxY = Math.max(dragState.startCanvasY, canvasPt.y);
      const hits = (b: Box) => {
        const bb = boxBounds(b);
        return bb.maxX >= minX && bb.minX <= maxX && bb.maxY >= minY && bb.minY <= maxY;
      };

      const matched = new Set<string>();
      nodes.forEach((n) => {
        if (hits({ x: n.x, y: n.y, width: n.width || 340, height: nodeHeight(n), rotation: n.rotation })) matched.add(n.instanceId);
      });
      shapes.forEach((sh) => {
        if (hits(sh)) matched.add(sh.id);
      });
      folders.forEach((f) => {
        if (hits(f)) matched.add(f.id);
      });
      setSelectedIds(matched);
      return;
    }

    // Item Move Drag
    if (dragState.type === 'item') {
      const dist = Math.hypot(e.clientX - dragState.startClientX, e.clientY - dragState.startClientY);
      if (!dragState.isDragging && dist < DRAG_THRESHOLD) {
        return;
      }

      if (!dragState.isDragging) {
        setDragState({ ...dragState, isDragging: true });
      }

      const deltaX = (e.clientX - dragState.startClientX) / zoom;
      const deltaY = (e.clientY - dragState.startClientY) / zoom;
      const starts = dragState.startPositions;

      setNodes((prev) => prev.map((n) => (starts[n.instanceId] ? { ...n, x: starts[n.instanceId].x + deltaX, y: starts[n.instanceId].y + deltaY } : n)));
      setShapes((prev) => prev.map((sh) => (starts[sh.id] ? { ...sh, x: starts[sh.id].x + deltaX, y: starts[sh.id].y + deltaY } : sh)));
      setFolders((prev) => prev.map((f) => (starts[f.id] ? { ...f, x: starts[f.id].x + deltaX, y: starts[f.id].y + deltaY } : f)));
      return;
    }

    // 8-Way Resizing: the opposite side stays put, also when the item is turned
    if (dragState.type === 'resize') {
      const deltaX = (e.clientX - dragState.startClientX) / zoom;
      const deltaY = (e.clientY - dragState.startClientY) / zoom;
      const corner = dragState.direction.length === 2;

      const shape = dragState.itemType === 'shape' ? shapes.find((sh) => sh.id === dragState.id) : undefined;
      const isText = shape?.type === 'text';
      const isLine = shape?.type === 'line' || shape?.type === 'arrow';
      const min =
        dragState.itemType === 'node'
          ? MIN_SIZE.node
          : dragState.itemType === 'folder'
            ? MIN_SIZE.folder
            : isText
              ? MIN_SIZE.text
              : isLine
                ? MIN_SIZE.line
                : MIN_SIZE.shape;

      const next = resizeBox(
        {
          x: dragState.initialX,
          y: dragState.initialY,
          width: dragState.initialW,
          height: dragState.initialH,
          rotation: dragState.initialRotation,
        },
        dragState.direction,
        deltaX,
        deltaY,
        // Shift keeps the shape of any item; text always scales as a whole from a corner
        { minWidth: min.width, minHeight: min.height, keepAspect: corner && (e.shiftKey || isText) }
      );

      if (dragState.itemType === 'node') {
        setNodes((prev) => prev.map((n) => (n.instanceId === dragState.id ? { ...n, x: next.x, y: next.y, width: next.width, height: next.height } : n)));
      } else if (dragState.itemType === 'shape') {
        const scale = dragState.initialH > 0 ? next.height / dragState.initialH : 1;
        setShapes((prev) =>
          prev.map((sh) =>
            sh.id === dragState.id
              ? {
                  ...sh,
                  x: next.x,
                  y: next.y,
                  width: next.width,
                  height: next.height,
                  fontSize: isText && corner ? Math.min(240, Math.max(8, Math.round(dragState.initialFontSize * scale))) : sh.fontSize,
                }
              : sh
          )
        );
      } else {
        setFolders((prev) => prev.map((f) => (f.id === dragState.id ? { ...f, x: next.x, y: next.y, width: next.width, height: next.height } : f)));
      }
      return;
    }

    // Rotating around the centre of the item
    if (dragState.type === 'rotate') {
      const angle = angleFrom({ x: dragState.centerX, y: dragState.centerY }, canvasPt);
      let rotation = normalizeAngle(dragState.initialRotation + (angle - dragState.startAngle));
      if (e.shiftKey) rotation = snapAngle(rotation, 15);
      rotation = Math.round(rotation * 10) / 10;
      if (dragState.itemType === 'node') {
        setNodes((prev) => prev.map((n) => (n.instanceId === dragState.id ? { ...n, rotation } : n)));
      } else {
        setShapes((prev) => prev.map((sh) => (sh.id === dragState.id ? { ...sh, rotation } : sh)));
      }
    }
  };

  // Mouse Up: Commit actions & Push History
  const handleMouseUp = () => {
    setIsPanning(false);

    // Commit active drawing
    if (activeDrawing && activeDrawing.points.length > 1) {
      const nextDrawings = [...drawings, activeDrawing];
      setDrawings(nextDrawings);
      pushHistorySnapshot(nodes, folders, shapes, connectors, nextDrawings);
      setActiveDrawing(null);
    } else if (activeDrawing) {
      setActiveDrawing(null);
    }

    // Rubbed-out drawings are one undo step
    if (eraserDidErase.current) {
      eraserDidErase.current = false;
      pushHistorySnapshot(nodes, folders, shapes, connectors, drawings);
    }

    // Commit drag/resize/rotate movement
    if (dragState) {
      if (dragState.type === 'item' && dragState.isDragging) {
        pushHistorySnapshot(nodes, folders, shapes, connectors, drawings);
      } else if (dragState.type === 'resize' || dragState.type === 'rotate') {
        pushHistorySnapshot(nodes, folders, shapes, connectors, drawings);
      }
      setDragState(null);
    }

    // Connectors drop
    if (connectingFrom && hoveredPortTarget && connectingFrom.id !== hoveredPortTarget.id) {
      const newConn: CanvasConnector = {
        id: `conn-${Date.now()}`,
        fromId: connectingFrom.id,
        toId: hoveredPortTarget.id,
        fromPort: connectingFrom.port,
        toPort: hoveredPortTarget.port,
        style: 'curved',
        lineType: 'solid',
        hasArrow: true,
        color: '#325FEC',
      };
      const nextConnectors = [...connectors, newConn];
      setConnectors(nextConnectors);
      pushHistorySnapshot(nodes, folders, shapes, nextConnectors, drawings);
      setConnectingFrom(null);
      setHoveredPortTarget(null);
    } else if (connectingFrom) {
      setConnectingFrom(null);
      setHoveredPortTarget(null);
    }
  };

  // Always call the latest handlers from the window listeners
  const moveRef = useRef(handleMouseMove);
  const upRef = useRef(handleMouseUp);
  moveRef.current = handleMouseMove;
  upRef.current = handleMouseUp;
  useEffect(() => {
    const move = (e: MouseEvent) => moveRef.current(e);
    const up = () => upRef.current();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);

  // Generic Item Mouse Down for Dragging / Selection
  const handleItemMouseDown = (
    e: React.MouseEvent,
    id: string,
    itemType: 'node' | 'shape' | 'folder'
  ) => {
    if (e.button !== 0) return;
    // Panning, drawing and placing notes or text also work on top of items: the canvas handles those.
    if (
      isSpacePressed ||
      activeTool === 'hand' ||
      activeTool === 'pen' ||
      activeTool === 'highlighter' ||
      activeTool === 'sticky' ||
      activeTool === 'text'
    ) {
      return;
    }
    e.stopPropagation();
    if (activeTool === 'connect') return;
    if (editingItemId && editingItemId !== id) finishEditing();

    if (activeTool === 'eraser') {
      const nextNodes = itemType === 'node' ? nodes.filter((n) => n.instanceId !== id) : nodes;
      const nextShapes = itemType === 'shape' ? shapes.filter((sh) => sh.id !== id) : shapes;
      const nextFolders = itemType === 'folder' ? folders.filter((f) => f.id !== id) : folders;
      const nextConnectors = connectors.filter((c) => c.fromId !== id && c.toId !== id);
      setNodes(nextNodes);
      setShapes(nextShapes);
      setFolders(nextFolders);
      setConnectors(nextConnectors);
      pushHistorySnapshot(nextNodes, nextFolders, nextShapes, nextConnectors, drawings);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }

    let nextSelected = new Set(selectedIds);
    if (e.shiftKey) {
      if (nextSelected.has(id)) nextSelected.delete(id);
      else nextSelected.add(id);
    } else {
      if (!selectedIds.has(id)) {
        nextSelected = new Set([id]);
      }
    }
    setSelectedIds(nextSelected);

    const startPositions: Record<string, { x: number; y: number }> = {};
    nextSelected.forEach((selId) => {
      const n = nodes.find((node) => node.instanceId === selId);
      if (n) startPositions[selId] = { x: n.x, y: n.y };
      const sh = shapes.find((shape) => shape.id === selId);
      if (sh) startPositions[selId] = { x: sh.x, y: sh.y };
      const f = folders.find((folder) => folder.id === selId);
      if (f) startPositions[selId] = { x: f.x, y: f.y };
    });

    let containedNodeIds: string[] = [];
    let containedShapeIds: string[] = [];
    let containedFolderIds: string[] = [];

    // Moving a section moves what is inside it
    if (itemType === 'folder') {
      const folder = folders.find((f) => f.id === id);
      if (folder) {
        const contained = getContainedEntities(folder);
        containedNodeIds = contained.containedNodes;
        containedShapeIds = contained.containedShapes;
        containedFolderIds = contained.containedFolders;

        containedNodeIds.forEach((nid) => {
          const n = nodes.find((node) => node.instanceId === nid);
          if (n && !startPositions[nid]) startPositions[nid] = { x: n.x, y: n.y };
        });
        containedShapeIds.forEach((sid) => {
          const sh = shapes.find((shape) => shape.id === sid);
          if (sh && !startPositions[sid]) startPositions[sid] = { x: sh.x, y: sh.y };
        });
        containedFolderIds.forEach((fid) => {
          const f = folders.find((fol) => fol.id === fid);
          if (f && !startPositions[fid]) startPositions[fid] = { x: f.x, y: f.y };
        });
      }
    }

    setDragState({
      type: 'item',
      id,
      itemType,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPositions,
      containedNodeIds,
      containedShapeIds,
      containedFolderIds,
      isDragging: false,
    });
  };

  // Start 8-way resize from a handle of the selected item
  const handleResizeHandleMouseDown = (
    e: React.MouseEvent,
    id: string,
    itemType: 'node' | 'shape' | 'folder',
    direction: ResizeDirection
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const box = getItemBox(id);
    if (!box) return;
    const shape = shapes.find((sh) => sh.id === id);
    setDragState({
      type: 'resize',
      id,
      itemType,
      direction,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialX: box.x,
      initialY: box.y,
      initialW: box.width,
      initialH: box.height,
      initialRotation: box.rotation || 0,
      initialFontSize: shape?.fontSize ?? 12,
    });
  };

  // Start turning the selected item from its rotate handle
  const handleRotateHandleMouseDown = (e: React.MouseEvent, id: string, itemType: 'node' | 'shape') => {
    e.stopPropagation();
    e.preventDefault();
    const box = getItemBox(id);
    if (!box) return;
    const center = boxCenter(box);
    const pt = clientToCanvas(e.clientX, e.clientY);
    setDragState({
      type: 'rotate',
      id,
      itemType,
      centerX: center.x,
      centerY: center.y,
      startAngle: angleFrom(center, pt),
      initialRotation: box.rotation || 0,
    });
  };

  // Fit to Screen: everything in view, in the part of the canvas the atom drawer does not cover
  const handleFitToScreen = useCallback(
    (maxZoom = 1.5) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const inset = isDrawerOpen ? DRAWER_WIDTH : 0;
      const availW = Math.max(200, rect.width - inset);

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const add = (b: Box) => {
        const bb = boxBounds(b);
        minX = Math.min(minX, bb.minX);
        minY = Math.min(minY, bb.minY);
        maxX = Math.max(maxX, bb.maxX);
        maxY = Math.max(maxY, bb.maxY);
      };
      nodes.forEach((n) => add({ x: n.x, y: n.y, width: n.width || 340, height: nodeHeight(n), rotation: n.rotation }));
      shapes.forEach((sh) => add(sh));
      folders.forEach((f) => add(f));
      drawings.forEach((d) => d.points.forEach((p) => add({ x: p.x, y: p.y, width: 0, height: 0 })));

      if (minX === Infinity) {
        setZoom(0.85);
        setPan({
          x: inset + availW / 2 - CANVAS_CENTER_X * 0.85,
          y: rect.height / 2 - CANVAS_CENTER_Y * 0.85,
        });
        return;
      }

      const padding = 120;
      const contentW = Math.max(maxX - minX, 1);
      const contentH = Math.max(maxY - minY, 1);
      const fitZoom = Math.min(
        Math.max(Math.min((availW - padding) / contentW, (rect.height - padding) / contentH), 0.2),
        maxZoom
      );

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      setZoom(fitZoom);
      setPan({
        x: inset + availW / 2 - centerX * fitZoom,
        y: rect.height / 2 - centerY * fitZoom,
      });
      triggerZoomMinimap();
    },
    [nodes, shapes, folders, drawings, isDrawerOpen, nodeHeight, triggerZoomMinimap]
  );
  fitRef.current = handleFitToScreen;

  // After a project loads, bring its content into view once the cards have been measured
  useEffect(() => {
    if (!pendingFit.current) return;
    pendingFit.current = false;
    setTimeout(() => fitRef.current(1), 140);
  }, [nodes, shapes, folders]);

  // Fullscreen Canvas Toggle: Only toggle fullscreen and collapse side panels, no zoom change
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next) {
        setIsDrawerOpen(false);
        if (onToggleSidebar && !isSidebarCollapsed) {
          onToggleSidebar();
        }
      }
      return next;
    });
  };

  // Filter drawer atoms
  const filteredDrawerAtoms = useMemo(() => {
    return atoms.filter((atom) => {
      if (drawerFilter === 'placed' && !placedAtomCounts.has(atom.id)) return false;
      if (drawerFilter === 'unused' && placedAtomCounts.has(atom.id)) return false;
      if (drawerFilter !== 'all' && drawerFilter !== 'placed' && drawerFilter !== 'unused' && atom.type !== drawerFilter) {
        return false;
      }
      if (!drawerSearch) return true;
      const q = drawerSearch.toLowerCase();
      const text = (atom.content?.rawText || atom.content?.text || atom.title || '').toLowerCase();
      const tags = (atom.tags || []).join(' ').toLowerCase();
      return text.includes(q) || tags.includes(q);
    });
  }, [atoms, drawerFilter, drawerSearch, placedAtomCounts]);

  // The one selected shape or atom, for the properties bar
  const singleSelectedShape = useMemo(() => {
    if (selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0];
      return shapes.find((sh) => sh.id === id) || null;
    }
    return null;
  }, [selectedIds, shapes]);

  const singleSelectedNode = useMemo(() => {
    if (selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0];
      return nodes.find((n) => n.instanceId === id) || null;
    }
    return null;
  }, [selectedIds, nodes]);

  // Boxes of everything selected, for the outlines and handles drawn above the items
  const selectedBoxes = useMemo(() => {
    const out: Array<Box & { id: string; kind: 'node' | 'shape' | 'folder' }> = [];
    selectedIds.forEach((id) => {
      const b = getItemBox(id);
      if (b) out.push({ ...b, id });
    });
    return out;
  }, [selectedIds, getItemBox]);

  const setRotationOf = (id: string, kind: 'node' | 'shape', value: number) => {
    const rotation = Math.round(normalizeAngle(value) * 10) / 10;
    if (kind === 'node') setNodes((prev) => prev.map((n) => (n.instanceId === id ? { ...n, rotation } : n)));
    else setShapes((prev) => prev.map((sh) => (sh.id === id ? { ...sh, rotation } : sh)));
  };

  const updateShape = (id: string, patch: Partial<CanvasShape>, record = true) => {
    const next = shapes.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh));
    setShapes(next);
    if (record) pushHistorySnapshot(nodes, folders, next, connectors, drawings);
  };

  // Render SVG Shape Outline Helper (Figma's Basic Shape Set). Closed shapes are filled with a light
  // tint of their outline colour.
  const renderShapeSvg = (shape: CanvasShape) => {
    const w = shape.width;
    const h = shape.height;
    const stroke = shape.strokeColor || '#325FEC';
    const strokeW = shape.strokeWidth !== undefined ? shape.strokeWidth : 2;
    const inset = strokeW / 2;
    const fill = { fill: stroke, fillOpacity: 0.14 } as const;

    switch (shape.type) {
      case 'square':
        return <rect x={inset} y={inset} width={w - strokeW} height={h - strokeW} rx={0} stroke={stroke} strokeWidth={strokeW} {...fill} />;
      case 'circle':
        return <circle cx={w / 2} cy={h / 2} r={Math.max(Math.min(w, h) / 2 - inset, 1)} stroke={stroke} strokeWidth={strokeW} {...fill} />;
      case 'ellipse':
        return <ellipse cx={w / 2} cy={h / 2} rx={Math.max(w / 2 - inset, 1)} ry={Math.max(h / 2 - inset, 1)} stroke={stroke} strokeWidth={strokeW} {...fill} />;
      case 'line':
        return <line x1={inset} y1={h / 2} x2={w - inset} y2={h / 2} stroke={stroke} strokeWidth={Math.max(strokeW, 2)} strokeLinecap="round" />;
      case 'arrow': {
        const head = Math.min(14, w / 2);
        const sw = Math.max(strokeW, 2);
        return (
          <g>
            <line x1={inset} y1={h / 2} x2={w - head} y2={h / 2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
            <polygon points={`${w - inset},${h / 2} ${w - head - inset},${h / 2 - head / 2} ${w - head - inset},${h / 2 + head / 2}`} fill={stroke} />
          </g>
        );
      }
      case 'polygon': // Triangle
        return <polygon points={`${w / 2},${inset} ${w - inset},${h - inset} ${inset},${h - inset}`} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" {...fill} />;
      case 'star':
        return (
          <polygon
            points={`${w * 0.5},${h * 0.05} ${w * 0.62},${h * 0.38} ${w * 0.98},${h * 0.38} ${w * 0.69},${h * 0.58} ${w * 0.8},${h * 0.92} ${w * 0.5},${h * 0.72} ${w * 0.2},${h * 0.92} ${w * 0.31},${h * 0.58} ${w * 0.02},${h * 0.38} ${w * 0.38},${h * 0.38}`}
            stroke={stroke}
            strokeWidth={strokeW}
            strokeLinejoin="round"
            {...fill}
          />
        );
      case 'rectangle':
      default:
        return <rect x={inset} y={inset} width={w - strokeW} height={h - strokeW} rx={8} stroke={stroke} strokeWidth={strokeW} {...fill} />;
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDownCanvas}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropOnCanvas}
      className={`relative w-full h-full overflow-clip select-none font-sans bg-[#FAFBFD] dark:bg-[#09090B] ${
        isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : ''
      } ${
        isSpacePressed || activeTool === 'hand' || isPanning
          ? 'cursor-grab active:cursor-grabbing'
          : activeTool === 'connect'
          ? 'cursor-crosshair'
          : activeTool === 'pen' || activeTool === 'highlighter'
          ? 'cursor-crosshair'
          : activeTool === 'eraser'
          ? 'cursor-cell'
          : activeTool === 'pointer'
          ? 'cursor-crosshair'
          : 'cursor-default'
      }`}
    >
      {/* 1. COLLAPSIBLE ATOM SIDE DRAWER WITH OVERSCROLL CONTAINMENT */}
      <div
        data-canvas-no-wheel
        data-canvas-ui
        className={`absolute top-0 left-0 bottom-0 z-40 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border-r border-[#D2DCEA] dark:border-[#27272A] shadow-2xl transition-all duration-300 flex flex-col overscroll-contain ${
          isDrawerOpen ? 'w-80 translate-x-0' : 'w-80 -translate-x-full pointer-events-none'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-3.5 border-b border-[#D2DCEA] dark:border-[#27272A] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <SquaresFour size={18} weight="bold" className="text-[#325FEC] dark:text-[#518FFF]" />
            <span className="text-xs font-display font-bold text-[#0F172A] dark:text-zinc-100">
              Project Atoms
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-50 dark:bg-blue-950/50 text-[#325FEC] dark:text-[#518FFF] font-semibold border border-blue-200 dark:border-blue-800/40">
              {atoms.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-[#EEF3F8] dark:hover:bg-[#1E1E22] transition-colors"
            title="Collapse Drawer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Drawer Search & Filter */}
        <div className="p-3 border-b border-[#D2DCEA] dark:border-[#27272A] space-y-2 flex-shrink-0">
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-2.5 top-2.5 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={drawerSearch}
              onChange={(e) => setDrawerSearch(e.target.value)}
              placeholder="Search atoms..."
              className="w-full bg-[#FAFBFD] dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-[#0F172A] dark:text-zinc-200 placeholder-slate-400 outline-none focus:border-[#325FEC]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px] font-medium scrollbar-none">
            {[
              { id: 'all', label: 'All' },
              { id: 'unused', label: 'Unused' },
              { id: 'placed', label: 'On Canvas' },
              { id: 'quote', label: 'Quotes' },
              { id: 'block', label: 'Blocks' },
              { id: 'image', label: 'Images' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDrawerFilter(f.id)}
                className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${
                  drawerFilter === f.id
                    ? 'bg-[#325FEC] text-white font-semibold'
                    : 'bg-[#EEF3F8] dark:bg-[#1C1C20] text-slate-600 dark:text-zinc-400 hover:text-[#0F172A]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Atoms List with Isolated Scroll */}
        <div 
          className="flex-1 overflow-y-auto p-3 space-y-2.5 overscroll-contain"
        >
          {filteredDrawerAtoms.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 dark:text-zinc-500">
              No matching atoms found.
            </div>
          ) : (
            filteredDrawerAtoms.map((atom) => {
              const placedCount = placedAtomCounts.get(atom.id) || 0;
              const textSnippet = atom.content?.rawText || atom.content?.text || atom.content?.description || atom.title || '';

              return (
                <div
                  key={atom.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingAtomId(atom.id);
                    e.dataTransfer.setData('researchie/atomId', atom.id);
                  }}
                  className="group relative p-2.5 rounded-xl border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:border-[#325FEC] hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-mono font-semibold uppercase border ${getAtomTypeSemanticStyle(atom.type)}`}>
                      <span>{atom.type}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      {placedCount > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                          <Check size={9} weight="bold" />
                          <span>Placed ({placedCount})</span>
                        </span>
                      ) : (
                        <span className="text-[9.5px] font-mono text-slate-400 dark:text-zinc-500">
                          Unused
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAddAtomToCanvas(atom.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded bg-[#EEF3F8] dark:bg-[#25252A] hover:bg-[#325FEC] hover:text-white text-[#325FEC] transition-all"
                        title="Add to canvas center"
                      >
                        <Plus size={10} weight="bold" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11.5px] text-[#0F172A] dark:text-zinc-200 line-clamp-2 leading-relaxed">
                    {textSnippet}
                  </p>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#0E0E10] text-[10.5px] text-slate-500 dark:text-zinc-400 flex items-center justify-between flex-shrink-0">
          <span>Drag card onto canvas to drop</span>
          <ArrowRight size={12} className="text-[#325FEC]" />
        </div>
      </div>

      {/* Drawer Toggle Trigger */}
      {!isDrawerOpen && (
        <button
          type="button"
          data-canvas-ui
          onClick={() => setIsDrawerOpen(true)}
          className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-[#D2DCEA] dark:border-[#27272A] shadow-md hover:border-[#325FEC] text-xs font-semibold text-[#0F172A] dark:text-zinc-200 transition-all"
          title="Open Atom Drawer"
        >
          <SidebarSimple size={15} weight="bold" className="text-[#325FEC] dark:text-[#518FFF]" />
          <span>Atoms ({atoms.length})</span>
        </button>
      )}

      {/* 2. BOTTOM ROW: zoom bar on the left, tools in the space that is left */}
      <div
        className={`absolute bottom-5 right-5 z-40 flex items-end gap-3 pointer-events-none transition-all duration-300 ${
          isDrawerOpen ? 'left-[336px]' : 'left-5'
        } ${showMinimap || isZooming ? 'pr-[188px]' : ''}`}
      >
      {/* 10. FLOATING BOTTOM HUD (ZOOM, FIT, SIDEBAR, FULLSCREEN) */}
      <div
        data-canvas-ui
        className="pointer-events-auto flex-shrink-0 flex items-center gap-1.5 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-[#D2DCEA] dark:border-[#27272A] rounded-xl p-1.5 shadow-xl text-xs font-mono text-slate-700 dark:text-zinc-300"
      >
        <button
          type="button"
          onClick={() => zoomByButton(0.15)}
          className="p-1.5 rounded-lg hover:bg-[#EEF3F8] dark:hover:bg-[#25252A] transition-colors"
          title="Zoom In"
        >
          <Plus size={14} />
        </button>
        <span className="px-1 text-[11px] font-semibold min-w-[36px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomByButton(-0.15)}
          className="p-1.5 rounded-lg hover:bg-[#EEF3F8] dark:hover:bg-[#25252A] transition-colors"
          title="Zoom Out"
        >
          <Minus size={14} />
        </button>

        <div className="h-4 w-px bg-[#D2DCEA] dark:bg-[#27272A] mx-0.5" />

        <button
          type="button"
          onClick={() => handleFitToScreen()}
          className="p-1.5 rounded-lg hover:bg-[#EEF3F8] dark:hover:bg-[#25252A] transition-colors"
          title="Fit to Screen"
        >
          <ArrowsOut size={14} />
        </button>

        <button
          type="button"
          onClick={() => {
            if (onToggleSidebar) onToggleSidebar();
          }}
          className={`p-1.5 rounded-lg transition-colors ${
            isSidebarCollapsed ? 'hover:bg-[#EEF3F8] dark:hover:bg-[#25252A] text-slate-400' : 'hover:bg-[#EEF3F8] dark:hover:bg-[#25252A] text-[#325FEC]'
          }`}
          title={isSidebarCollapsed ? 'Expand Project Sidebar' : 'Collapse Project Sidebar'}
        >
          <SidebarSimple size={14} />
        </button>

        <div className="h-4 w-px bg-[#D2DCEA] dark:bg-[#27272A] mx-0.5" />

        <button
          type="button"
          onClick={toggleFullscreen}
          className={`p-1.5 rounded-lg transition-colors ${
            isFullscreen ? 'bg-[#325FEC] text-white' : 'hover:bg-[#EEF3F8] dark:hover:bg-[#25252A]'
          }`}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <CornersIn size={14} /> : <CornersOut size={14} />}
        </button>

        <div className="h-4 w-px bg-[#D2DCEA] dark:bg-[#27272A] mx-0.5" />

        <button
          type="button"
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          className="p-1.5 rounded-lg hover:bg-[#EEF3F8] dark:hover:bg-[#25252A] transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          title="Undo (Ctrl+Z)"
        >
          <ArrowCounterClockwise size={14} />
        </button>
        <button
          type="button"
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1}
          className="p-1.5 rounded-lg hover:bg-[#EEF3F8] dark:hover:bg-[#25252A] transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          title="Redo (Ctrl+Shift+Z)"
        >
          <ArrowClockwise size={14} />
        </button>
      </div>

        <div className="flex-1 min-w-0 flex justify-center pointer-events-none">
      {/* 2. BOTTOM TOOLBAR: POSITIONED AT BOTTOM OF CANVAS (FIGMA BASIC SHAPES, PEN SIZE DROPDOWN WITH SPACING) */}
      <div data-canvas-ui className="pointer-events-auto max-w-full flex flex-wrap items-center justify-center gap-1.5 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-[#D2DCEA] dark:border-[#27272A] rounded-2xl px-2.5 py-1.5 shadow-2xl text-xs font-sans">
        
        {/* GROUP 1: NAVIGATION & POINTER */}
        <div className="flex items-center gap-0.5 pr-1 border-r border-[#D2DCEA] dark:border-[#27272A]">
          <button
            type="button"
            onClick={() => setActiveTool('pointer')}
            className={`p-2 rounded-xl transition-colors ${
              activeTool === 'pointer' && !isSpacePressed
                ? 'bg-[#325FEC] text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] hover:bg-[#EEF3F8] dark:hover:bg-[#25252A]'
            }`}
            title="Select & Move (V) - Crosshair cursor for drag-selecting"
          >
            <Cursor size={15} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('hand')}
            className={`p-2 rounded-xl transition-colors ${
              activeTool === 'hand' || isSpacePressed
                ? 'bg-[#325FEC] text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] hover:bg-[#EEF3F8] dark:hover:bg-[#25252A]'
            }`}
            title="Pan Canvas (H or Spacebar)"
          >
            <HandGrabbing size={15} weight="bold" />
          </button>
        </div>

        {/* GROUP 2: CONNECTION MODE (SEPARATE FROM RESIZE/SELECT) */}
        <div className="flex items-center gap-0.5 px-1 border-r border-[#D2DCEA] dark:border-[#27272A]">
          <button
            type="button"
            onClick={() => setActiveTool('connect')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-medium transition-colors ${
              activeTool === 'connect'
                ? 'bg-[#325FEC] text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] hover:bg-[#EEF3F8] dark:hover:bg-[#25252A]'
            }`}
            title="Connection Mode (C) - Drag between card ports without clashing with resize handles"
          >
            <LineSegment size={15} weight="bold" />
            <span className="text-[11px]">Connect</span>
          </button>
        </div>

        {/* GROUP 3: CREATION (SECTIONS, STICKY, TEXT, FIGMA BASIC SHAPES) */}
        <div className="flex items-center gap-0.5 px-1 border-r border-[#D2DCEA] dark:border-[#27272A]">
          <button
            type="button"
            onClick={handleCreateNewSection}
            className="p-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] hover:bg-[#EEF3F8] dark:hover:bg-[#25252A] transition-colors"
            title="Create Section / Group"
          >
            <FrameCorners size={15} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('sticky')}
            className={`p-2 rounded-xl transition-colors ${
              activeTool === 'sticky'
                ? 'bg-[#325FEC] text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] hover:bg-[#EEF3F8] dark:hover:bg-[#25252A]'
            }`}
            title="Sticky Note (S)"
          >
            <Sticker size={15} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('text')}
            className={`p-2 rounded-xl transition-colors ${
              activeTool === 'text'
                ? 'bg-[#325FEC] text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] hover:bg-[#EEF3F8] dark:hover:bg-[#25252A]'
            }`}
            title="Text Box (T)"
          >
            <TextT size={15} weight="bold" />
          </button>

          {/* FIGMA BASIC SHAPES DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsShapeMenuOpen(!isShapeMenuOpen)}
              className={`flex items-center gap-1 p-2 rounded-xl transition-colors ${
                isShapeMenuOpen || activeTool === 'shape'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-[#325FEC] dark:text-[#518FFF]'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] hover:bg-[#EEF3F8] dark:hover:bg-[#25252A]'
              }`}
              title="Figma Basic Shapes"
            >
              <Square size={15} weight="bold" />
              <CaretDown size={10} />
            </button>

            {isShapeMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] rounded-2xl shadow-2xl p-1.5 z-50 grid grid-cols-1 gap-1 animate-popIn">
                {FIGMA_BASIC_SHAPES.map((sh) => (
                  <button
                    key={sh.type}
                    type="button"
                    onClick={() => handleCreateShapeAt(sh.type)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#EEF3F8] dark:hover:bg-[#242428] text-slate-700 dark:text-zinc-200 text-xs font-medium text-left transition-colors"
                  >
                    <span className="w-4 h-4 flex items-center justify-center text-[#325FEC]">
                      {sh.type === 'circle' || sh.type === 'ellipse' ? (
                        <Circle size={13} weight="bold" />
                      ) : sh.type === 'polygon' ? (
                        <Polygon size={13} weight="bold" />
                      ) : sh.type === 'star' ? (
                        <Star size={13} weight="bold" />
                      ) : sh.type === 'line' ? (
                        <LineSegment size={13} weight="bold" />
                      ) : sh.type === 'arrow' ? (
                        <ArrowRight size={13} weight="bold" />
                      ) : (
                        <Square size={13} weight="bold" />
                      )}
                    </span>
                    <span className="truncate">{sh.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* GROUP 4: FREEHAND DRAWING (PEN WITH THICKNESS DROPDOWN & SPACING, HIGHLIGHTER, ERASER) */}
        <div className="flex items-center gap-1.5 px-1">
          {/* Pen Tool with Size Dropdown and Proper Spacing to Color Swatches */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTool('pen')}
              className={`p-2 rounded-xl transition-colors ${
                activeTool === 'pen'
                  ? 'bg-[#325FEC] text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] hover:bg-[#EEF3F8] dark:hover:bg-[#25252A]'
              }`}
              title="Freehand Pen (P) - Draws on top of atoms"
            >
              <PaintBrush size={15} weight="bold" />
            </button>
            {activeTool === 'pen' && (
              <div className="flex items-center gap-2.5 pl-1">
                {/* Size Dropdown Selector */}
                <select
                  value={penThickness}
                  onChange={(e) => setPenThickness(Number(e.target.value))}
                  className="bg-[#FAFBFD] dark:bg-[#242428] border border-[#D2DCEA] dark:border-[#27272A] rounded-lg px-2 py-1 text-xs text-[#0F172A] dark:text-zinc-200 outline-none focus:border-[#325FEC] cursor-pointer"
                  title="Pen Stroke Thickness"
                >
                  <option value={2}>2px</option>
                  <option value={4}>4px</option>
                  <option value={8}>8px</option>
                  <option value={14}>14px</option>
                </select>

                {/* Spaced Color Palette */}
                <div className="flex items-center gap-1.5 pl-1.5 border-l border-[#D2DCEA] dark:border-[#27272A]">
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPenColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-4 h-4 rounded-full border border-black/20 transition-transform ${
                        penColor === c ? 'ring-2 ring-[#325FEC] scale-110' : 'hover:scale-105'
                      }`}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Highlighter Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('highlighter')}
            className={`p-2 rounded-xl transition-colors ${
              activeTool === 'highlighter'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] hover:bg-[#EEF3F8] dark:hover:bg-[#25252A]'
            }`}
            title="Highlighter - Semi-transparent ink"
          >
            <PencilSimple size={15} weight="bold" />
          </button>
          {activeTool === 'highlighter' && (
            <div className="flex items-center gap-2.5 pl-1">
              <select
                value={highlighterThickness}
                onChange={(e) => setHighlighterThickness(Number(e.target.value))}
                className="bg-[#FAFBFD] dark:bg-[#242428] border border-[#D2DCEA] dark:border-[#27272A] rounded-lg px-2 py-1 text-xs text-[#0F172A] dark:text-zinc-200 outline-none focus:border-[#325FEC] cursor-pointer"
                title="Highlighter Thickness"
              >
                {HIGHLIGHTER_THICKNESSES.map((t) => (
                  <option key={t} value={t}>
                    {t}px
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-[#D2DCEA] dark:border-[#27272A]">
                {HIGHLIGHTER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setHighlighterColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-4 h-4 rounded-full border border-black/20 transition-transform ${
                      highlighterColor === c ? 'ring-2 ring-[#325FEC] scale-110' : 'hover:scale-105'
                    }`}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Eraser Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            className={`p-2 rounded-xl transition-colors ${
              activeTool === 'eraser'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] hover:bg-[#EEF3F8] dark:hover:bg-[#25252A]'
            }`}
            title="Eraser (E) - Click or drag over drawings or items to delete"
          >
            <Eraser size={15} weight="bold" />
          </button>
        </div>

      </div>

        </div>
      </div>

      {/* 3. PROPERTIES OF THE SELECTED SHAPE, NOTE, TEXT OR ATOM */}
      {(singleSelectedShape || singleSelectedNode) && editingItemId === null && activeTool === 'pointer' && (
        <div data-canvas-ui className="absolute bottom-[78px] left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-[#D2DCEA] dark:border-[#27272A] rounded-2xl px-3 py-1.5 shadow-xl text-xs font-sans text-slate-700 dark:text-zinc-300">
          {singleSelectedShape && (
            <>
              {/* Colour */}
              <div className="flex items-center gap-1.5" aria-label="Colour">
                {singleSelectedShape.type === 'sticky'
                  ? STICKY_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        title={`${c.name} note`}
                        onClick={() => updateShape(singleSelectedShape.id, { color: c.bg, strokeColor: STICKY_STROKES[c.name] })}
                        style={{ backgroundColor: STICKY_STROKES[c.name] }}
                        className={`w-4 h-4 rounded-full border border-black/20 transition-transform ${
                          singleSelectedShape.strokeColor === STICKY_STROKES[c.name] ? 'ring-2 ring-[#325FEC] scale-110' : 'hover:scale-105'
                        }`}
                      />
                    ))
                  : singleSelectedShape.type === 'text'
                    ? [undefined, '#325FEC', '#10B981', '#F59E0B', '#EF4444'].map((c) => (
                        <button
                          key={c || 'default'}
                          type="button"
                          title={c ? `Text colour ${c}` : 'Default text colour'}
                          onClick={() => updateShape(singleSelectedShape.id, { textColor: c })}
                          style={{ backgroundColor: c || '#64748B' }}
                          className={`w-4 h-4 rounded-full border border-black/20 transition-transform ${
                            (singleSelectedShape.textColor || undefined) === c ? 'ring-2 ring-[#325FEC] scale-110' : 'hover:scale-105'
                          }`}
                        />
                      ))
                    : SHAPE_FILL_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          title={p.name}
                          onClick={() => updateShape(singleSelectedShape.id, { strokeColor: p.stroke, color: p.bg })}
                          style={{ backgroundColor: p.stroke }}
                          className={`w-4 h-4 rounded-full border border-black/20 transition-transform ${
                            singleSelectedShape.strokeColor === p.stroke ? 'ring-2 ring-[#325FEC] scale-110' : 'hover:scale-105'
                          }`}
                        />
                      ))}
              </div>

              {/* Text: weight and size */}
              {singleSelectedShape.type !== 'line' && singleSelectedShape.type !== 'arrow' && (
                <>
                  <div className="flex items-center gap-0.5 pl-3 border-l border-[#D2DCEA] dark:border-[#27272A]" aria-label="Text weight">
                    {(['normal', 'medium', 'semibold', 'bold'] as const).map((w) => (
                      <button
                        key={w}
                        type="button"
                        title={w}
                        onClick={() => updateShape(singleSelectedShape.id, { fontWeight: w })}
                        className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                          w === 'bold' ? 'font-bold' : w === 'semibold' ? 'font-semibold' : w === 'medium' ? 'font-medium' : 'font-normal'
                        } ${
                          singleSelectedShape.fontWeight === w
                            ? 'bg-[#325FEC] text-white'
                            : 'hover:bg-[#EEF3F8] dark:hover:bg-[#25252A]'
                        }`}
                      >
                        Aa
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1" aria-label="Text size">
                    <button
                      type="button"
                      title="Smaller text"
                      onClick={() => updateShape(singleSelectedShape.id, { fontSize: Math.max(8, (singleSelectedShape.fontSize ?? 12) - 1) })}
                      className="p-1 rounded hover:bg-[#EEF3F8] dark:hover:bg-[#25252A]"
                    >
                      <Minus size={11} weight="bold" />
                    </button>
                    <span className="w-6 text-center font-mono text-[11px]">{singleSelectedShape.fontSize ?? 12}</span>
                    <button
                      type="button"
                      title="Larger text"
                      onClick={() => updateShape(singleSelectedShape.id, { fontSize: Math.min(240, (singleSelectedShape.fontSize ?? 12) + 1) })}
                      className="p-1 rounded hover:bg-[#EEF3F8] dark:hover:bg-[#25252A]"
                    >
                      <Plus size={11} weight="bold" />
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {singleSelectedNode ? (
            <button
              type="button"
              title="Remove from canvas (the clip stays in the timeline)"
              onClick={() => {
                const id = singleSelectedNode.instanceId;
                const nextNodes = nodes.filter((n) => n.instanceId !== id);
                const nextConnectors = connectors.filter((c) => c.fromId !== id && c.toId !== id);
                setNodes(nextNodes);
                setConnectors(nextConnectors);
                setSelectedIds(new Set());
                pushHistorySnapshot(nextNodes, folders, shapes, nextConnectors, drawings);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-[11px]"
            >
              <Trash size={12} />
              <span>Remove</span>
            </button>
          ) : null}

          {singleSelectedNode?.height ? (
            <button
              type="button"
              title="Let the card grow with its content again"
              onClick={() => {
                const next = nodes.map((n) => (n.instanceId === singleSelectedNode.instanceId ? { ...n, height: undefined } : n));
                setNodes(next);
                pushHistorySnapshot(next, folders, shapes, connectors, drawings);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#EEF3F8] dark:hover:bg-[#25252A] text-[11px]"
            >
              <ArrowsDownUp size={12} />
              <span>Auto height</span>
            </button>
          ) : null}

          {/* Rotation */}
          <label className="flex items-center gap-1.5 pl-3 border-l border-[#D2DCEA] dark:border-[#27272A]">
            <ArrowsClockwise size={12} className="text-slate-400" />
            <input
              type="number"
              min={-180}
              max={180}
              step={1}
              aria-label="Rotation in degrees"
              value={Math.round((singleSelectedShape?.rotation ?? singleSelectedNode?.rotation ?? 0) * 10) / 10}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isNaN(v)) return;
                if (singleSelectedShape) setRotationOf(singleSelectedShape.id, 'shape', v);
                else if (singleSelectedNode) setRotationOf(singleSelectedNode.instanceId, 'node', v);
              }}
              onBlur={() => pushHistorySnapshot(nodes, folders, shapes, connectors, drawings)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                e.stopPropagation();
              }}
              className="w-14 bg-[#FAFBFD] dark:bg-[#242428] border border-[#D2DCEA] dark:border-[#27272A] rounded-lg px-1.5 py-0.5 text-xs font-mono outline-none focus:border-[#325FEC]"
            />
            <span className="text-slate-400">°</span>
            <button
              type="button"
              title="Reset rotation"
              onClick={() => {
                if (singleSelectedShape) setRotationOf(singleSelectedShape.id, 'shape', 0);
                else if (singleSelectedNode) setRotationOf(singleSelectedNode.instanceId, 'node', 0);
                window.setTimeout(() => pushHistorySnapshot(nodes, folders, shapes, connectors, drawings), 0);
              }}
              className="p-1 rounded hover:bg-[#EEF3F8] dark:hover:bg-[#25252A]"
            >
              <ArrowCounterClockwise size={12} />
            </button>
          </label>
        </div>
      )}

      {/* 4. INFINITE TRANSFORM CONTAINER */}
      <div
        className="canvas-background-plane absolute inset-0 origin-top-left pointer-events-auto"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
        }}
      >
        {/* Infinite Dot Grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, #94A3B8 1px, transparent 1px)`,
            backgroundSize: `24px 24px`,
          }}
        />

        {/* SVG LAYER: CONNECTORS & WIRE */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px`, zIndex: 5 }}
        >
          <defs>
            <marker id="arrowhead-blue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#325FEC" />
            </marker>
            <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#518FFF" />
            </marker>
          </defs>

          {/* RENDER CONNECTORS */}
          {connectors.map((conn) => {
            const startPt = getPortCoordinates(conn.fromId, conn.fromPort || 'right');
            const endPt = getPortCoordinates(conn.toId, conn.toPort || 'left');
            if (!startPt || !endPt) return null;

            const isSelected = selectedConnectorId === conn.id;
            const dx = Math.abs(endPt.x - startPt.x) * 0.5;
            const dy = Math.abs(endPt.y - startPt.y) * 0.5;
            const dist = Math.max(dx, dy, 50);

            let cp1x = startPt.x, cp1y = startPt.y;
            let cp2x = endPt.x, cp2y = endPt.y;

            if (conn.fromPort === 'right') cp1x += dist;
            if (conn.fromPort === 'left') cp1x -= dist;
            if (conn.fromPort === 'bottom') cp1y += dist;
            if (conn.fromPort === 'top') cp1y -= dist;

            if (conn.toPort === 'right') cp2x += dist;
            if (conn.toPort === 'left') cp2x -= dist;
            if (conn.toPort === 'bottom') cp2y += dist;
            if (conn.toPort === 'top') cp2y -= dist;

            const d =
              conn.style === 'straight'
                ? `M ${startPt.x} ${startPt.y} L ${endPt.x} ${endPt.y}`
                : `M ${startPt.x} ${startPt.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endPt.x} ${endPt.y}`;

            return (
              <g key={conn.id} className="cursor-pointer pointer-events-auto">
                <path
                  d={d}
                  stroke="transparent"
                  strokeWidth="18"
                  fill="none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedConnectorId(conn.id);
                  }}
                />
                <path
                  d={d}
                  stroke={isSelected ? '#518FFF' : conn.color || '#325FEC'}
                  strokeWidth={isSelected ? '3.5' : '2'}
                  strokeDasharray={conn.lineType === 'dashed' ? '6,5' : undefined}
                  fill="none"
                  markerEnd="url(#arrowhead-blue)"
                  className="transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedConnectorId(conn.id);
                  }}
                />
                {isSelected && (
                  <foreignObject
                    x={(startPt.x + endPt.x) / 2 - 14}
                    y={(startPt.y + endPt.y) / 2 - 14}
                    width="28"
                    height="28"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConnectors((prev) => {
                          const next = prev.filter((c) => c.id !== conn.id);
                          pushHistorySnapshot(nodes, folders, shapes, next, drawings);
                          return next;
                        });
                        setSelectedConnectorId(null);
                      }}
                      className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg hover:bg-rose-600 cursor-pointer pointer-events-auto"
                      title="Delete Connector (Backspace)"
                    >
                      <Trash size={13} weight="bold" />
                    </button>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* ACTIVE DRAGGING WIRE */}
          {connectingFrom && (
            <path
              d={`M ${
                getPortCoordinates(connectingFrom.id, connectingFrom.port)?.x || 0
              } ${
                getPortCoordinates(connectingFrom.id, connectingFrom.port)?.y || 0
              } L ${mouseCanvasPos.x} ${mouseCanvasPos.y}`}
              stroke="#518FFF"
              strokeWidth="2.5"
              strokeDasharray="5,5"
              fill="none"
              markerEnd="url(#arrowhead-active)"
            />
          )}
        </svg>

        {/* 5. SECTIONS: an outline and a name, nothing inside */}
        {folders.map((folder) => {
          const isSelected = selectedIds.has(folder.id);
          const borderClass = (folder.color || '').split(' ').find((c) => c.startsWith('border-')) || 'border-slate-500/50';
          const grab = (e: React.MouseEvent) => handleItemMouseDown(e, folder.id, 'folder');
          const frame: React.CSSProperties = {
            transform: `translate(${folder.x}px, ${folder.y}px)`,
            width: `${folder.width}px`,
            height: `${folder.height}px`,
          };

          return (
            <React.Fragment key={folder.id}>
              {/* The outline, behind everything. Nothing is painted inside it. */}
              <div
                data-testid="canvas-section"
                style={{ ...frame, zIndex: 1 }}
                className={`absolute pointer-events-none rounded-3xl border-2 ${isSelected ? 'border-[#325FEC]' : borderClass}`}
              />

              {/* What can be grabbed: the edges, the name and the ports. They sit above the items so nothing hides them,
                  and the empty inside stays clickable for what is behind it. */}
              <div data-testid="canvas-section-chrome" style={{ ...frame, zIndex: 3000 }} className="absolute pointer-events-none">
                <div onMouseDown={grab} className="absolute -top-2 left-4 right-4 h-4 pointer-events-auto cursor-move" />
                <div onMouseDown={grab} className="absolute -bottom-2 left-4 right-4 h-4 pointer-events-auto cursor-move" />
                <div onMouseDown={grab} className="absolute -left-2 top-4 bottom-4 w-4 pointer-events-auto cursor-move" />
                <div onMouseDown={grab} className="absolute -right-2 top-4 bottom-4 w-4 pointer-events-auto cursor-move" />

                <div className="absolute left-3 bottom-full mb-1.5 pointer-events-auto">
                  {editingItemId === folder.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={folder.title}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => {
                        textDirty.current = true;
                        const title = e.target.value;
                        setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, title } : f)));
                      }}
                      onBlur={() => {
                        if (!folder.title.trim()) {
                          setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, title: 'Untitled Section' } : f)));
                        }
                        finishEditing();
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                        e.stopPropagation();
                      }}
                      className="bg-white dark:bg-[#18181B] text-xs font-semibold px-2 py-0.5 rounded border border-[#325FEC] outline-none text-[#0F172A] dark:text-zinc-100"
                    />
                  ) : (
                    <span
                      onMouseDown={grab}
                      onDoubleClick={() => setEditingItemId(folder.id)}
                      className="block whitespace-nowrap text-xs font-display font-semibold text-slate-600 dark:text-zinc-300 cursor-move select-none"
                      title="Double click to rename"
                    >
                      {folder.title}
                    </span>
                  )}
                </div>

              </div>
            </React.Fragment>
          );
        })}

        {/* 6. SHAPES, STICKY NOTES AND TEXT */}
        {shapes.map((shape) => {
          const canHoldText = shape.type !== 'line' && shape.type !== 'arrow';
          const isEditing = editingItemId === shape.id;
          const rotation = shape.rotation || 0;
          const weightClass =
            shape.fontWeight === 'bold'
              ? 'font-bold'
              : shape.fontWeight === 'semibold'
                ? 'font-semibold'
                : shape.fontWeight === 'medium'
                  ? 'font-medium'
                  : 'font-normal';
          const textStyle: React.CSSProperties = {
            fontSize: shape.fontSize ?? 12,
            color: shape.textColor && shape.textColor !== '#0F172A' ? shape.textColor : undefined,
          };
          const placeholder = shape.type === 'sticky' ? 'Write note here...' : shape.type === 'text' ? 'Text' : '';

          return (
            <div
              key={shape.id}
              data-testid="canvas-shape"
              data-shape-id={shape.id}
              data-shape-type={shape.type}
              onMouseDown={(e) => handleItemMouseDown(e, shape.id, 'shape')}
              onDoubleClick={() => {
                if (!canHoldText || activeTool !== 'pointer') return;
                setSelectedIds(new Set([shape.id]));
                setEditingItemId(shape.id);
              }}
              style={{
                transform: `translate(${shape.x}px, ${shape.y}px) rotate(${rotation}deg)`,
                transformOrigin: 'center',
                width: `${shape.width}px`,
                height: `${shape.height}px`,
                zIndex: zById[shape.id],
              }}
              className="absolute pointer-events-auto group/shape flex items-center justify-center"
            >
              {/* Outline of the shape */}
              {shape.type !== 'sticky' && shape.type !== 'text' && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  {renderShapeSvg(shape)}
                </svg>
              )}

              {/* Text inside the shape */}
              <div
                style={{ ...textStyle, borderColor: shape.type === 'sticky' ? shape.strokeColor : undefined }}
                className={`relative z-10 p-3 w-full h-full flex items-center justify-center text-center leading-snug break-words text-slate-900 dark:text-zinc-100 ${weightClass} ${
                  shape.type === 'sticky' ? 'border rounded-2xl shadow-md ' + shape.color : ''
                }`}
              >
                {isEditing ? (
                  <textarea
                    autoFocus
                    value={shape.text}
                    placeholder={placeholder}
                    onFocus={(e) => {
                      const el = e.currentTarget;
                      el.setSelectionRange(el.value.length, el.value.length);
                    }}
                    onChange={(e) => {
                      textDirty.current = true;
                      const text = e.target.value;
                      setShapes((prev) => prev.map((sh) => (sh.id === shape.id ? { ...sh, text } : sh)));
                    }}
                    onBlur={finishEditing}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                      e.stopPropagation();
                    }}
                    className="w-full h-full bg-transparent resize-none outline-none text-center placeholder:opacity-40"
                  />
                ) : shape.text ? (
                  <div className="w-full whitespace-pre-wrap select-none">{shape.text}</div>
                ) : placeholder ? (
                  <span className="opacity-40 italic select-none">{placeholder}</span>
                ) : null}
              </div>

            </div>
          );
        })}

        {/* 7. ATOM CARDS */}
        {nodes.map((node) => {
          const atom = atomsById.get(node.atomId);
          if (!atom) return null;

          const isQuote = atom.type === 'quote' || atom.type === 'text';
          const isImage = atom.type === 'image';
          const rawQuote = atom.content?.rawText || atom.content?.text || '';
          const cardWidth = node.width || 340;
          const source = atom.metadata?.sourceUrl;

          return (
            <div
              key={node.instanceId}
              ref={nodeRef(node.instanceId)}
              data-testid="canvas-atom"
              data-node-id={node.instanceId}
              onMouseDown={(e) => handleItemMouseDown(e, node.instanceId, 'node')}
              style={{
                transform: `translate(${node.x}px, ${node.y}px) rotate(${node.rotation || 0}deg)`,
                transformOrigin: 'center',
                width: `${cardWidth}px`,
                height: node.height ? `${node.height}px` : undefined,
                zIndex: zById[node.instanceId],
              }}
              className="absolute pointer-events-auto rounded-2xl border shadow-lg group/atom flex flex-col bg-white dark:bg-[#18181B] border-[#D2DCEA] dark:border-[#27272A]"
            >
              <div className="flex-1 min-h-0 overflow-hidden rounded-2xl p-3.5 flex flex-col justify-between">
                <div>
                  {isQuote && rawQuote && (
                    <blockquote className="text-[12.5px] leading-relaxed text-[#0F172A] dark:text-[#E4E4E7] font-normal border-l-2 border-[#325FEC] pl-2.5 py-0.5">
                      "{semanticHighlightText(rawQuote)}"
                    </blockquote>
                  )}

                  {atom.type === 'note' && (
                    <p className="text-[12.5px] leading-relaxed text-[#0F172A] dark:text-zinc-200 line-clamp-3">
                      {atom.content?.markdownContent || atom.content?.text || atom.content?.description || ''}
                    </p>
                  )}

                  {isImage && (atom.content?.imageUrl || (atom.content as any)?.targetUrl) && (
                    <div className="rounded-lg overflow-hidden border border-[#D2DCEA] dark:border-[#27272A] my-1">
                      <img
                        src={atom.content?.imageUrl || (atom.content as any)?.targetUrl}
                        alt={atom.title || 'Image clip'}
                        draggable={false}
                        className="w-full max-h-36 object-cover"
                      />
                    </div>
                  )}

                  {/* Source label */}
                  <div className="pt-2 text-[10px] font-mono text-slate-400 dark:text-zinc-500 truncate">
                    {atom.metadata?.pageTitle || (source ? source.replace(/^https?:\/\//, '').split('/')[0] : 'source')}
                  </div>
                </div>
              </div>

            </div>
          );
        })}

        {/* 8. FREEHAND DRAWINGS ON TOP OF ATOMS (Higher Z-Index: 30) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px`, zIndex: 4000 }}
        >
          {drawings.map((d) => {
            if (d.points.length < 2) return null;
            const pathData = d.points.reduce((acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
            return (
              <path
                key={d.id}
                d={pathData}
                stroke={d.color}
                strokeWidth={d.strokeWidth}
                strokeOpacity={d.tool === 'highlighter' ? '0.35' : '1'}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            );
          })}
          {activeDrawing && activeDrawing.points.length > 1 && (
            <path
              d={activeDrawing.points.reduce((acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '')}
              stroke={activeDrawing.color}
              strokeWidth={activeDrawing.strokeWidth}
              strokeOpacity={activeDrawing.tool === 'highlighter' ? '0.35' : '1'}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </svg>

        {/* 9. SELECTION: outlines, size handles and the rotate handle, above everything */}
        {activeTool !== 'connect' &&
          selectedBoxes.map((box) => {
            const single = selectedBoxes.length === 1 && editingItemId !== box.id;
            const rotation = box.rotation || 0;
            const hs = 11 / zoom;
            const bw = 1.5 / zoom;
            const handles: Array<{ dir: ResizeDirection; left: string; top: string }> = [
              { dir: 'nw', left: '0%', top: '0%' },
              { dir: 'n', left: '50%', top: '0%' },
              { dir: 'ne', left: '100%', top: '0%' },
              { dir: 'e', left: '100%', top: '50%' },
              { dir: 'se', left: '100%', top: '100%' },
              { dir: 's', left: '50%', top: '100%' },
              { dir: 'sw', left: '0%', top: '100%' },
              { dir: 'w', left: '0%', top: '50%' },
            ];
            const rotating = dragState?.type === 'rotate' && dragState.id === box.id;

            return (
              <div
                key={`sel-${box.id}`}
                className="absolute pointer-events-none"
                style={{
                  transform: `translate(${box.x}px, ${box.y}px) rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                  width: box.width,
                  height: box.height,
                  zIndex: 5000,
                }}
              >
                <div
                  className="absolute inset-0 border-[#325FEC]"
                  style={{ borderWidth: bw * 1.3, borderStyle: single ? 'solid' : 'dashed' }}
                />
                {single &&
                  handles.map((hd) => (
                    <div
                      key={hd.dir}
                      data-handle={hd.dir}
                      onMouseDown={(e) => handleResizeHandleMouseDown(e, box.id, box.kind, hd.dir)}
                      style={{
                        left: hd.left,
                        top: hd.top,
                        width: hs,
                        height: hs,
                        borderWidth: bw * 1.3,
                        transform: 'translate(-50%, -50%)',
                        cursor: resizeCursor(hd.dir, rotation),
                      }}
                      className="absolute pointer-events-auto bg-white border-solid border-[#325FEC] rounded-[2px]"
                    />
                  ))}
                {single && box.kind !== 'folder' && (
                  <>
                    <div
                      className="absolute bg-[#325FEC]"
                      style={{ left: '50%', top: -ROTATE_HANDLE_OFFSET / zoom, width: bw, height: ROTATE_HANDLE_OFFSET / zoom, transform: 'translateX(-50%)' }}
                    />
                    <div
                      data-handle="rotate"
                      title="Rotate (hold Shift to snap to 15°)"
                      onMouseDown={(e) => handleRotateHandleMouseDown(e, box.id, box.kind as 'node' | 'shape')}
                      style={{
                        left: '50%',
                        top: -ROTATE_HANDLE_OFFSET / zoom,
                        width: hs * 1.3,
                        height: hs * 1.3,
                        borderWidth: bw * 1.3,
                        transform: 'translate(-50%, -50%)',
                        cursor: 'grab',
                      }}
                      className="absolute pointer-events-auto bg-white border-solid border-[#325FEC] rounded-full"
                    />
                    {rotating && (
                      <div
                        className="absolute left-1/2 whitespace-nowrap rounded bg-[#325FEC] text-white font-mono"
                        style={{
                          top: -(ROTATE_HANDLE_OFFSET + 26) / zoom,
                          transform: `translateX(-50%) rotate(${-rotation}deg)`,
                          fontSize: 11 / zoom,
                          padding: `${2 / zoom}px ${6 / zoom}px`,
                        }}
                      >
                        {Math.round(rotation)}°
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

        {/* 9b. CONNECTION PORTS: in their own layer above everything, so no card can cover one */}
        {(activeTool === 'connect' || connectingFrom !== null) &&
          [...nodes.filter((n) => atomsById.has(n.atomId)).map((n) => n.instanceId), ...shapes.map((sh) => sh.id), ...folders.map((f) => f.id)].map((id) => {
            const box = getItemBox(id);
            if (!box) return null;
            return (['top', 'bottom', 'left', 'right'] as const).map((port) => {
              const p = portPoint(box, port);
              return (
                <button
                  key={`${id}-${port}`}
                  type="button"
                  data-port={`${id}:${port}`}
                  title={`Connect ${port}`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setConnectingFrom({ id, port });
                  }}
                  onMouseEnter={() => setHoveredPortTarget({ id, port })}
                  onMouseLeave={() => setHoveredPortTarget(null)}
                  style={{
                    left: p.x,
                    top: p.y,
                    width: 16 / zoom,
                    height: 16 / zoom,
                    borderWidth: 2 / zoom,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 5200,
                  }}
                  className="absolute rounded-full border-solid bg-white dark:bg-[#18181B] border-[#325FEC] flex items-center justify-center cursor-crosshair hover:scale-125 transition-transform"
                >
                  <span style={{ width: 6 / zoom, height: 6 / zoom }} className="rounded-full bg-[#325FEC]" />
                </button>
              );
            });
          })}

        {/* 10. MARQUEE SELECTION BOX */}
        {dragState && dragState.type === 'marquee' && (
          <div
            style={{
              left: `${Math.min(dragState.startCanvasX, dragState.currentCanvasX)}px`,
              top: `${Math.min(dragState.startCanvasY, dragState.currentCanvasY)}px`,
              width: `${Math.abs(dragState.currentCanvasX - dragState.startCanvasX)}px`,
              height: `${Math.abs(dragState.currentCanvasY - dragState.startCanvasY)}px`,
              zIndex: 6000,
            }}
            className="absolute border border-[#325FEC] bg-[#325FEC]/15 pointer-events-none rounded-xs"
          />
        )}
      </div>

      {/* 11. MINIMAP: VISIBLE ONLY WHEN TOGGLED FROM TOP NAV OR WHILE ZOOMING */}
      {(showMinimap || isZooming) && (
        <div data-canvas-ui className="absolute bottom-5 right-5 z-30 w-44 h-32 rounded-xl bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-[#D2DCEA] dark:border-[#27272A] shadow-xl overflow-hidden pointer-events-auto p-1 animate-fadeIn">
          <div className="relative w-full h-full bg-[#FAFBFD] dark:bg-[#09090B] rounded-lg overflow-hidden border border-[#D2DCEA]/40 dark:border-[#27272A]/40">
            {nodes.map((n) => (
              <div
                key={n.instanceId}
                style={{
                  left: `${(n.x / CANVAS_WIDTH) * 100}%`,
                  top: `${(n.y / CANVAS_HEIGHT) * 100}%`,
                  width: '4px',
                  height: '3px',
                }}
                className="absolute bg-[#325FEC] rounded-xs"
              />
            ))}
            {shapes.map((sh) => (
              <div
                key={sh.id}
                style={{
                  left: `${(sh.x / CANVAS_WIDTH) * 100}%`,
                  top: `${(sh.y / CANVAS_HEIGHT) * 100}%`,
                  width: '3px',
                  height: '3px',
                }}
                className="absolute bg-slate-400 rounded-full"
              />
            ))}
            {folders.map((f) => (
              <div
                key={f.id}
                style={{
                  left: `${(f.x / CANVAS_WIDTH) * 100}%`,
                  top: `${(f.y / CANVAS_HEIGHT) * 100}%`,
                  width: `${(f.width / CANVAS_WIDTH) * 100}%`,
                  height: `${(f.height / CANVAS_HEIGHT) * 100}%`,
                }}
                className="absolute border border-blue-400/60 rounded-xs"
              />
            ))}
            {containerRef.current && (
              <div
                style={{
                  left: `${((-pan.x / zoom) / CANVAS_WIDTH) * 100}%`,
                  top: `${((-pan.y / zoom) / CANVAS_HEIGHT) * 100}%`,
                  width: `${((containerRef.current.clientWidth / zoom) / CANVAS_WIDTH) * 100}%`,
                  height: `${((containerRef.current.clientHeight / zoom) / CANVAS_HEIGHT) * 100}%`,
                }}
                className="absolute border border-[#325FEC] bg-[#325FEC]/20 rounded-xs pointer-events-none"
              />
            )}
          </div>
        </div>
      )}

      <CanvasExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={project}
        nodes={nodes}
        folders={folders}
        shapes={shapes}
        connectors={connectors}
        drawings={drawings}
        selectedIds={selectedIds}
        atomsById={atomsById}
        nodeHeights={measuredHeights}
      />
    </div>
  );
};
