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
  Tag
} from '@phosphor-icons/react';
import { ResearchAtom, ResearchProject, AtomType } from '@/lib/types/research';
import { 
  CanvasFolder, 
  CanvasShape, 
  CanvasLink, 
  CanvasNodePosition, 
  CanvasNodeSize,
  CanvasNodeMode,
  CanvasShapeType 
} from '@/lib/types/canvas';
import { buildIsolatedBlockDoc } from '@/lib/utils/htmlBlockNormalizer';
import { FormattedAIMessage } from '@/components/FormattedAIMessage';
import { CanvasNodeSkeleton } from '@/components/SkeletonLoader';
import { semanticHighlightText } from '@/lib/utils/semanticHighlight';

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
}

// 5x Canvas Dimensions (Bounded Finite Canvas)
const CANVAS_WIDTH = 16000;
const CANVAS_HEIGHT = 12000;
const CANVAS_CENTER_X = CANVAS_WIDTH / 2; // 8000
const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2; // 6000

const DRAG_THRESHOLD = 3; // minimal px threshold before dragging begins to allow clean clicks

const SECTION_COLORS = [
  { name: 'Royal Blue', border: 'border-blue-500/40', bg: 'bg-blue-500/5', headerBg: 'bg-blue-600', text: 'text-blue-600 dark:text-blue-400' },
  { name: 'Emerald', border: 'border-emerald-500/40', bg: 'bg-emerald-500/5', headerBg: 'bg-emerald-600', text: 'text-emerald-600 dark:text-emerald-400' },
  { name: 'Amber', border: 'border-amber-500/40', bg: 'bg-amber-500/5', headerBg: 'bg-amber-600', text: 'text-amber-600 dark:text-amber-400' },
  { name: 'Purple', border: 'border-purple-500/40', bg: 'bg-purple-500/5', headerBg: 'bg-purple-600', text: 'text-purple-600 dark:text-purple-400' },
  { name: 'Rose', border: 'border-rose-500/40', bg: 'bg-rose-500/5', headerBg: 'bg-rose-600', text: 'text-rose-600 dark:text-rose-400' },
];

const SHAPE_COLORS = [
  { name: 'Yellow Sticky', bg: 'bg-amber-50 dark:bg-[#FEF08A]/15', border: 'border-amber-300 dark:border-[#FACC15]/50', text: 'text-amber-900 dark:text-[#FEF08A]' },
  { name: 'Blue Sticky', bg: 'bg-blue-50 dark:bg-[#325FEC]/15', border: 'border-blue-300 dark:border-[#325FEC]/50', text: 'text-blue-900 dark:text-[#93C5FD]' },
  { name: 'Emerald Sticky', bg: 'bg-emerald-50 dark:bg-[#10B981]/15', border: 'border-emerald-300 dark:border-[#10B981]/50', text: 'text-emerald-900 dark:text-[#A7F3D0]' },
  { name: 'Purple Sticky', bg: 'bg-purple-50 dark:bg-[#8B5CF6]/15', border: 'border-purple-300 dark:border-[#8B5CF6]/50', text: 'text-purple-900 dark:text-[#DDD6FE]' },
  { name: 'Neutral Card', bg: 'bg-[#F1F4F9] dark:bg-[#18181B]', border: 'border-[#E2E5EB] dark:border-[#27272A]', text: 'text-[#0F172A] dark:text-zinc-100' },
];

type DragState =
  | {
      type: 'node';
      id: string;
      startClientX: number;
      startClientY: number;
      startPos: CanvasNodePosition;
      isDragging: boolean;
    }
  | {
      type: 'node-resize';
      id: string;
      initialW: number;
      initialH: number;
      startClientX: number;
      startClientY: number;
    }
  | {
      type: 'folder';
      id: string;
      startClientX: number;
      startClientY: number;
      startFolderX: number;
      startFolderY: number;
      containedNodeIds: string[];
      startPositions: Record<string, CanvasNodePosition>;
      containedShapeIds: string[];
      startShapePositions: Record<string, { x: number; y: number }>;
      containedFolderIds: string[];
      startFolderPositions: Record<string, { x: number; y: number }>;
      isDragging: boolean;
    }
  | {
      type: 'folder-resize';
      id: string;
      initialW: number;
      initialH: number;
      startClientX: number;
      startClientY: number;
    }
  | {
      type: 'shape';
      id: string;
      startClientX: number;
      startClientY: number;
      startPos: { x: number; y: number };
      isDragging: boolean;
    }
  | {
      type: 'shape-resize';
      id: string;
      initialW: number;
      initialH: number;
      startClientX: number;
      startClientY: number;
    }
  | null;

