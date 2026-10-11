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
  Compass
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
  onExportTrigger?: (type: 'all' | 'selection' | 'section') => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

// Finite Infinite Plane Dimensions
const CANVAS_WIDTH = 24000;
const CANVAS_HEIGHT = 18000;
const CANVAS_CENTER_X = CANVAS_WIDTH / 2;
const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2;

const DRAG_THRESHOLD = 3;

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

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

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
    }
  | {
      type: 'marquee';
      startCanvasX: number;
      startCanvasY: number;
      currentCanvasX: number;
      currentCanvasY: number;
    }
  | null;

export const ResearchCanvas: React.FC<ResearchCanvasProps> = ({
  project,
  atoms,
  onDeleteAtom,
  onCreateAtom,
  onOpenAISidebar,
  onOpenPdfReader,
  showMinimap = false,
  onToggleMinimap,
  onExportTrigger,
  isSidebarCollapsed,
  onToggleSidebar,
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

  // Hovered item ID for atoms to show action buttons on hover only
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Inline editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Export menu in canvas header
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

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

  // Load Canvas Data per project
  useEffect(() => {
    try {
      const raw = localStorage.getItem(canvasStorageKey);
      if (raw) {
        const data: CanvasData = JSON.parse(raw);
        setNodes(data.nodes || []);
        setFolders(data.folders || []);
        setShapes(data.shapes || []);
        setConnectors(data.connectors || []);
        setDrawings(data.drawings || []);
        setHistory([{
          nodes: data.nodes || [],
          folders: data.folders || [],
          shapes: data.shapes || [],
          connectors: data.connectors || [],
          drawings: data.drawings || [],
        }]);
        setHistoryIndex(0);
        return;
      }
    } catch {}

    // First time initializing: Populate initial atoms in compact mode
    if (atoms.length > 0) {
      const initialNodes: CanvasAtomNode[] = atoms.slice(0, 6).map((atom, idx) => {
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
      setFolders([]);
      setShapes([]);
      setConnectors([]);
      setDrawings([]);
      setHistory([{
        nodes: initialNodes,
        folders: [],
        shapes: [],
        connectors: [],
        drawings: [],
      }]);
      setHistoryIndex(0);
    }
  }, [canvasStorageKey, projectId]);

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
        localStorage.setItem(canvasStorageKey, JSON.stringify(data));
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

  // Layer Reordering: Ctrl + [ (Send backward), Ctrl + ] (Bring forward)
  const handleLayerOrder = useCallback((direction: 'backward' | 'forward') => {
    if (selectedIds.size === 0) return;
    setNodes((prev) => {
      const arr = [...prev];
      selectedIds.forEach((selId) => {
        const idx = arr.findIndex((n) => n.instanceId === selId);
        if (idx !== -1) {
          if (direction === 'forward' && idx < arr.length - 1) {
            const temp = arr[idx];
            arr[idx] = arr[idx + 1];
            arr[idx + 1] = temp;
          } else if (direction === 'backward' && idx > 0) {
            const temp = arr[idx];
            arr[idx] = arr[idx - 1];
            arr[idx - 1] = temp;
          }
        }
      });
      return arr;
    });
    setShapes((prev) => {
      const arr = [...prev];
      selectedIds.forEach((selId) => {
        const idx = arr.findIndex((s) => s.id === selId);
        if (idx !== -1) {
          if (direction === 'forward' && idx < arr.length - 1) {
            const temp = arr[idx];
            arr[idx] = arr[idx + 1];
            arr[idx + 1] = temp;
          } else if (direction === 'backward' && idx > 0) {
            const temp = arr[idx];
            arr[idx] = arr[idx - 1];
            arr[idx - 1] = temp;
          }
        }
      });
      return arr;
    });
  }, [selectedIds]);

  // Keyboard Shortcuts: Space, Undo/Redo, Delete, Layering, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        setIsSpacePressed(true);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        handleLayerOrder('backward');
      } else if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        e.preventDefault();
        handleLayerOrder('forward');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnectorId) {
          e.preventDefault();
          setConnectors((prev) => {
            const next = prev.filter((c) => c.id !== selectedConnectorId);
            pushHistorySnapshot(nodes, folders, shapes, next, drawings);
            return next;
          });
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
        setIsExportMenuOpen(false);
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('pointer');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('hand');
      } else if (e.key === 'c' || e.key === 'C') {
        setActiveTool('connect');
      } else if (e.key === 's' || e.key === 'S') {
        setActiveTool('sticky');
      } else if (e.key === 't' || e.key === 'T') {
        setActiveTool('text');
      } else if (e.key === 'p' || e.key === 'P') {
        setActiveTool('pen');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('eraser');
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

  // Zoom with Wheel / Trackpad Pinch
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    if (e.altKey || e.ctrlKey || e.metaKey) {
      triggerZoomMinimap();
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.15), 2.5);

      const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
      const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

      setZoom(newZoom);
      setPan({
        x: Math.max(-CANVAS_WIDTH * newZoom + 400, Math.min(rect.width - 200, newPanX)),
        y: Math.max(-CANVAS_HEIGHT * newZoom + 300, Math.min(rect.height - 150, newPanY)),
      });
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX * 0.9,
        y: prev.y - e.deltaY * 0.9,
      }));
    }
  }, [zoom, pan, triggerZoomMinimap]);

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
      .filter((n) => isContainedInFolder(n.x + (n.width || 340) / 2, n.y + 40, folder))
      .map((n) => n.instanceId);

    const containedShapes = shapes
      .filter((s) => isContainedInFolder(s.x + s.width / 2, s.y + s.height / 2, folder))
      .map((s) => s.id);

    const containedFolders = folders
      .filter((f) => f.id !== folder.id && isContainedInFolder(f.x + f.width / 2, f.y + f.height / 2, folder))
      .map((f) => f.id);

    return { containedNodes, containedShapes, containedFolders };
  }, [nodes, shapes, folders]);

  // Helper to get port position for any canvas item
  const getPortCoordinates = useCallback((entityId: string, port: 'top' | 'bottom' | 'left' | 'right' = 'right') => {
    const node = nodes.find((n) => n.instanceId === entityId);
    if (node) {
      const w = node.width || 340;
      const h = node.height || 100;
      switch (port) {
        case 'top': return { x: node.x + w / 2, y: node.y };
        case 'bottom': return { x: node.x + w / 2, y: node.y + h };
        case 'left': return { x: node.x, y: node.y + h / 2 };
        case 'right': return { x: node.x + w, y: node.y + h / 2 };
      }
    }

    const folder = folders.find((f) => f.id === entityId);
    if (folder) {
      switch (port) {
        case 'top': return { x: folder.x + folder.width / 2, y: folder.y };
        case 'bottom': return { x: folder.x + folder.width / 2, y: folder.y + folder.height };
        case 'left': return { x: folder.x, y: folder.y + folder.height / 2 };
        case 'right': return { x: folder.x + folder.width, y: folder.y + folder.height / 2 };
      }
    }

    const shape = shapes.find((s) => s.id === entityId);
    if (shape) {
      switch (port) {
        case 'top': return { x: shape.x + shape.width / 2, y: shape.y };
        case 'bottom': return { x: shape.x + shape.width / 2, y: shape.y + shape.height };
        case 'left': return { x: shape.x, y: shape.y + shape.height / 2 };
        case 'right': return { x: shape.x + shape.width, y: shape.y + shape.height / 2 };
      }
    }

    return null;
  }, [nodes, folders, shapes]);

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
    };

    const nextNodes = [...nodes, newInstance];
    setNodes(nextNodes);
    pushHistorySnapshot(nextNodes, folders, shapes, connectors, drawings);
    setSelectedIds(new Set([newInstance.instanceId]));
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
      color: `${colorObj.border} ${colorObj.bg} ${colorObj.text} ${colorObj.headerBg}`,
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
    let posX = canvasX;
    let posY = canvasY;

    if (posX === undefined || posY === undefined) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pt = clientToCanvas(rect.left + rect.width / 2, rect.top + rect.height / 2);
      posX = pt.x - 110;
      posY = pt.y - 70;
    }

    const defaultPreset = SHAPE_FILL_PRESETS[shapes.length % SHAPE_FILL_PRESETS.length];
    let w = 220;
    let h = 130;
    let initialText = 'Double click to edit...';
    let colorClass = defaultPreset.bg;
    let strokeColor = defaultPreset.stroke;
    let strokeWidth = 2;

    if (type === 'sticky') {
      const stickyColor = STICKY_COLORS[shapes.length % STICKY_COLORS.length];
      w = 200;
      h = 160;
      initialText = 'Write note here...';
      colorClass = stickyColor.bg;
      strokeColor = stickyColor.border.includes('amber') ? '#FACC15' : '#38BDF8';
      strokeWidth = 1.5;
    } else if (type === 'text') {
      w = 240;
      h = 45;
      initialText = 'Click to edit text';
      colorClass = 'bg-transparent';
      strokeColor = 'transparent';
      strokeWidth = 0;
    } else if (type === 'square') {
      w = 160;
      h = 160;
      initialText = '';
    } else if (type === 'rectangle') {
      w = 220;
      h = 130;
      initialText = '';
    } else if (type === 'circle') {
      w = 160;
      h = 160;
      initialText = '';
    } else if (type === 'ellipse') {
      w = 220;
      h = 140;
      initialText = '';
    } else if (type === 'line') {
      w = 200;
      h = 24;
      initialText = '';
    } else if (type === 'arrow') {
      w = 200;
      h = 32;
      initialText = '';
    } else if (type === 'polygon') {
      w = 180;
      h = 160;
      initialText = '';
    } else if (type === 'star') {
      w = 180;
      h = 180;
      initialText = '';
    }

    const newShape: CanvasShape = {
      id: `shape-${Date.now()}`,
      type,
      text: initialText,
      color: colorClass,
      strokeColor,
      strokeWidth,
      textColor: '#0F172A',
      fontWeight: 'medium',
      x: posX,
      y: posY,
      width: w,
      height: h,
    };

    const nextShapes = [...shapes, newShape];
    setShapes(nextShapes);
    pushHistorySnapshot(nodes, folders, nextShapes, connectors, drawings);
    setSelectedIds(new Set([newShape.id]));
    setActiveTool('pointer');
    setIsShapeMenuOpen(false);
  };

  // Canvas Mouse Down: Tool selection / Pan / Marquee / Draw
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;

    const isBackground =
      isSpacePressed ||
      activeTool === 'hand' ||
      target === containerRef.current ||
      target.tagName === 'svg' ||
      target.classList.contains('canvas-background-plane');

    const canvasPt = clientToCanvas(e.clientX, e.clientY);

    // Drawing tool: Pen or Highlighter
    if (activeTool === 'pen' || activeTool === 'highlighter') {
      const isPen = activeTool === 'pen';
      const newPath: CanvasDrawingPath = {
        id: `draw-${Date.now()}`,
        tool: activeTool,
        points: [canvasPt],
        color: isPen ? penColor : highlighterColor,
        strokeWidth: isPen ? penThickness : highlighterThickness,
      };
      setActiveDrawing(newPath);
      return;
    }

    // Eraser Tool
    if (activeTool === 'eraser') {
      return;
    }

    // Click on Canvas background
    if (isBackground) {
      if (activeTool === 'sticky') {
        handleCreateShapeAt('sticky', canvasPt.x - 100, canvasPt.y - 80);
        return;
      }
      if (activeTool === 'text') {
        handleCreateShapeAt('text', canvasPt.x - 100, canvasPt.y - 20);
        return;
      }
      if (activeTool === 'section') {
        handleCreateNewSection();
        return;
      }

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
      setEditingItemId(null);
      setIsShapeMenuOpen(false);
      setIsExportMenuOpen(false);
    }
  };

  // Mouse Move: Dragging, Resizing, Marquee, Drawing, Connectors
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const canvasPt = clientToCanvas(e.clientX, e.clientY);
    setMouseCanvasPos(canvasPt);

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
        return {
          ...prev,
          points: [...prev.points, canvasPt],
        };
      });
      return;
    }

    // Eraser Tool Drag
    if (activeTool === 'eraser' && e.buttons === 1) {
      setDrawings((prev) =>
        prev.filter((d) => {
          const near = d.points.some((p) => Math.hypot(p.x - canvasPt.x, p.y - canvasPt.y) < 20);
          return !near;
        })
      );
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

      const matched = new Set<string>();
      nodes.forEach((n) => {
        const w = n.width || 340;
        const h = n.height || 100;
        if (n.x + w >= minX && n.x <= maxX && n.y + h >= minY && n.y <= maxY) {
          matched.add(n.instanceId);
        }
      });
      shapes.forEach((s) => {
        if (s.x + s.width >= minX && s.x <= maxX && s.y + s.height >= minY && s.y <= maxY) {
          matched.add(s.id);
        }
      });
      folders.forEach((f) => {
        if (f.x + f.width >= minX && f.x <= maxX && f.y + f.height >= minY && f.y <= maxY) {
          matched.add(f.id);
        }
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

      const allMovedNodeIds = new Set([
        ...Object.keys(dragState.startPositions).filter((id) => nodes.some((n) => n.instanceId === id)),
        ...(dragState.containedNodeIds || []),
      ]);

      const allMovedShapeIds = new Set([
        ...Object.keys(dragState.startPositions).filter((id) => shapes.some((s) => s.id === id)),
        ...(dragState.containedShapeIds || []),
      ]);

      const allMovedFolderIds = new Set([
        ...Object.keys(dragState.startPositions).filter((id) => folders.some((f) => f.id === id)),
        ...(dragState.containedFolderIds || []),
      ]);

      if (allMovedNodeIds.size > 0) {
        setNodes((prev) =>
          prev.map((n) => {
            const start = dragState.startPositions[n.instanceId];
            return start ? { ...n, x: start.x + deltaX, y: start.y + deltaY } : n;
          })
        );
      }

      if (allMovedShapeIds.size > 0) {
        setShapes((prev) =>
          prev.map((s) => {
            const start = dragState.startPositions[s.id];
            return start ? { ...s, x: start.x + deltaX, y: start.y + deltaY } : s;
          })
        );
      }

      if (allMovedFolderIds.size > 0) {
        setFolders((prev) =>
          prev.map((f) => {
            const start = dragState.startPositions[f.id];
            return start ? { ...f, x: start.x + deltaX, y: start.y + deltaY } : f;
          })
        );
      }
      return;
    }

    // 8-Way Resizing
    if (dragState.type === 'resize') {
      const deltaX = (e.clientX - dragState.startClientX) / zoom;
      const deltaY = (e.clientY - dragState.startClientY) / zoom;

      let newX = dragState.initialX;
      let newY = dragState.initialY;
      let newW = dragState.initialW;
      let newH = dragState.initialH;

      const dir = dragState.direction;
      if (dir.includes('e')) newW = Math.max(160, dragState.initialW + deltaX);
      if (dir.includes('s')) newH = Math.max(70, dragState.initialH + deltaY);
      if (dir.includes('w')) {
        const potentialW = dragState.initialW - deltaX;
        if (potentialW >= 160) {
          newW = potentialW;
          newX = dragState.initialX + deltaX;
        }
      }
      if (dir.includes('n')) {
        const potentialH = dragState.initialH - deltaY;
        if (potentialH >= 70) {
          newH = potentialH;
          newY = dragState.initialY + deltaY;
        }
      }

      if (dragState.itemType === 'node') {
        setNodes((prev) =>
          prev.map((n) =>
            n.instanceId === dragState.id ? { ...n, x: newX, y: newY, width: newW, height: newH } : n
          )
        );
      } else if (dragState.itemType === 'shape') {
        setShapes((prev) =>
          prev.map((s) =>
            s.id === dragState.id ? { ...s, x: newX, y: newY, width: newW, height: newH } : s
          )
        );
      } else if (dragState.itemType === 'folder') {
        setFolders((prev) =>
          prev.map((f) =>
            f.id === dragState.id ? { ...f, x: newX, y: newY, width: newW, height: newH } : f
          )
        );
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

    // Commit drag/resize movement
    if (dragState) {
      if (dragState.type === 'item' && dragState.isDragging) {
        pushHistorySnapshot(nodes, folders, shapes, connectors, drawings);
      } else if (dragState.type === 'resize') {
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

  // Generic Item Mouse Down for Dragging / Selection
  const handleItemMouseDown = (
    e: React.MouseEvent,
    id: string,
    itemType: 'node' | 'shape' | 'folder'
  ) => {
    e.stopPropagation();
    if (isSpacePressed || activeTool === 'hand' || activeTool === 'connect') return;

    if (activeTool === 'eraser') {
      if (itemType === 'node') {
        const nextNodes = nodes.filter((n) => n.instanceId !== id);
        setNodes(nextNodes);
        pushHistorySnapshot(nextNodes, folders, shapes, connectors, drawings);
      } else if (itemType === 'shape') {
        const nextShapes = shapes.filter((s) => s.id !== id);
        setShapes(nextShapes);
        pushHistorySnapshot(nodes, folders, nextShapes, connectors, drawings);
      } else if (itemType === 'folder') {
        const nextFolders = folders.filter((f) => f.id !== id);
        setFolders(nextFolders);
        pushHistorySnapshot(nodes, nextFolders, shapes, connectors, drawings);
      }
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
      const s = shapes.find((shape) => shape.id === selId);
      if (s) startPositions[selId] = { x: s.x, y: s.y };
      const f = folders.find((folder) => folder.id === selId);
      if (f) startPositions[selId] = { x: f.x, y: f.y };
    });

    let containedNodeIds: string[] = [];
    let containedShapeIds: string[] = [];
    let containedFolderIds: string[] = [];

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
          const s = shapes.find((shape) => shape.id === sid);
          if (s && !startPositions[sid]) startPositions[sid] = { x: s.x, y: s.y };
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

  // Start 8-way resize
  const handleResizeHandleMouseDown = (
    e: React.MouseEvent,
    id: string,
    itemType: 'node' | 'shape' | 'folder',
    direction: ResizeDirection,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    e.stopPropagation();
    setDragState({
      type: 'resize',
      id,
      itemType,
      direction,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialX: x,
      initialY: y,
      initialW: width,
      initialH: height,
    });
  };

  // Fit to Screen (Calculates precise bounding box with padding)
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + (n.width || 340));
      maxY = Math.max(maxY, n.y + (n.height || 140));
    });
    shapes.forEach((s) => {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.width);
      maxY = Math.max(maxY, s.y + s.height);
    });
    folders.forEach((f) => {
      minX = Math.min(minX, f.x);
      minY = Math.min(minY, f.y);
      maxX = Math.max(maxX, f.x + f.width);
      maxY = Math.max(maxY, f.y + f.height);
    });

    if (minX === Infinity) {
      setZoom(0.85);
      setPan({
        x: rect.width / 2 - CANVAS_CENTER_X * 0.85,
        y: rect.height / 2 - CANVAS_CENTER_Y * 0.85,
      });
      return;
    }

    const padding = 120;
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const fitZoom = Math.min(
      Math.max(Math.min((rect.width - padding) / contentW, (rect.height - padding) / contentH), 0.2),
      1.5
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(fitZoom);
    setPan({
      x: rect.width / 2 - centerX * fitZoom,
      y: rect.height / 2 - centerY * fitZoom,
    });
    triggerZoomMinimap();
  }, [nodes, shapes, folders, triggerZoomMinimap]);

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

  // Export Canvas Handler
  const handleExport = (type: 'all' | 'selection' | 'section') => {
    setIsExportMenuOpen(false);
    try {
      const canvasEl = document.createElement('canvas');
      canvasEl.width = 1920;
      canvasEl.height = 1080;
      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;

      // Dark Canvas Background
      ctx.fillStyle = '#09090B';
      ctx.fillRect(0, 0, 1920, 1080);

      // Header title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px sans-serif';
      const title = `${project?.title || 'Canvas'} • ${type.toUpperCase()} EXPORT`;
      ctx.fillText(title, 60, 60);

      ctx.fillStyle = '#71717A';
      ctx.font = '14px sans-serif';
      ctx.fillText(`Exported on ${new Date().toLocaleDateString()}`, 60, 90);

      const exportNodes = type === 'selection' && selectedIds.size > 0
        ? nodes.filter((n) => selectedIds.has(n.instanceId))
        : nodes;

      exportNodes.slice(0, 16).forEach((n, idx) => {
        const atom = atomsById.get(n.atomId);
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        const cardX = 60 + col * 440;
        const cardY = 140 + row * 220;

        ctx.fillStyle = '#18181B';
        ctx.strokeStyle = '#27272A';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, 410, 190, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#325FEC';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText((atom?.type || 'NOTE').toUpperCase(), cardX + 16, cardY + 28);

        ctx.fillStyle = '#F4F4F5';
        ctx.font = '13px sans-serif';
        const txt = atom?.content?.rawText || atom?.content?.text || atom?.title || 'Clip note';
        ctx.fillText(txt.slice(0, 80) + (txt.length > 80 ? '...' : ''), cardX + 16, cardY + 58);
      });

      const dataUrl = canvasEl.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${project?.title || 'canvas'}-${type}-export.png`;
      a.click();
    } catch {}
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

  // Selected shape for property tweaking (e.g. font weight, stroke color, fill)
  const singleSelectedShape = useMemo(() => {
    if (selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0];
      return shapes.find((s) => s.id === id) || null;
    }
    return null;
  }, [selectedIds, shapes]);

  // Render SVG Shape Outline Helper (Figma's Basic Shape Set)
  const renderShapeSvg = (shape: CanvasShape) => {
    const w = shape.width;
    const h = shape.height;
    const stroke = shape.strokeColor || '#325FEC';
    const strokeW = shape.strokeWidth !== undefined ? shape.strokeWidth : 2;

    switch (shape.type) {
      case 'square':
        return (
          <rect
            x={strokeW}
            y={strokeW}
            width={w - strokeW * 2}
            height={h - strokeW * 2}
            rx={0}
            stroke={stroke}
            strokeWidth={strokeW}
            className="fill-current"
          />
        );
      case 'circle':
        return (
          <circle
            cx={w / 2}
            cy={h / 2}
            r={Math.min(w, h) / 2 - strokeW}
            stroke={stroke}
            strokeWidth={strokeW}
            className="fill-current"
          />
        );
      case 'ellipse':
        return (
          <ellipse
            cx={w / 2}
            cy={h / 2}
            rx={w / 2 - strokeW}
            ry={h / 2 - strokeW}
            stroke={stroke}
            strokeWidth={strokeW}
            className="fill-current"
          />
        );
      case 'line':
        return (
          <line
            x1={strokeW}
            y1={h / 2}
            x2={w - strokeW}
            y2={h / 2}
            stroke={stroke}
            strokeWidth={Math.max(strokeW, 2)}
            strokeLinecap="round"
          />
        );
      case 'arrow':
        return (
          <g>
            <line
              x1={strokeW}
              y1={h / 2}
              x2={w - strokeW * 2 - 10}
              y2={h / 2}
              stroke={stroke}
              strokeWidth={Math.max(strokeW, 2)}
              strokeLinecap="round"
            />
            <polygon
              points={`${w - strokeW},${h / 2} ${w - strokeW - 12},${h / 2 - 7} ${w - strokeW - 12},${h / 2 + 7}`}
              fill={stroke}
            />
          </g>
        );
      case 'polygon': // Triangle
        return (
          <polygon
            points={`${w / 2},${strokeW} ${w - strokeW},${h - strokeW} ${strokeW},${h - strokeW}`}
            stroke={stroke}
            strokeWidth={strokeW}
            className="fill-current"
          />
        );
      case 'star':
        return (
          <polygon
            points={`${w * 0.5},${h * 0.05} ${w * 0.62},${h * 0.38} ${w * 0.98},${h * 0.38} ${w * 0.69},${h * 0.58} ${w * 0.8},${h * 0.92} ${w * 0.5},${h * 0.72} ${w * 0.2},${h * 0.92} ${w * 0.31},${h * 0.58} ${w * 0.02},${h * 0.38} ${w * 0.38},${h * 0.38}`}
            stroke={stroke}
            strokeWidth={strokeW}
            className="fill-current"
          />
        );
      case 'rectangle':
      default:
        return (
          <rect
            x={strokeW}
            y={strokeW}
            width={w - strokeW * 2}
            height={h - strokeW * 2}
            rx={8}
            stroke={stroke}
            strokeWidth={strokeW}
            className="fill-current"
          />
        );
    }
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDownCanvas}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropOnCanvas}
      className={`relative w-full h-full overflow-hidden select-none font-sans bg-[#FAFBFD] dark:bg-[#09090B] ${
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
        onWheel={(e) => e.stopPropagation()}
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
          onWheel={(e) => e.stopPropagation()}
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
          onClick={() => setIsDrawerOpen(true)}
          className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-[#D2DCEA] dark:border-[#27272A] shadow-md hover:border-[#325FEC] text-xs font-semibold text-[#0F172A] dark:text-zinc-200 transition-all"
          title="Open Atom Drawer"
        >
          <SidebarSimple size={15} weight="bold" className="text-[#325FEC] dark:text-[#518FFF]" />
          <span>Atoms ({atoms.length})</span>
        </button>
      )}

      {/* 2. BOTTOM TOOLBAR: POSITIONED AT BOTTOM OF CANVAS (FIGMA BASIC SHAPES, PEN SIZE DROPDOWN WITH SPACING) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-[#D2DCEA] dark:border-[#27272A] rounded-2xl px-2.5 py-1.5 shadow-2xl text-xs font-sans">
        
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
                  {PEN_COLORS.slice(0, 5).map((c) => (
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

        {/* FONT WEIGHT CONTROLS FOR SELECTED SHAPE / TEXT */}
        {singleSelectedShape && (
          <div className="flex items-center gap-1 pl-2 ml-1 border-l border-[#D2DCEA] dark:border-[#27272A]">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Weight:</span>
            {(['normal', 'medium', 'semibold', 'bold'] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => {
                  const nextShapes = shapes.map((s) =>
                    s.id === singleSelectedShape.id ? { ...s, fontWeight: w } : s
                  );
                  setShapes(nextShapes);
                  pushHistorySnapshot(nodes, folders, nextShapes, connectors, drawings);
                }}
                className={`px-1.5 py-0.5 rounded text-[10.5px] capitalize transition-colors ${
                  singleSelectedShape.fontWeight === w
                    ? 'bg-[#325FEC] text-white font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-[#EEF3F8] dark:hover:bg-[#25252A]'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        )}
      </div>

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
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}
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

        {/* 5. RENDER SECTIONS / GROUPS */}
        {folders.map((folder) => {
          const isSelected = selectedIds.has(folder.id);

          return (
            <div
              key={folder.id}
              onMouseDown={(e) => handleItemMouseDown(e, folder.id, 'folder')}
              style={{
                transform: `translate(${folder.x}px, ${folder.y}px)`,
                width: `${folder.width}px`,
                height: `${folder.height}px`,
              }}
              className={`absolute pointer-events-auto rounded-3xl border-2 transition-shadow group/folder z-0 ${folder.color} ${
                isSelected ? 'ring-2 ring-[#325FEC] ring-offset-2 shadow-2xl' : 'shadow-sm'
              }`}
            >
              <div className="absolute top-2 left-4 flex items-center gap-2">
                {editingItemId === folder.id ? (
                  <input
                    type="text"
                    autoFocus
                    defaultValue={folder.title}
                    onBlur={(e) => {
                      const nextFolders = folders.map((f) =>
                        f.id === folder.id ? { ...f, title: e.target.value.trim() || 'Untitled Section' } : f
                      );
                      setFolders(nextFolders);
                      pushHistorySnapshot(nodes, nextFolders, shapes, connectors, drawings);
                      setEditingItemId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="bg-white dark:bg-[#18181B] text-xs font-bold px-2 py-0.5 rounded border border-[#325FEC] outline-none"
                  />
                ) : (
                  <span
                    onDoubleClick={() => setEditingItemId(folder.id)}
                    className="text-xs font-display font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200 cursor-pointer"
                    title="Double click to rename section"
                  >
                    📁 {folder.title}
                  </span>
                )}
              </div>

              {/* Ports: ONLY VISIBLE in Connection Mode or while dragging wire */}
              {(activeTool === 'connect' || connectingFrom !== null) &&
                (['top', 'bottom', 'left', 'right'] as const).map((port) => (
                  <button
                    key={port}
                    type="button"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setConnectingFrom({ id: folder.id, port });
                    }}
                    onMouseEnter={() => setHoveredPortTarget({ id: folder.id, port })}
                    onMouseLeave={() => setHoveredPortTarget(null)}
                    style={{
                      top: port === 'top' ? -8 : port === 'bottom' ? '100%' : '50%',
                      left: port === 'left' ? -8 : port === 'right' ? '100%' : '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="absolute w-4 h-4 rounded-full bg-white dark:bg-[#18181B] border-2 border-[#325FEC] transition-all flex items-center justify-center cursor-crosshair z-30 hover:scale-130"
                    title={`Connect ${port}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#325FEC]" />
                  </button>
                ))}

              {/* 8-Way Resize Handles (Only in Pointer mode) */}
              {isSelected && activeTool !== 'connect' && (
                <>
                  <div onMouseDown={(e) => handleResizeHandleMouseDown(e, folder.id, 'folder', 'se', folder.x, folder.y, folder.width, folder.height)} className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#325FEC] rounded-xs cursor-se-resize z-30" />
                  <div onMouseDown={(e) => handleResizeHandleMouseDown(e, folder.id, 'folder', 'sw', folder.x, folder.y, folder.width, folder.height)} className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#325FEC] rounded-xs cursor-sw-resize z-30" />
                  <div onMouseDown={(e) => handleResizeHandleMouseDown(e, folder.id, 'folder', 'ne', folder.x, folder.y, folder.width, folder.height)} className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#325FEC] rounded-xs cursor-ne-resize z-30" />
                  <div onMouseDown={(e) => handleResizeHandleMouseDown(e, folder.id, 'folder', 'nw', folder.x, folder.y, folder.width, folder.height)} className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#325FEC] rounded-xs cursor-nw-resize z-30" />
                </>
              )}
            </div>
          );
        })}

        {/* 6. RENDER FLOWCHART SHAPES & STICKY NOTES */}
        {shapes.map((shape) => {
          const isSelected = selectedIds.has(shape.id);

          return (
            <div
              key={shape.id}
              onMouseDown={(e) => handleItemMouseDown(e, shape.id, 'shape')}
              style={{
                transform: `translate(${shape.x}px, ${shape.y}px)`,
                width: `${shape.width}px`,
                height: `${shape.height}px`,
              }}
              className={`absolute pointer-events-auto transition-all group/shape z-20 flex items-center justify-center ${
                shape.color
              } ${isSelected ? 'ring-2 ring-[#325FEC] shadow-2xl' : ''}`}
            >
              {/* SVG Background Outline for complex Flowchart Shapes */}
              {shape.type !== 'sticky' && shape.type !== 'text' && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {renderShapeSvg(shape)}
                </svg>
              )}

              {/* Text Inside Shape */}
              <div
                className={`relative z-10 p-3 w-full h-full flex items-center justify-center text-center text-xs leading-relaxed ${
                  shape.fontWeight === 'bold'
                    ? 'font-bold'
                    : shape.fontWeight === 'semibold'
                    ? 'font-semibold'
                    : shape.fontWeight === 'medium'
                    ? 'font-medium'
                    : 'font-normal'
                } ${shape.type === 'sticky' ? 'border rounded-2xl shadow-md ' + shape.color : ''}`}
              >
                {editingItemId === shape.id ? (
                  <textarea
                    autoFocus
                    defaultValue={shape.text}
                    onBlur={(e) => {
                      const nextShapes = shapes.map((s) =>
                        s.id === shape.id ? { ...s, text: e.target.value } : s
                      );
                      setShapes(nextShapes);
                      pushHistorySnapshot(nodes, folders, nextShapes, connectors, drawings);
                      setEditingItemId(null);
                    }}
                    className="w-full h-full bg-transparent resize-none outline-none text-xs text-center"
                  />
                ) : (
                  <div
                    onDoubleClick={() => setEditingItemId(shape.id)}
                    className="cursor-text select-text whitespace-pre-wrap"
                  >
                    {shape.text}
                  </div>
                )}
              </div>

              {/* Ports (Connection Mode Only) */}
              {(activeTool === 'connect' || connectingFrom !== null) &&
                (['top', 'bottom', 'left', 'right'] as const).map((port) => (
                  <button
                    key={port}
                    type="button"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setConnectingFrom({ id: shape.id, port });
                    }}
                    onMouseEnter={() => setHoveredPortTarget({ id: shape.id, port })}
                    onMouseLeave={() => setHoveredPortTarget(null)}
                    style={{
                      top: port === 'top' ? -8 : port === 'bottom' ? '100%' : '50%',
                      left: port === 'left' ? -8 : port === 'right' ? '100%' : '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="absolute w-4 h-4 rounded-full bg-white dark:bg-[#18181B] border-2 border-[#325FEC] transition-all flex items-center justify-center cursor-crosshair z-30 hover:scale-130"
                    title={`Connect ${port}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#325FEC]" />
                  </button>
                ))}

              {/* 8-Way Resize Handles (Only in Pointer mode) */}
              {isSelected && activeTool !== 'connect' && (
                <>
                  <div onMouseDown={(e) => handleResizeHandleMouseDown(e, shape.id, 'shape', 'se', shape.x, shape.y, shape.width, shape.height)} className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#325FEC] rounded-xs cursor-se-resize z-30" />
                  <div onMouseDown={(e) => handleResizeHandleMouseDown(e, shape.id, 'shape', 'sw', shape.x, shape.y, shape.width, shape.height)} className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#325FEC] rounded-xs cursor-sw-resize z-30" />
                  <div onMouseDown={(e) => handleResizeHandleMouseDown(e, shape.id, 'shape', 'ne', shape.x, shape.y, shape.width, shape.height)} className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#325FEC] rounded-xs cursor-ne-resize z-30" />
                  <div onMouseDown={(e) => handleResizeHandleMouseDown(e, shape.id, 'shape', 'nw', shape.x, shape.y, shape.width, shape.height)} className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#325FEC] rounded-xs cursor-nw-resize z-30" />
                </>
              )}
            </div>
          );
        })}

        {/* 7. RENDER ATOM BLOCKS (Compact by default, actions on hover only) */}
        {nodes.map((node) => {
          const atom = atomsById.get(node.atomId);
          if (!atom) return null;

          const isSelected = selectedIds.has(node.instanceId);
          const isHovered = hoveredNodeId === node.instanceId;
          const isQuote = atom.type === 'quote' || atom.type === 'text';
          const isImage = atom.type === 'image';
          const rawQuote = atom.content?.rawText || atom.content?.text || '';
          const cardWidth = node.width || 340;
          const cardHeight = node.height;

          const source = atom.metadata?.sourceUrl;
          const highlight = getAtomHighlightText(atom);
          const targetLink = source ? (highlight ? buildDeepLink(source, undefined, highlight) : source) : '';
          const docId = atom.metadata?.docId || atom.metadata?.pdfDocId || (atom.content as any)?.docId;
          const pageNumber = atom.metadata?.pageNumber || atom.metadata?.page || 1;

          return (
            <div
              key={node.instanceId}
              onMouseEnter={() => setHoveredNodeId(node.instanceId)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onMouseDown={(e) => handleItemMouseDown(e, node.instanceId, 'node')}
              style={{
                transform: `translate(${node.x}px, ${node.y}px)`,
                width: `${cardWidth}px`,
                minHeight: cardHeight ? `${cardHeight}px` : undefined,
              }}
              className={`absolute pointer-events-auto rounded-2xl border shadow-lg transition-all duration-150 group/atom z-20 flex flex-col justify-between bg-white dark:bg-[#18181B] border-[#D2DCEA] dark:border-[#27272A] p-3.5 ${
                isSelected ? 'border-[#325FEC] ring-2 ring-[#325FEC]/40 shadow-2xl' : 'hover:border-[#94A3B8] dark:hover:border-[#3F3F46]'
              }`}
            >
              <div>
                {/* Content */}
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
                      className="w-full max-h-36 object-cover"
                    />
                  </div>
                )}

                {/* Source label */}
                <div className="pt-2 text-[10px] font-mono text-slate-400 dark:text-zinc-500 truncate">
                  {atom.metadata?.pageTitle || (source ? source.replace(/^https?:\/\//, '').split('/')[0] : 'source')}
                </div>
              </div>

              {/* DETAILED VIEW ACTIONS: VISIBLE ON HOVER ONLY */}
              {isHovered && (
                <div className="pt-2 mt-2 border-t border-[#D2DCEA]/60 dark:border-[#27272A] flex items-center justify-between text-[10.5px] animate-fadeIn">
                  {docId && onOpenPdfReader ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPdfReader(docId, pageNumber, highlight);
                      }}
                      className="flex items-center gap-1 text-[#325FEC] dark:text-[#518FFF] hover:underline font-semibold"
                    >
                      <BookOpen size={12} />
                      <span>Page {pageNumber}</span>
                    </button>
                  ) : targetLink ? (
                    <a
                      href={targetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-[#325FEC] dark:text-[#518FFF] hover:underline font-semibold"
                    >
                      <span>Open Source</span>
                      <ArrowSquareOut size={11} />
                    </a>
                  ) : (
                    <span />
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextNodes = nodes.filter((n) => n.instanceId !== node.instanceId);
                      const nextConnectors = connectors.filter((c) => c.fromId !== node.instanceId && c.toId !== node.instanceId);
                      setNodes(nextNodes);
                      setConnectors(nextConnectors);
                      pushHistorySnapshot(nextNodes, folders, shapes, nextConnectors, drawings);
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        next.delete(node.instanceId);
                        return next;
                      });
                    }}
                    className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                    title="Remove from Canvas (keeps in Timeline)"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              )}

              {/* Ports (Connection Mode Only) */}
              {(activeTool === 'connect' || connectingFrom !== null) &&
                (['top', 'bottom', 'left', 'right'] as const).map((port) => (
                  <button
                    key={port}
                    type="button"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setConnectingFrom({ id: node.instanceId, port });
                    }}
                    onMouseEnter={() => setHoveredPortTarget({ id: node.instanceId, port })}
                    onMouseLeave={() => setHoveredPortTarget(null)}
                    style={{
                      top: port === 'top' ? -8 : port === 'bottom' ? '100%' : '50%',
                      left: port === 'left' ? -8 : port === 'right' ? '100%' : '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="absolute w-4 h-4 rounded-full bg-white dark:bg-[#18181B] border-2 border-[#325FEC] transition-all flex items-center justify-center cursor-crosshair z-30 hover:scale-130"
                    title={`Connect from ${port}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#325FEC]" />
                  </button>
                ))}

              {/* 8-Way Resize Handles (Only in Pointer mode) */}
              {isSelected && activeTool !== 'connect' && (
                <>
                  <div onMouseDown={(e) => handleResizeHandleMouseDown(e, node.instanceId, 'node', 'se', node.x, node.y, node.width || 340, node.height || 100)} className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#325FEC] rounded-xs cursor-se-resize z-30" />
                  <div onMouseDown={(e) => handleResizeHandleMouseDown(e, node.instanceId, 'node', 'sw', node.x, node.y, node.width || 340, node.height || 100)} className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#325FEC] rounded-xs cursor-sw-resize z-30" />
                  <div onMouseDown={(e) => handleResizeHandleMouseDown(e, node.instanceId, 'node', 'ne', node.x, node.y, node.width || 340, node.height || 100)} className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#325FEC] rounded-xs cursor-ne-resize z-30" />
                  <div onMouseDown={(e) => handleResizeHandleMouseDown(e, node.instanceId, 'node', 'nw', node.x, node.y, node.width || 340, node.height || 100)} className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#325FEC] rounded-xs cursor-nw-resize z-30" />
                </>
              )}
            </div>
          );
        })}

        {/* 8. FREEHAND DRAWINGS ON TOP OF ATOMS (Higher Z-Index: 30) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
          style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}
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

        {/* 9. MARQUEE SELECTION BOX */}
        {dragState && dragState.type === 'marquee' && (
          <div
            style={{
              left: `${Math.min(dragState.startCanvasX, dragState.currentCanvasX)}px`,
              top: `${Math.min(dragState.startCanvasY, dragState.currentCanvasY)}px`,
              width: `${Math.abs(dragState.currentCanvasX - dragState.startCanvasX)}px`,
              height: `${Math.abs(dragState.currentCanvasY - dragState.startCanvasY)}px`,
            }}
            className="absolute border border-[#325FEC] bg-[#325FEC]/15 pointer-events-none z-50 rounded-xs"
          />
        )}
      </div>

      {/* 10. FLOATING BOTTOM HUD (ZOOM, FIT, SIDEBAR, FULLSCREEN) */}
      <div 
        className={`absolute bottom-5 z-40 flex items-center gap-1.5 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-[#D2DCEA] dark:border-[#27272A] rounded-xl p-1.5 shadow-xl text-xs font-mono text-slate-700 dark:text-zinc-300 transition-all duration-300 ${
          isDrawerOpen ? 'left-[336px]' : 'left-5'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setZoom((z) => Math.min(z + 0.15, 2.5));
            triggerZoomMinimap();
          }}
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
          onClick={() => {
            setZoom((z) => Math.max(z - 0.15, 0.15));
            triggerZoomMinimap();
          }}
          className="p-1.5 rounded-lg hover:bg-[#EEF3F8] dark:hover:bg-[#25252A] transition-colors"
          title="Zoom Out"
        >
          <Minus size={14} />
        </button>

        <div className="h-4 w-px bg-[#D2DCEA] dark:bg-[#27272A] mx-0.5" />

        <button
          type="button"
          onClick={handleFitToScreen}
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
      </div>

      {/* 11. MINIMAP: VISIBLE ONLY WHEN TOGGLED FROM TOP NAV OR WHILE ZOOMING */}
      {(showMinimap || isZooming) && (
        <div className="absolute bottom-5 right-5 z-30 w-44 h-32 rounded-xl bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-[#D2DCEA] dark:border-[#27272A] shadow-xl overflow-hidden pointer-events-auto p-1 animate-fadeIn">
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
            {folders.map((f) => (
              <div
                key={f.id}
                style={{
                  left: `${(f.x / CANVAS_WIDTH) * 100}%`,
                  top: `${(f.y / CANVAS_HEIGHT) * 100}%`,
                  width: `${(f.width / CANVAS_WIDTH) * 100}%`,
                  height: `${(f.height / CANVAS_HEIGHT) * 100}%`,
                }}
                className="absolute border border-blue-400/40 bg-blue-500/10 rounded-xs"
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
    </div>
  );
};
