import React from 'react';

// Brutalist project marks: flat fill, hard edges, no gradients. Each shape has a
// different silhouette (corner count, symmetry, holes) so they stay apart at 16px.
export const PROJECT_SHAPES = [
  { id: 'square', label: 'Square', path: 'M3 3H21V21H3Z' },
  { id: 'circle', label: 'Circle', path: 'M12 2A10 10 0 1 0 12 22A10 10 0 1 0 12 2Z' },
  { id: 'triangle', label: 'Triangle', path: 'M12 3L22 21H2Z' },
  { id: 'diamond', label: 'Diamond', path: 'M12 2L22 12L12 22L2 12Z' },
  { id: 'cross', label: 'Cross', path: 'M8 2H16V8H22V16H16V22H8V16H2V8H8Z' },
  { id: 'hexagon', label: 'Hexagon', path: 'M7 3H17L22 12L17 21H7L2 12Z' },
  { id: 'star', label: 'Spark', path: 'M12 1L15 9L23 12L15 15L12 23L9 15L1 12L9 9Z' },
  { id: 'half', label: 'Half circle', path: 'M2 18A10 10 0 0 1 22 18Z' },
  { id: 'ring', label: 'Ring', path: 'M12 2A10 10 0 1 0 12 22A10 10 0 1 0 12 2ZM12 8A4 4 0 1 1 12 16A4 4 0 1 1 12 8Z', evenodd: true },
  { id: 'bars', label: 'Bars', path: 'M3 3H21V8H3ZM3 10H21V14H3ZM3 16H21V21H3Z' },
  { id: 'corner', label: 'Corner', path: 'M3 3H21V9H9V21H3Z' },
  { id: 'chevron', label: 'Chevron', path: 'M3 3H11L21 12L11 21H3L13 12Z' },
] as const;

export type ProjectShapeId = (typeof PROJECT_SHAPES)[number]['id'];

export const DEFAULT_SHAPE: ProjectShapeId = 'square';

const SHAPE_BY_ID = new Map<string, (typeof PROJECT_SHAPES)[number]>(
  PROJECT_SHAPES.map((s) => [s.id, s])
);

export function isProjectShape(value: unknown): value is ProjectShapeId {
  return typeof value === 'string' && SHAPE_BY_ID.has(value);
}

// Projects made before shapes existed have none; give them a stable one from their id
// so they still differ from each other.
export function resolveProjectShape(shape: string | undefined, seed: string): ProjectShapeId {
  if (isProjectShape(shape)) return shape;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PROJECT_SHAPES[h % PROJECT_SHAPES.length].id;
}

interface ProjectIconProps {
  shape?: string;
  color?: string;
  seed: string;
  size?: number;
  className?: string;
}

export const ProjectIcon: React.FC<ProjectIconProps> = ({
  shape,
  color = '#325FEC',
  seed,
  size = 18,
  className,
}) => {
  const def = SHAPE_BY_ID.get(resolveProjectShape(shape, seed))!;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={def.path}
        fill={color}
        fillRule={'evenodd' in def ? 'evenodd' : 'nonzero'}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="miter"
      />
    </svg>
  );
};