export const ResearchCanvas: React.FC<ResearchCanvasProps> = ({
  project,
  atoms,
  onDeleteAtom,
  onCreateAtom,
  onOpenAISidebar,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport Pan & Zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.85);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Fullscreen Canvas Mode State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Spacebar key state for pan
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Mode: Compact vs Detailed cards across canvas (default: compact)
  const [globalNodeMode, setGlobalNodeMode] = useState<CanvasNodeMode>('compact');

  // Per-card override for shrink / expand app window
  const [shrunkCardIds, setShrunkCardIds] = useState<Set<string>>(new Set());

  // Per-card custom resize dimensions { width, height }
  const [cardSizes, setCardSizes] = useState<Record<string, CanvasNodeSize>>({});

  // Active Tool: Select/Pointer vs Pan Hand
  const [activeTool, setActiveTool] = useState<'pointer' | 'hand'>('pointer');

  // Spatial node coordinates (atomId -> {x, y})
  const [positions, setPositions] = useState<Record<string, CanvasNodePosition>>({});
  
  // Drag state with threshold support (prevents accidental movement on click, enables 60fps seamless move)
  const [dragState, setDragState] = useState<DragState>(null);

  // Selection state
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  // Connecting line interactive state (Figma prototype style)
  const [connectingFrom, setConnectingFrom] = useState<{ id: string; port: 'top' | 'bottom' | 'left' | 'right' } | null>(null);
  const [isDragConnecting, setIsDragConnecting] = useState(false);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Figma-style Sections (Folders)
  const [folders, setFolders] = useState<CanvasFolder[]>([]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

  // Custom Shapes & Sticky notes on canvas
  const [shapes, setShapes] = useState<CanvasShape[]>([]);
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);

  // Directed Connection links
  const [links, setLinks] = useState<CanvasLink[]>([]);

  // Context Re-Builder expanded card ID
  const [expandedContextAtomId, setExpandedContextAtomId] = useState<string | null>(null);

  // Toggle for DOM Block code inspection vs live UI preview
  const [blockCodeViewIds, setBlockCodeViewIds] = useState<Set<string>>(new Set());

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

  // Keyboard shortcut listener (Spacebar for pan, Esc/F for fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' && 
        (e.target as HTMLElement).tagName !== 'INPUT' && 
        (e.target as HTMLElement).tagName !== 'TEXTAREA'
      ) {
        setIsSpacePressed(true);
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
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
  }, [isFullscreen]);

  // Initialize and distribute card positions around center of canvas with dynamic column height tracking
  useEffect(() => {
    setPositions((prev) => {
      const updated = { ...prev };
      let changed = false;

      // Track bottom Y coordinate for 4 columns to prevent vertical overlaps
      const colBottoms = [
        CANVAS_CENTER_Y - 450,
        CANVAS_CENTER_Y - 450,
        CANVAS_CENTER_Y - 450,
        CANVAS_CENTER_Y - 450,
      ];

      const getEstimatedHeight = (atom: ResearchAtom) => {
        if (atom.type === 'image' || atom.content?.imageUrl) return 280;
        if (atom.type === 'quote' || atom.type === 'link') return 180;
        if (atom.type === 'block') return 340;
        const textLen = (atom.content?.text || atom.content?.markdownContent || '').length;
        if (textLen > 300) return 340;
        return 240;
      };

      // Seed with existing nodes
      (atoms || []).forEach((atom) => {
        if (atom && updated[atom.id]) {
          const x = updated[atom.id].x;
          const y = updated[atom.id].y;
          const approxCol = Math.min(3, Math.max(0, Math.round((x - (CANVAS_CENTER_X - 700)) / 390)));
          colBottoms[approxCol] = Math.max(colBottoms[approxCol], y + getEstimatedHeight(atom) + 40);
        }
      });

      (atoms || []).forEach((atom) => {
        if (atom && !updated[atom.id]) {
          // Find the column with the minimum bottom Y
          let minCol = 0;
          for (let c = 1; c < 4; c++) {
            if (colBottoms[c] < colBottoms[minCol]) {
              minCol = c;
            }
          }

          const targetX = CANVAS_CENTER_X - 700 + minCol * 390;
          const targetY = colBottoms[minCol];

          updated[atom.id] = {
            x: targetX,
            y: targetY,
          };
          colBottoms[minCol] += getEstimatedHeight(atom) + 40;
          changed = true;
        }
      });

      return changed ? updated : prev;
    });
  }, [atoms]);

  // Handle Alt + Wheel for Zoom & Scroll for Pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    if (e.altKey || e.ctrlKey || e.metaKey) {
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
  }, [zoom, pan]);

  // Canvas background mousedown for pan
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      const isCanvasBg = 
        isSpacePressed || 
        activeTool === 'hand' || 
        target === containerRef.current || 
        target.tagName === 'svg' || 
        target.classList.contains('canvas-artboard');
      
      if (isCanvasBg) {
        setIsPanning(true);
        setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        setSelectedNodeIds(new Set());
        setConnectingFrom(null);
        setEditingFolderId(null);
        setEditingShapeId(null);
      }
    }
  };

  // Helper to check if entity center is inside a folder section
  const isContainedInFolder = (x: number, y: number, folder: CanvasFolder) => {
    return (
      x >= folder.x &&
      x <= folder.x + folder.width &&
      y >= folder.y &&
      y <= folder.y + folder.height
    );
  };

  // Find all items contained inside a folder
  const getContainedEntities = useCallback((folder: CanvasFolder) => {
    const containedNodes = atoms
      .filter((a) => {
        const pos = positions[a.id];
        if (!pos) return false;
        const size = cardSizes[a.id] || { width: 340, height: 220 };
        return isContainedInFolder(pos.x + size.width / 2, pos.y + 40, folder);
      })
      .map((a) => a.id);

    const containedShapes = shapes
      .filter((s) => isContainedInFolder(s.x + s.width / 2, s.y + s.height / 2, folder))
      .map((s) => s.id);

    const containedFolders = folders
      .filter((f) => f.id !== folder.id && isContainedInFolder(f.x + f.width / 2, f.y + f.height / 2, folder))
      .map((f) => f.id);

    return { containedNodes, containedShapes, containedFolders };
  }, [atoms, positions, shapes, folders, cardSizes]);

  // Seamless 60fps Mouse Move Handler (Zero snapping, real-time Figma feel)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;
    setMouseCanvasPos({ x: canvasX, y: canvasY });

    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
      return;
    }

    if (!dragState) return;

    // Node Drag with sub-pixel precision
    if (dragState.type === 'node') {
      const dist = Math.hypot(e.clientX - dragState.startClientX, e.clientY - dragState.startClientY);
      if (!dragState.isDragging && dist < DRAG_THRESHOLD) {
        return;
      }

      if (!dragState.isDragging) {
        setDragState({ ...dragState, isDragging: true });
      }

      const deltaX = (e.clientX - dragState.startClientX) / zoom;
      const deltaY = (e.clientY - dragState.startClientY) / zoom;

      setPositions((prev) => ({
        ...prev,
        [dragState.id]: {
          x: Math.max(20, Math.min(CANVAS_WIDTH - 400, dragState.startPos.x + deltaX)),
          y: Math.max(20, Math.min(CANVAS_HEIGHT - 400, dragState.startPos.y + deltaY)),
        },
      }));
    } 
    // Node Resize
    else if (dragState.type === 'node-resize') {
      const deltaW = (e.clientX - dragState.startClientX) / zoom;
      const deltaH = (e.clientY - dragState.startClientY) / zoom;
      setCardSizes((prev) => ({
        ...prev,
        [dragState.id]: {
          width: Math.max(280, Math.min(900, dragState.initialW + deltaW)),
          height: Math.max(160, Math.min(1000, dragState.initialH + deltaH)),
        },
      }));
    }
    // Figma Section Drag (Seamlessly moves section + all contained items)
    else if (dragState.type === 'folder') {
      const dist = Math.hypot(e.clientX - dragState.startClientX, e.clientY - dragState.startClientY);
      if (!dragState.isDragging && dist < DRAG_THRESHOLD) {
        return;
      }

      if (!dragState.isDragging) {
        setDragState({ ...dragState, isDragging: true });
      }

      const deltaX = (e.clientX - dragState.startClientX) / zoom;
      const deltaY = (e.clientY - dragState.startClientY) / zoom;

      const newFolderX = Math.max(20, Math.min(CANVAS_WIDTH - 400, dragState.startFolderX + deltaX));
      const newFolderY = Math.max(20, Math.min(CANVAS_HEIGHT - 400, dragState.startFolderY + deltaY));

      // Move Section
      setFolders((prev) =>
        prev.map((f) => (f.id === dragState.id ? { ...f, x: newFolderX, y: newFolderY } : f))
      );

      // Seamlessly move all contained atoms
      if (dragState.containedNodeIds.length > 0) {
        setPositions((prev) => {
          const next = { ...prev };
          dragState.containedNodeIds.forEach((id) => {
            const start = dragState.startPositions[id];
            if (start) {
              next[id] = {
                x: start.x + deltaX,
                y: start.y + deltaY,
              };
            }
          });
          return next;
        });
      }

      // Seamlessly move all contained shapes / notes
      if (dragState.containedShapeIds.length > 0) {
        setShapes((prev) =>
          prev.map((s) => {
            const start = dragState.startShapePositions[s.id];
            return start ? { ...s, x: start.x + deltaX, y: start.y + deltaY } : s;
          })
        );
      }

      // Seamlessly move nested folders
      if (dragState.containedFolderIds.length > 0) {
        setFolders((prev) =>
          prev.map((f) => {
            if (f.id === dragState.id) return f;
            const start = dragState.startFolderPositions[f.id];
            return start ? { ...f, x: start.x + deltaX, y: start.y + deltaY } : f;
          })
        );
      }
    }
    // Folder Resize
    else if (dragState.type === 'folder-resize') {
      const deltaW = (e.clientX - dragState.startClientX) / zoom;
      const deltaH = (e.clientY - dragState.startClientY) / zoom;
      setFolders((prev) =>
        prev.map((f) =>
          f.id === dragState.id
            ? {
                ...f,
                width: Math.max(300, dragState.initialW + deltaW),
                height: Math.max(200, dragState.initialH + deltaH),
              }
            : f
        )
      );
    }
    // Shape Drag
    else if (dragState.type === 'shape') {
      const dist = Math.hypot(e.clientX - dragState.startClientX, e.clientY - dragState.startClientY);
      if (!dragState.isDragging && dist < DRAG_THRESHOLD) {
        return;
      }

      if (!dragState.isDragging) {
        setDragState({ ...dragState, isDragging: true });
      }

      const deltaX = (e.clientX - dragState.startClientX) / zoom;
      const deltaY = (e.clientY - dragState.startClientY) / zoom;

      setShapes((prev) =>
        prev.map((s) =>
          s.id === dragState.id
            ? { ...s, x: Math.max(20, dragState.startPos.x + deltaX), y: Math.max(20, dragState.startPos.y + deltaY) }
            : s
        )
      );
    }
    // Shape Resize
    else if (dragState.type === 'shape-resize') {
      const deltaW = (e.clientX - dragState.startClientX) / zoom;
      const deltaH = (e.clientY - dragState.startClientY) / zoom;
      setShapes((prev) =>
        prev.map((s) =>
          s.id === dragState.id
            ? {
                ...s,
                width: Math.max(140, dragState.initialW + deltaW),
                height: Math.max(80, dragState.initialH + deltaH),
              }
            : s
        )
      );
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDragState(null);

    // If drag-connecting and released over a valid target node/folder/shape
    if (isDragConnecting && connectingFrom) {
      if (hoveredTargetId && hoveredTargetId !== connectingFrom.id) {
        setLinks((prev) => [
          ...prev,
          {
            id: `link-${Date.now()}`,
            fromId: connectingFrom.id,
            toId: hoveredTargetId,
            fromPort: connectingFrom.port,
            toPort: 'left',
            type: 'relates',
          },
        ]);
        setConnectingFrom(null);
        setHoveredTargetId(null);
      }
      setIsDragConnecting(false);
    }
  };

  // Node Mouse Down handler
  const handleNodeMouseDown = (e: React.MouseEvent, atomId: string) => {
    e.stopPropagation();
    if (isSpacePressed || activeTool === 'hand') return;

    if (connectingFrom) {
      if (connectingFrom.id !== atomId) {
        setLinks((prev) => [
          ...prev,
          {
            id: `link-${Date.now()}`,
            fromId: connectingFrom.id,
            toId: atomId,
            fromPort: connectingFrom.port,
            toPort: 'left',
            type: 'relates',
          },
        ]);
      }
      setConnectingFrom(null);
      setIsDragConnecting(false);
      setHoveredTargetId(null);
      return;
    }

    if (e.shiftKey || e.metaKey) {
      setSelectedNodeIds((prev) => {
        const next = new Set(prev);
        if (next.has(atomId)) next.delete(atomId);
        else next.add(atomId);
        return next;
      });
      return;
    }

    setSelectedNodeIds(new Set([atomId]));

    const pos = positions[atomId] || { x: 0, y: 0 };
    setDragState({
      type: 'node',
      id: atomId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPos: { ...pos },
      isDragging: false,
    });
  };

  // Node Resize Mouse Down
  const handleNodeResizeMouseDown = (e: React.MouseEvent, atomId: string) => {
    e.stopPropagation();
    const currentSize = cardSizes[atomId] || { width: 340, height: 260 };
    setDragState({
      type: 'node-resize',
      id: atomId,
      initialW: currentSize.width,
      initialH: currentSize.height,
      startClientX: e.clientX,
      startClientY: e.clientY,
    });
  };

  // Connector Port Mouse Down (Figma prototype drag-to-connect)
  const handlePortMouseDown = (e: React.MouseEvent, entityId: string, port: 'top' | 'bottom' | 'left' | 'right') => {
    e.stopPropagation();
    setConnectingFrom({ id: entityId, port });
    setIsDragConnecting(true);
  };

  // Connector Port Click (Click-to-connect fallback)
  const handlePortClick = (e: React.MouseEvent, entityId: string, port: 'top' | 'bottom' | 'left' | 'right') => {
    e.stopPropagation();
    if (!connectingFrom) {
      setConnectingFrom({ id: entityId, port });
    } else {
      if (connectingFrom.id !== entityId) {
        setLinks((prev) => [
          ...prev,
          {
            id: `link-${Date.now()}`,
            fromId: connectingFrom.id,
            toId: entityId,
            fromPort: connectingFrom.port,
            toPort: port,
            type: 'relates',
          },
        ]);
      }
      setConnectingFrom(null);
      setIsDragConnecting(false);
      setHoveredTargetId(null);
    }
  };

  // Create new Figma-style Section (Folder)
  const handleCreateNewSection = () => {
    const colorObj = SECTION_COLORS[folders.length % SECTION_COLORS.length];
    const newFolder: CanvasFolder = {
      id: `folder-${Date.now()}`,
      title: `Section ${folders.length + 1}`,
      color: `${colorObj.border} ${colorObj.bg} ${colorObj.text} ${colorObj.headerBg}`,
      x: -pan.x / zoom + 200,
      y: -pan.y / zoom + 160,
      width: 520,
      height: 440,
    };
    setFolders((prev) => [...prev, newFolder]);
    setSelectedNodeIds(new Set([newFolder.id]));
  };

  // Create new text note / sticky
  const handleCreateShape = (type: CanvasShapeType) => {
    const colorObj = SHAPE_COLORS[shapes.length % SHAPE_COLORS.length];
    const newShape: CanvasShape = {
      id: `shape-${Date.now()}`,
      type,
      text: type === 'heading' ? 'Section Header' : 'Write note here...',
      color: `${colorObj.bg} ${colorObj.border} ${colorObj.text}`,
      x: -pan.x / zoom + 220,
      y: -pan.y / zoom + 180,
      width: type === 'heading' ? 320 : 240,
      height: type === 'heading' ? 52 : 180,
    };
    setShapes((prev) => [...prev, newShape]);
    setSelectedNodeIds(new Set([newShape.id]));
  };

  // Check if an atom is contained inside any section
  const getAtomParentFolder = useCallback((atomId: string) => {
    const pos = positions[atomId];
    if (!pos) return null;
    const size = cardSizes[atomId] || { width: 340, height: 220 };
    const centerX = pos.x + size.width / 2;
    const centerY = pos.y + 40;

    return folders.find((f) => isContainedInFolder(centerX, centerY, f)) || null;
  }, [positions, folders, cardSizes]);

  // Helper to calculate exact connection port coordinates for an entity
  const getPortCoordinates = useCallback((entityId: string, port: 'top' | 'bottom' | 'left' | 'right' = 'right') => {
    const atomPos = positions[entityId];
    if (atomPos) {
      const isShrunk = shrunkCardIds.has(entityId) || globalNodeMode === 'compact';
      const size = cardSizes[entityId] || { width: isShrunk ? 320 : 360, height: isShrunk ? 120 : 220 };
      const w = isShrunk ? (size.width || 320) : (size.width || 360);
      const h = size.height || (isShrunk ? 120 : 220);
      switch (port) {
        case 'top': return { x: atomPos.x + w / 2, y: atomPos.y };
        case 'bottom': return { x: atomPos.x + w / 2, y: atomPos.y + h };
        case 'left': return { x: atomPos.x, y: atomPos.y + h / 2 };
        case 'right': return { x: atomPos.x + w, y: atomPos.y + h / 2 };
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
  }, [positions, folders, shapes, shrunkCardIds, globalNodeMode, cardSizes]);

  // Fit to screen / Center Content
  const handleFitToScreen = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Find bounding box of atoms and shapes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    atoms.forEach((a) => {
      const pos = positions[a.id];
      if (pos) {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + 360);
        maxY = Math.max(maxY, pos.y + 260);
      }
    });

    if (minX === Infinity) {
      setZoom(0.85);
      setPan({
        x: rect.width / 2 - CANVAS_CENTER_X * 0.85,
        y: rect.height / 2 - CANVAS_CENTER_Y * 0.85,
      });
      return;
    }

    const bboxW = Math.max(maxX - minX + 120, 600);
    const bboxH = Math.max(maxY - minY + 120, 400);
    const fitZoom = Math.min(Math.max(Math.min((rect.width - 100) / bboxW, (rect.height - 100) / bboxH), 0.3), 1.2);
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(fitZoom);
    setPan({
      x: rect.width / 2 - centerX * fitZoom,
      y: rect.height / 2 - centerY * fitZoom,
    });
  };

  // Toggle Fullscreen Mode
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // Auto-Organize Nodes around center
  const handleAutoOrganize = () => {
    setPositions(() => {
      const updated: Record<string, CanvasNodePosition> = {};
      atoms.forEach((atom, idx) => {
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        updated[atom.id] = {
          x: CANVAS_CENTER_X - 700 + col * 380,
          y: CANVAS_CENTER_Y - 450 + row * 320,
        };
      });
      return updated;
    });
  };

  // Toggle individual card shrink / expand window
  const toggleCardShrink = (atomId: string) => {
    setShrunkCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(atomId)) next.delete(atomId);
      else next.add(atomId);
      return next;
    });
  };

  // Toggle Block Code View
  const toggleBlockCodeView = (atomId: string) => {
    setBlockCodeViewIds((prev) => {
      const next = new Set(prev);
      if (next.has(atomId)) next.delete(atomId);
      else next.add(atomId);
      return next;
    });
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDownCanvas}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`overflow-hidden bg-[#FAFBFD] dark:bg-[#09090B] select-none font-sans ${
        isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : 'relative w-full h-full'
      } ${
        isSpacePressed || activeTool === 'hand' || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
    >
      {/* TOP TOOLBAR */}
      <div className="absolute top-3 left-4 z-30 flex items-center gap-1.5 bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] rounded-xl px-2 py-1.5 shadow-sm text-xs">
        {/* Tool Select: Pointer vs Hand */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setActiveTool('pointer')}
            className={`p-1.5 rounded-lg transition-colors ${activeTool === 'pointer' && !isSpacePressed ? 'bg-[#325FEC] text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#202024]'}`}
            title="Select & Move (V)"
          >
            <Cursor size={13} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('hand')}
            className={`p-1.5 rounded-lg transition-colors ${activeTool === 'hand' || isSpacePressed ? 'bg-[#325FEC] text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#202024]'}`}
            title="Pan Canvas (Hold Spacebar + Drag)"
          >
            <HandGrabbing size={13} weight="bold" />
          </button>
        </div>

        <div className="h-4 w-px bg-[#D2DCEA] dark:bg-[#27272A]" />

        {/* Global Mode Switcher: Compact vs Detailed (Icons only) */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setGlobalNodeMode('compact')}
            className={`p-1.5 rounded-lg transition-colors ${
              globalNodeMode === 'compact' ? 'bg-[#325FEC] text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#202024]'
            }`}
            title="Compact View"
          >
            <Rows size={13} />
          </button>
          <button
            type="button"
            onClick={() => setGlobalNodeMode('detailed')}
            className={`p-1.5 rounded-lg transition-colors ${
              globalNodeMode === 'detailed' ? 'bg-[#325FEC] text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#202024]'
            }`}
            title="Detailed View"
          >
            <ListDashes size={13} />
          </button>
        </div>

        <div className="h-4 w-px bg-[#D2DCEA] dark:bg-[#27272A]" />

        {/* Create Elements: Section, Note, Text (No plus in words) */}
        <button
          type="button"
          onClick={handleCreateNewSection}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-700 dark:text-zinc-300 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#202024] transition-colors"
          title="Create Section (Folder)"
        >
          <SquaresFour size={13} className="text-[#325FEC] dark:text-[#518FFF]" weight="bold" />
          <span>Section</span>
        </button>

        <button
          type="button"
          onClick={() => handleCreateShape('sticky')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-700 dark:text-zinc-300 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#202024] transition-colors"
          title="Add Sticky Note"
        >
          <Sticker size={13} className="text-amber-500 dark:text-amber-400" />
          <span>Note</span>
        </button>

        <button
          type="button"
          onClick={() => handleCreateShape('heading')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-700 dark:text-zinc-300 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#202024] transition-colors"
          title="Add Section Text Banner"
        >
          <TextT size={13} className="text-purple-500 dark:text-purple-400" />
          <span>Text</span>
        </button>
      </div>

      {/* 5X BOUNDED CANVAS ARTBOARD SURFACE */}
      <div
        className="absolute pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
        }}
      >
        {/* Workspace Plain Background & Subtle Dot Grid */}
        <div 
          className="absolute inset-0 bg-[#FAFBFD] dark:bg-[#09090B] canvas-artboard pointer-events-auto transition-colors"
          style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}
        >
          {/* Dot Grid Background */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30 dark:opacity-25">
            <defs>
              <pattern id="finite-canvas-grid-5x" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" className="fill-slate-400 dark:fill-zinc-600" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#finite-canvas-grid-5x)" />
          </svg>

          {/* Canvas Center Reference Guide */}
          <div 
            className="absolute pointer-events-none flex items-center justify-center opacity-10"
            style={{ left: `${CANVAS_CENTER_X - 100}px`, top: `${CANVAS_CENTER_Y - 100}px`, width: '200px', height: '200px' }}
          >
            <div className="w-full h-px bg-[#325FEC]" />
            <div className="h-full w-px bg-[#325FEC] absolute" />
          </div>
        </div>

        {/* SVG LAYER: DIRECTED CONNECTION LINES & ARROWS */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}
        >
          <defs>
            <marker
              id="arrowhead-canvas"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 8 4, 0 8" fill="#518FFF" />
            </marker>
          </defs>

          {/* Render Directed Connection Lines */}
          {links.map((link) => {
            const fromCoord = getPortCoordinates(link.fromId, link.fromPort || 'right');
            const toCoord = getPortCoordinates(link.toId, link.toPort || 'left');
            if (!fromCoord || !toCoord) return null;

            const dx = toCoord.x - fromCoord.x;
            const dy = toCoord.y - fromCoord.y;
            const midX = (fromCoord.x + toCoord.x) / 2;
            const midY = (fromCoord.y + toCoord.y) / 2;

            const controlOffset = Math.max(Math.abs(dx) * 0.4, 40);
            const cp1X = fromCoord.x + (link.fromPort === 'left' ? -controlOffset : controlOffset);
            const cp1Y = fromCoord.y;
            const cp2X = toCoord.x + (link.toPort === 'right' ? controlOffset : -controlOffset);
            const cp2Y = toCoord.y;

            const pathD = `M ${fromCoord.x} ${fromCoord.y} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${toCoord.x} ${toCoord.y}`;

            return (
              <g key={link.id} className="pointer-events-auto group">
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={20}
                  className="cursor-pointer"
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke="#325FEC"
                  strokeWidth={2.5}
                  markerEnd="url(#arrowhead-canvas)"
                  className="opacity-80 group-hover:opacity-100 group-hover:stroke-[#518FFF] transition-all"
                />
                {/* ✕ Delete Button on the link */}
                <foreignObject
                  x={midX - 12}
                  y={midY - 12}
                  width={24}
                  height={24}
                  className="overflow-visible"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLinks((prev) => prev.filter((l) => l.id !== link.id));
                    }}
                    className="w-6 h-6 rounded-full bg-[#18181B] hover:bg-rose-600 border border-[#27272A] hover:border-rose-500 text-zinc-400 hover:text-white flex items-center justify-center transition-all shadow-md cursor-pointer"
                    title="Delete connection line"
                  >
                    <X size={11} weight="bold" />
                  </button>
                </foreignObject>
              </g>
            );
          })}

          {/* Active Rubberband Connecting Line (Figma prototype style) */}
          {connectingFrom && (() => {
            const startCoord = getPortCoordinates(connectingFrom.id, connectingFrom.port);
            if (!startCoord) return null;

            let targetCoord = mouseCanvasPos;
            let targetPort: 'top' | 'bottom' | 'left' | 'right' = 'left';

            if (hoveredTargetId && hoveredTargetId !== connectingFrom.id) {
              const ports: Array<'top' | 'bottom' | 'left' | 'right'> = ['left', 'right', 'top', 'bottom'];
              let bestDist = Infinity;
              for (const p of ports) {
                const coord = getPortCoordinates(hoveredTargetId, p);
                if (coord) {
                  const d = Math.hypot(coord.x - mouseCanvasPos.x, coord.y - mouseCanvasPos.y);
                  if (d < bestDist) {
                    bestDist = d;
                    targetCoord = coord;
                    targetPort = p;
                  }
                }
              }
            }

            const dx = targetCoord.x - startCoord.x;
            const dy = targetCoord.y - startCoord.y;
            const controlOffset = Math.max(Math.hypot(dx, dy) * 0.35, 30);

            let cp1X = startCoord.x;
            let cp1Y = startCoord.y;
            if (connectingFrom.port === 'right') cp1X += controlOffset;
            else if (connectingFrom.port === 'left') cp1X -= controlOffset;
            else if (connectingFrom.port === 'bottom') cp1Y += controlOffset;
            else if (connectingFrom.port === 'top') cp1Y -= controlOffset;

            let cp2X = targetCoord.x;
            let cp2Y = targetCoord.y;
            if (targetPort === 'left') cp2X -= controlOffset;
            else if (targetPort === 'right') cp2X += controlOffset;
            else if (targetPort === 'top') cp2Y -= controlOffset;
            else if (targetPort === 'bottom') cp2Y += controlOffset;

            const rubberbandPath = `M ${startCoord.x} ${startCoord.y} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${targetCoord.x} ${targetCoord.y}`;

            return (
              <g className="pointer-events-none">
                <path
                  d={rubberbandPath}
                  fill="none"
                  stroke="#325FEC"
                  strokeWidth={6}
                  className="opacity-30"
                />
                <path
                  d={rubberbandPath}
                  fill="none"
                  stroke="#325FEC"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  className="animate-pulse"
                />
                <circle
                  cx={targetCoord.x}
                  cy={targetCoord.y}
                  r={5}
                  fill="#325FEC"
                  stroke="#ffffff"
                  strokeWidth={2}
                  className="shadow-lg"
                />
              </g>
            );
          })()}
        </svg>

        {/* HTML LAYER: SECTIONS, SHAPES, ATOM CARDS */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}
        >
          {/* RENDER FIGMA-STYLE SECTIONS (FOLDERS) */}
          {folders.map((folder) => {
            const isFolderSelected = selectedNodeIds.has(folder.id);
            const showPorts = isFolderSelected || connectingFrom !== null;

            return (
              <div
                key={folder.id}
                onMouseEnter={() => {
                  if (connectingFrom && connectingFrom.id !== folder.id) {
                    setHoveredTargetId(folder.id);
                  }
                }}
                onMouseLeave={() => {
                  if (hoveredTargetId === folder.id) {
                    setHoveredTargetId(null);
                  }
                }}
                onMouseUp={() => {
                  if (connectingFrom && connectingFrom.id !== folder.id) {
                    setLinks((prev) => [
                      ...prev,
                      {
                        id: `link-${Date.now()}`,
                        fromId: connectingFrom.id,
                        toId: folder.id,
                        fromPort: connectingFrom.port,
                        toPort: 'left',
                        type: 'relates',
                      },
                    ]);
                    setConnectingFrom(null);
                    setHoveredTargetId(null);
                    setIsDragConnecting(false);
                  }
                }}
                style={{
                  transform: `translate(${folder.x}px, ${folder.y}px)`,
                  width: `${folder.width}px`,
                  height: `${folder.height}px`,
                }}
                className={`absolute pointer-events-auto rounded-2xl border-2 transition-all ${
                  isFolderSelected 
                    ? 'border-[#325FEC] bg-[#121214]/60 ring-2 ring-[#325FEC]/30' 
                    : 'border-[#325FEC]/40 bg-[#121214]/40 hover:border-[#325FEC]/70'
                } ${
                  hoveredTargetId === folder.id && connectingFrom && connectingFrom.id !== folder.id
                    ? 'ring-4 ring-[#325FEC] ring-offset-2 border-[#325FEC] shadow-2xl shadow-blue-500/40'
                    : ''
                } flex flex-col group/folder`}
              >
                {/* Figma Section Header Tag (Attached to top-left edge) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (isSpacePressed || activeTool === 'hand') return;

                    const { containedNodes, containedShapes, containedFolders } = getContainedEntities(folder);
                    
                    const startPositions: Record<string, CanvasNodePosition> = {};
                    containedNodes.forEach((id) => {
                      if (positions[id]) startPositions[id] = { ...positions[id] };
                    });

                    const startShapePositions: Record<string, { x: number; y: number }> = {};
                    containedShapes.forEach((id) => {
                      const s = shapes.find((x) => x.id === id);
                      if (s) startShapePositions[id] = { x: s.x, y: s.y };
                    });

                    const startFolderPositions: Record<string, { x: number; y: number }> = {};
                    containedFolders.forEach((id) => {
                      const f = folders.find((x) => x.id === id);
                      if (f) startFolderPositions[id] = { x: f.x, y: f.y };
                    });

                    setDragState({
                      type: 'folder',
                      id: folder.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      startFolderX: folder.x,
                      startFolderY: folder.y,
                      containedNodeIds: containedNodes,
                      startPositions,
                      containedShapeIds: containedShapes,
                      startShapePositions,
                      containedFolderIds: containedFolders,
                      startFolderPositions,
                      isDragging: false,
                    });
                    setSelectedNodeIds(new Set([folder.id]));
                  }}
                  className="absolute -top-8 left-0 px-3 py-1 bg-[#18181B] border border-[#325FEC]/60 rounded-t-lg flex items-center gap-2 cursor-move shadow-md select-none"
                >
                  <SquaresFour size={13} className="text-[#325FEC]" weight="bold" />
                  {editingFolderId === folder.id ? (
                    <input
                      type="text"
                      defaultValue={folder.title}
                      autoFocus
                      onBlur={(e) => {
                        setFolders((prev) =>
                          prev.map((f) => (f.id === folder.id ? { ...f, title: e.target.value || 'Untitled Section' } : f))
                        );
                        setEditingFolderId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                      className="bg-[#09090B] text-zinc-100 text-xs font-semibold px-1.5 py-0.5 rounded border border-[#325FEC] outline-none"
                    />
                  ) : (
                    <span
                      onDoubleClick={() => setEditingFolderId(folder.id)}
                      className="text-xs font-semibold text-zinc-200 tracking-wide truncate max-w-[180px]"
                      title="Double click to edit section name"
                    >
                      {folder.title}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolderId(folder.id);
                    }}
                    className="text-zinc-500 hover:text-white p-0.5"
                    title="Rename Section"
                  >
                    <PencilSimple size={11} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
                    }}
                    className="text-zinc-500 hover:text-rose-400 p-0.5"
                    title="Delete Section"
                  >
                    <Trash size={11} />
                  </button>
                </div>

                {/* 4 Connector Ports on Section */}
                <button
                  type="button"
                  onMouseDown={(e) => handlePortMouseDown(e, folder.id, 'top')}
                  onClick={(e) => handlePortClick(e, folder.id, 'top')}
                  className={`absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-[#18181B] border-2 border-[#325FEC] hover:scale-130 transition-all flex items-center justify-center cursor-crosshair z-30 ${
                    showPorts ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/folder:opacity-100 group-hover/folder:pointer-events-auto'
                  }`}
                  title="Connect top"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#325FEC]" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handlePortMouseDown(e, folder.id, 'bottom')}
                  onClick={(e) => handlePortClick(e, folder.id, 'bottom')}
                  className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-[#18181B] border-2 border-[#325FEC] hover:scale-130 transition-all flex items-center justify-center cursor-crosshair z-30 ${
                    showPorts ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/folder:opacity-100 group-hover/folder:pointer-events-auto'
                  }`}
                  title="Connect bottom"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#325FEC]" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handlePortMouseDown(e, folder.id, 'left')}
                  onClick={(e) => handlePortClick(e, folder.id, 'left')}
                  className={`absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-[#18181B] border-2 border-[#325FEC] hover:scale-130 transition-all flex items-center justify-center cursor-crosshair z-30 ${
                    showPorts ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/folder:opacity-100 group-hover/folder:pointer-events-auto'
                  }`}
                  title="Connect left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#325FEC]" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handlePortMouseDown(e, folder.id, 'right')}
                  onClick={(e) => handlePortClick(e, folder.id, 'right')}
                  className={`absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-[#18181B] border-2 border-[#325FEC] hover:scale-130 transition-all flex items-center justify-center cursor-crosshair z-30 ${
                    showPorts ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/folder:opacity-100 group-hover/folder:pointer-events-auto'
                  }`}
                  title="Connect right"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#325FEC]" />
                </button>

                {/* Section Resize Handle at Bottom Right */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDragState({
                      type: 'folder-resize',
                      id: folder.id,
                      initialW: folder.width,
                      initialH: folder.height,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                    });
                  }}
                  className="absolute bottom-1 right-1 w-6 h-6 cursor-se-resize flex items-center justify-center text-zinc-500 hover:text-white select-none"
                  title="Drag to resize Section"
                >
                  ⌟
                </div>
              </div>
            );
          })}

          {/* RENDER SHAPES & STICKY NOTES */}
          {shapes.map((shape) => {
            const isShapeSelected = selectedNodeIds.has(shape.id);
            const showPorts = isShapeSelected || connectingFrom !== null;

            return (
              <div
                key={shape.id}
                onMouseEnter={() => {
                  if (connectingFrom && connectingFrom.id !== shape.id) {
                    setHoveredTargetId(shape.id);
                  }
                }}
                onMouseLeave={() => {
                  if (hoveredTargetId === shape.id) {
                    setHoveredTargetId(null);
                  }
                }}
                onMouseUp={() => {
                  if (connectingFrom && connectingFrom.id !== shape.id) {
                    setLinks((prev) => [
                      ...prev,
                      {
                        id: `link-${Date.now()}`,
                        fromId: connectingFrom.id,
                        toId: shape.id,
                        fromPort: connectingFrom.port,
                        toPort: 'left',
                        type: 'relates',
                      },
                    ]);
                    setConnectingFrom(null);
                    setHoveredTargetId(null);
                    setIsDragConnecting(false);
                  }
                }}
                style={{
                  transform: `translate(${shape.x}px, ${shape.y}px)`,
                  width: `${shape.width}px`,
                  height: `${shape.height}px`,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (isSpacePressed || activeTool === 'hand') return;
                  setSelectedNodeIds(new Set([shape.id]));
                  setDragState({
                    type: 'shape',
                    id: shape.id,
                    startClientX: e.clientX,
                    startClientY: e.clientY,
                    startPos: { x: shape.x, y: shape.y },
                    isDragging: false,
                  });
                }}
                className={`absolute pointer-events-auto rounded-xl border p-3 shadow-lg flex flex-col justify-between ${shape.color} cursor-move transition-all group/shape ${
                  hoveredTargetId === shape.id && connectingFrom && connectingFrom.id !== shape.id
                    ? 'ring-4 ring-[#325FEC] ring-offset-2 border-[#325FEC] shadow-2xl shadow-blue-500/40'
                    : ''
                }`}
              >
                {/* Text Body */}
                {editingShapeId === shape.id ? (
                  <textarea
                    defaultValue={shape.text}
                    autoFocus
                    onBlur={(e) => {
                      setShapes((prev) =>
                        prev.map((s) => (s.id === shape.id ? { ...s, text: e.target.value } : s))
                      );
                      setEditingShapeId(null);
                    }}
                    className="w-full h-full bg-transparent resize-none outline-none font-sans text-xs text-inherit"
                  />
                ) : (
                  <div
                    onDoubleClick={() => setEditingShapeId(shape.id)}
                    className="w-full h-full overflow-hidden text-xs leading-relaxed font-sans"
                    title="Double click to edit note"
                  >
                    {shape.text}
                  </div>
                )}

                {/* 4 Connector Ports */}
                <button
                  type="button"
                  onMouseDown={(e) => handlePortMouseDown(e, shape.id, 'top')}
                  onClick={(e) => handlePortClick(e, shape.id, 'top')}
                  className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#18181B] border-2 border-[#518FFF] hover:scale-130 transition-all flex items-center justify-center cursor-crosshair z-30 ${
                    showPorts ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/shape:opacity-100 group-hover/shape:pointer-events-auto'
                  }`}
                  title="Connect top"
                >
                  <span className="w-1 h-1 rounded-full bg-[#518FFF]" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handlePortMouseDown(e, shape.id, 'bottom')}
                  onClick={(e) => handlePortClick(e, shape.id, 'bottom')}
                  className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#18181B] border-2 border-[#518FFF] hover:scale-130 transition-all flex items-center justify-center cursor-crosshair z-30 ${
                    showPorts ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/shape:opacity-100 group-hover/shape:pointer-events-auto'
                  }`}
                  title="Connect bottom"
                >
                  <span className="w-1 h-1 rounded-full bg-[#518FFF]" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handlePortMouseDown(e, shape.id, 'left')}
                  onClick={(e) => handlePortClick(e, shape.id, 'left')}
                  className={`absolute top-1/2 -left-1.5 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#18181B] border-2 border-[#518FFF] hover:scale-130 transition-all flex items-center justify-center cursor-crosshair z-30 ${
                    showPorts ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/shape:opacity-100 group-hover/shape:pointer-events-auto'
                  }`}
                  title="Connect left"
                >
                  <span className="w-1 h-1 rounded-full bg-[#518FFF]" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handlePortMouseDown(e, shape.id, 'right')}
                  onClick={(e) => handlePortClick(e, shape.id, 'right')}
                  className={`absolute top-1/2 -right-1.5 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#18181B] border-2 border-[#518FFF] hover:scale-130 transition-all flex items-center justify-center cursor-crosshair z-30 ${
                    showPorts ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/shape:opacity-100 group-hover/shape:pointer-events-auto'
                  }`}
                  title="Connect right"
                >
                  <span className="w-1 h-1 rounded-full bg-[#518FFF]" />
                </button>

                {/* Shape Resize Handle */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDragState({
                      type: 'shape-resize',
                      id: shape.id,
                      initialW: shape.width,
                      initialH: shape.height,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                    });
                  }}
                  className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize text-zinc-500 hover:text-white flex items-center justify-center select-none"
                >
                  ⌟
                </div>
              </div>
            );
          })}

          {/* RENDER ATOM CARDS */}
          {atoms.map((atom) => {
            const pos = positions[atom.id] || { x: CANVAS_CENTER_X, y: CANVAS_CENTER_Y };
            const isSelected = selectedNodeIds.has(atom.id);
            const isTargetHovered = hoveredTargetId === atom.id && connectingFrom !== null && connectingFrom.id !== atom.id;
            const showPorts = isSelected || connectingFrom !== null;
            const isQuote = atom.type === 'quote' || atom.type === 'text';
            const rawQuote = atom.content?.rawText || atom.content?.text || '';
            const isContextOpen = expandedContextAtomId === atom.id;

            // Inside Section styling & parent info
            const parentFolder = getAtomParentFolder(atom.id);

            // Per-card shrink / compact toggle (Compact mode is same content, just without extra context & source footer)
            const isCardCompact = shrunkCardIds.has(atom.id) || globalNodeMode === 'compact';

            // Custom Card Dimension or default
            const customSize = cardSizes[atom.id];
            const cardWidth = customSize?.width || (isCardCompact ? 340 : 360);
            const cardMinHeight = customSize?.height;

            // DOM Block rendering data
            const isBlock = atom.type === 'block';
            const showBlockCode = blockCodeViewIds.has(atom.id);
            const blockHtml = atom.content?.sanitizedHtml || (atom.content as any)?.standaloneHtml || (atom.content as any)?.cleanHtml || '';
            const blockCode = atom.content?.rawText || blockHtml;

            // Prepare sandboxed iframe doc for live UI preview of DOM block with full CSS normalization
            const iframeSrcDoc = buildIsolatedBlockDoc({
              sanitizedHtml: blockHtml,
              standaloneHtml: (atom.content as any)?.standaloneHtml,
              sourceUrl: atom.metadata?.sourceUrl,
              theme: 'dark',
            });

            const targetLink = atom.metadata?.sourceUrl;
            let hostname = '';
            if (atom.metadata?.sourceUrl) {
              try {
                hostname = new URL(atom.metadata.sourceUrl).hostname;
              } catch {
                hostname = atom.metadata.sourceUrl.replace(/^https?:\/\//, '').split('/')[0] || 'source';
              }
            }

            return (
              <div
                key={atom.id}
                onMouseDown={(e) => handleNodeMouseDown(e, atom.id)}
                onMouseEnter={() => {
                  if (connectingFrom && connectingFrom.id !== atom.id) {
                    setHoveredTargetId(atom.id);
                  }
                }}
                onMouseLeave={() => {
                  if (hoveredTargetId === atom.id) {
                    setHoveredTargetId(null);
                  }
                }}
                onMouseUp={() => {
                  if (connectingFrom && connectingFrom.id !== atom.id) {
                    setLinks((prev) => [
                      ...prev,
                      {
                        id: `link-${Date.now()}`,
                        fromId: connectingFrom.id,
                        toId: atom.id,
                        fromPort: connectingFrom.port,
                        toPort: 'left',
                        type: 'relates',
                      },
                    ]);
                    setConnectingFrom(null);
                    setHoveredTargetId(null);
                    setIsDragConnecting(false);
                  }
                }}
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                  width: `${cardWidth}px`,
                  minHeight: cardMinHeight ? `${cardMinHeight}px` : undefined,
                }}
                className={`absolute pointer-events-auto rounded-2xl border shadow-xl transition-all duration-150 group/node ${
                  parentFolder
                    ? 'bg-[#EEF3F8] dark:bg-[#18181B] border-[#325FEC]/40 ring-1 ring-[#325FEC]/20 shadow-blue-900/5'
                    : 'bg-[#FAFBFD] dark:bg-[#121214] border-[#D2DCEA] dark:border-[#27272A] hover:border-[#CBD5E1] dark:hover:border-[#3F3F46]'
                } ${
                  isSelected ? 'border-[#325FEC] ring-2 ring-[#325FEC]/40 shadow-blue-500/20' : ''
                } ${
                  isTargetHovered ? 'ring-4 ring-[#325FEC] ring-offset-2 border-[#325FEC] shadow-2xl shadow-blue-500/40 scale-[1.02]' : ''
                } ${isCardCompact ? 'p-3.5' : 'p-4'} flex flex-col justify-between`}
              >
                {/* 4 FIGMA PROTOTYPE CONNECTOR PORTS */}
                <button
                  type="button"
                  onMouseDown={(e) => handlePortMouseDown(e, atom.id, 'top')}
                  onClick={(e) => handlePortClick(e, atom.id, 'top')}
                  className={`absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-[#18181B] border-2 border-[#325FEC] hover:border-[#518FFF] hover:scale-130 transition-all flex items-center justify-center shadow-md cursor-crosshair z-30 ${
                    showPorts ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/node:opacity-100 group-hover/node:pointer-events-auto'
                  }`}
                  title="Connect from top"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#325FEC]" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handlePortMouseDown(e, atom.id, 'bottom')}
                  onClick={(e) => handlePortClick(e, atom.id, 'bottom')}
                  className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-[#18181B] border-2 border-[#325FEC] hover:border-[#518FFF] hover:scale-130 transition-all flex items-center justify-center shadow-md cursor-crosshair z-30 ${
                    showPorts ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/node:opacity-100 group-hover/node:pointer-events-auto'
                  }`}
                  title="Connect from bottom"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#325FEC]" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handlePortMouseDown(e, atom.id, 'left')}
                  onClick={(e) => handlePortClick(e, atom.id, 'left')}
                  className={`absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-[#18181B] border-2 border-[#325FEC] hover:border-[#518FFF] hover:scale-130 transition-all flex items-center justify-center shadow-md cursor-crosshair z-30 ${
                    showPorts ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/node:opacity-100 group-hover/node:pointer-events-auto'
                  }`}
                  title="Connect from left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#325FEC]" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handlePortMouseDown(e, atom.id, 'right')}
                  onClick={(e) => handlePortClick(e, atom.id, 'right')}
                  className={`absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-[#18181B] border-2 border-[#325FEC] hover:border-[#518FFF] hover:scale-130 transition-all flex items-center justify-center shadow-md cursor-crosshair z-30 ${
                    showPorts ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover/node:opacity-100 group-hover/node:pointer-events-auto'
                  }`}
                  title="Connect from right"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#325FEC]" />
                </button>

                <div>
                  {/* Inside Section Tag */}
                  {parentFolder && (
                    <div className="text-[9.5px] font-mono text-[#325FEC] dark:text-blue-400 mb-1.5 flex items-center gap-1 font-semibold">
                      <span>📁 In Section: {parentFolder.title}</span>
                    </div>
                  )}

                  {/* Card Header with Atom Badge & Window Shrink Controls */}
                  <div className="flex items-center justify-between gap-2 mb-2.5 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {atom.metadata?.domainFavicon && (
                        <img 
                          src={atom.metadata.domainFavicon} 
                          alt="" 
                          className="w-3.5 h-3.5 rounded-sm object-contain flex-shrink-0"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      )}
                      <span className="font-mono text-[10.5px] text-slate-500 dark:text-zinc-400 truncate">
                        {hostname || 'source'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Atom Type Badge with Semantic Colors */}
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${getAtomTypeSemanticStyle(atom.type)}`}>
                        {isQuote && <Quotes size={11} className="text-blue-600 dark:text-blue-400" weight="fill" />}
                        {atom.type === 'note' && <FileText size={11} className="text-purple-600 dark:text-purple-400" />}
                        {isBlock && <Code size={11} className="text-emerald-600 dark:text-emerald-400" />}
                        {atom.type === 'image' && <ImageIcon size={11} className="text-amber-600 dark:text-amber-400" />}
                        {atom.type === 'link' && <LinkSimple size={11} className="text-sky-600 dark:text-sky-400" />}
                        <span>{atom.type}</span>
                      </span>

                      {/* Shrink / Expand Window Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCardShrink(atom.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F1F4F9] dark:hover:bg-[#222226] transition-colors"
                        title={isCardCompact ? 'Expand card details' : 'Shrink card'}
                      >
                        {isCardCompact ? <ArrowsOutSimple size={12} /> : <ArrowsIn size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* PRIMARY VISUAL CONTENT */}
                  <div className="space-y-2.5">
                    {/* Quotes */}
                    {isQuote && rawQuote && (
                      <div className="space-y-1.5">
                        <blockquote className="text-[13px] leading-relaxed text-[#0F172A] dark:text-[#E4E4E7] font-normal border-l-2 border-[#325FEC] pl-3 py-0.5">
                          "{semanticHighlightText(rawQuote)}"
                        </blockquote>

                        {/* Context Re-Builder Button (Detailed Mode Only) */}
                        {!isCardCompact && (
                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedContextAtomId(isContextOpen ? null : atom.id);
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10.5px] font-sans font-medium text-slate-600 dark:text-zinc-400 hover:text-[#325FEC] dark:hover:text-[#518FFF] bg-[#F1F4F9] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] transition-all cursor-pointer"
                            >
                              <BookOpen size={12} className="text-[#325FEC] dark:text-[#518FFF]" />
                              <span>{isContextOpen ? 'Hide Context' : 'Expand Context'}</span>
                            </button>
                          </div>
                        )}

                        {/* Context Re-Builder View (Detailed Mode Only) */}
                        {!isCardCompact && isContextOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="p-3 rounded-xl bg-[#F8F9FB] dark:bg-[#09090B] border border-[#E2E5EB] dark:border-[#27272A] text-xs space-y-2 animate-fadeIn"
                          >
                            <div className="text-[9.5px] font-mono text-slate-500 dark:text-zinc-400 uppercase font-semibold">
                              {atom.metadata?.sectionHeading || 'Source Section'}
                            </div>
                            {atom.metadata?.contextPrefix && (
                              <p className="text-slate-500 dark:text-zinc-400 italic text-[11px]">… {atom.metadata.contextPrefix}</p>
                            )}
                            <div className="p-2 bg-[#F1F4F9] dark:bg-[#18181B] rounded text-[#0F172A] dark:text-zinc-100 border-l-2 border-[#325FEC] text-[11.5px]">
                              "{semanticHighlightText(rawQuote)}"
                            </div>
                            {atom.metadata?.contextSuffix && (
                              <p className="text-slate-500 dark:text-zinc-400 italic text-[11px]">{atom.metadata.contextSuffix} …</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* DOM Block Rendered as Authentic Visual HTML UI */}
                    {isBlock && (
                      <div className="rounded-xl bg-[#F8F9FB] dark:bg-[#09090B] border border-[#E2E5EB] dark:border-[#27272A] overflow-hidden">
                        {!isCardCompact && (
                          <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#F1F4F9] dark:bg-[#18181B] border-b border-[#E2E5EB] dark:border-[#27272A] text-[10px] font-mono">
                            <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[180px]">
                              {atom.metadata?.domCssSelector || 'DOM Element'}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBlockCodeView(atom.id);
                                }}
                                className={`px-2 py-0.5 rounded text-[9.5px] transition-colors ${
                                  !showBlockCode 
                                    ? 'bg-white dark:bg-[#27272A] text-[#0F172A] dark:text-white font-semibold shadow-xs' 
                                    : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white'
                                }`}
                              >
                                <Eye size={10} className="inline mr-1" />
                                <span>UI Preview</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBlockCodeView(atom.id);
                                }}
                                className={`px-2 py-0.5 rounded text-[9.5px] transition-colors ${
                                  showBlockCode 
                                    ? 'bg-white dark:bg-[#27272A] text-[#0F172A] dark:text-white font-semibold shadow-xs' 
                                    : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white'
                                }`}
                              >
                                <Code size={10} className="inline mr-1" />
                                <span>HTML</span>
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="p-2">
                          {!showBlockCode ? (
                            <div className="w-full rounded-lg overflow-hidden bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A]">
                              <iframe
                                srcDoc={iframeSrcDoc}
                                title="DOM Block Visual Preview"
                                sandbox="allow-same-origin allow-scripts"
                                className="w-full h-44 border-0 rounded bg-transparent"
                              />
                            </div>
                          ) : (
                            <pre className="max-h-44 overflow-auto p-2.5 bg-slate-900 text-emerald-400 dark:bg-black rounded-lg font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-all border border-[#E2E5EB] dark:border-[#27272A]">
                              <code>{blockCode}</code>
                            </pre>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Note Rendered with Unified Block Renderer */}
                    {atom.type === 'note' && (
                      <div className="space-y-1 text-slate-700 dark:text-zinc-300">
                        {atom.title && <h4 className="font-semibold text-[#0F172A] dark:text-zinc-100 text-sm mb-1">{atom.title}</h4>}
                        <FormattedAIMessage
                          content={atom.content?.markdownContent || atom.content?.description || ''}
                          className="line-clamp-4 overflow-hidden"
                        />
                      </div>
                    )}

                    {/* Image Preview */}
                    {atom.type === 'image' && atom.content?.imageUrl && (
                      <div className="space-y-1.5">
                        <img
                          src={atom.content.imageUrl}
                          alt=""
                          className="w-full h-36 object-cover rounded-xl border border-[#E2E5EB] dark:border-[#27272A]"
                        />
                        {atom.content?.ocrText && (
                          <div className="text-[10.5px] font-mono text-slate-600 dark:text-zinc-400 bg-slate-100/80 dark:bg-black/40 p-2 rounded-lg border border-[#E2E5EB] dark:border-[#27272A] line-clamp-2">
                            {semanticHighlightText(atom.content.ocrText)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Link */}
                    {atom.type === 'link' && (
                      <div className="text-[12px] text-[#325FEC] dark:text-[#518FFF] hover:underline truncate">
                        <a href={targetLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          {atom.title || targetLink}
                        </a>
                      </div>
                    )}

                    {/* Context Tags (Visible in BOTH Compact and Detailed Views) */}
                    {atom.tags && atom.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        {atom.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 text-[9.5px] font-sans font-medium text-slate-600 dark:text-zinc-400 bg-[#F1F4F9] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] px-1.5 py-0.5 rounded-md"
                          >
                            <Tag size={10} className="text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                            <span>{t.replace(/^#+/, '')}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer Source Link (Detailed Mode Only) */}
                    {!isCardCompact && targetLink && (
                      <div className="pt-2 border-t border-[#E2E5EB] dark:border-[#1E1E22] flex items-center justify-between text-[10.5px] text-slate-500 dark:text-zinc-500">
                        <span className="truncate max-w-[140px]">{hostname}</span>
                        <a
                          href={targetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-[#0F172A] dark:hover:text-zinc-300 flex items-center gap-0.5 text-[#325FEC] dark:text-[#518FFF] flex-shrink-0"
                        >
                          <span>Open Source</span>
                          <ArrowSquareOut size={11} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Corner Resize Handle to Scale / Resize Card */}
                <div
                  onMouseDown={(e) => handleNodeResizeMouseDown(e, atom.id)}
                  className="self-end -mr-1.5 -mb-1.5 w-5 h-5 cursor-se-resize flex items-center justify-center text-slate-400 dark:text-zinc-600 hover:text-[#0F172A] dark:hover:text-white select-none"
                  title="Drag to resize card"
                >
                  ⌟
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FLOATING BOTTOM ZOOM, FIT & FULLSCREEN HUD */}
      <div className="absolute bottom-5 left-5 z-20 flex items-center gap-1.5 bg-white/95 dark:bg-[#121214]/90 backdrop-blur-md border border-[#E2E5EB] dark:border-[#27272A] rounded-xl p-1.5 shadow-xl text-xs font-mono text-slate-700 dark:text-zinc-300">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(z + 0.15, 2.5))}
          className="p-1.5 rounded-lg hover:bg-[#F1F4F9] dark:hover:bg-[#18181B] text-slate-600 dark:text-zinc-300 hover:text-[#0F172A] dark:hover:text-white transition-colors"
          title="Zoom In (Alt + Scroll Up)"
        >
          <Plus size={14} />
        </button>
        <span className="px-1 text-[11px] font-semibold text-slate-600 dark:text-zinc-400 min-w-[38px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.15))}
          className="p-1.5 rounded-lg hover:bg-[#F1F4F9] dark:hover:bg-[#18181B] text-slate-600 dark:text-zinc-300 hover:text-[#0F172A] dark:hover:text-white transition-colors"
          title="Zoom Out (Alt + Scroll Down)"
        >
          <Minus size={14} />
        </button>

        <div className="h-4 w-px bg-[#E2E5EB] dark:bg-[#27272A] mx-0.5" />

        {/* Fit to View Button */}
        <button
          type="button"
          onClick={handleFitToScreen}
          className="p-1.5 rounded-lg hover:bg-[#F1F4F9] dark:hover:bg-[#18181B] text-slate-600 dark:text-zinc-300 hover:text-[#0F172A] dark:hover:text-white transition-colors"
          title="Fit Canvas to View"
        >
          <ArrowsOut size={14} />
        </button>

        {/* Fullscreen Canvas Toggle Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className={`p-1.5 rounded-lg transition-colors ${
            isFullscreen ? 'bg-[#325FEC] text-white' : 'hover:bg-[#F1F4F9] dark:hover:bg-[#18181B] text-slate-600 dark:text-zinc-300 hover:text-[#0F172A] dark:hover:text-white'
          }`}
          title={isFullscreen ? 'Exit Fullscreen Canvas (Esc)' : 'Enter Fullscreen Canvas'}
        >
          {isFullscreen ? <CornersIn size={14} /> : <CornersOut size={14} />}
        </button>

        <button
          type="button"
          onClick={handleAutoOrganize}
          className="p-1.5 rounded-lg hover:bg-[#F1F4F9] dark:hover:bg-[#18181B] text-slate-600 dark:text-zinc-300 hover:text-[#0F172A] dark:hover:text-white transition-colors"
          title="Auto-Arrange Layout"
        >
          <ArrowsClockwise size={14} />
        </button>
      </div>
    </div>
  );
};
