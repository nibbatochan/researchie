import React from 'react';
import type { WireBlock, WirePage } from '@/lib/paper/wireframe';

// A paper page drawn as a wireframe: a white sheet, grey lines for text, and a small label where each part
// sits. Sizes use container units, so the same page reads at full size in the picker and as a thumbnail in the
// paper list. It shows the shape of a paper, not journal formatting. The sheet stays white in dark mode on purpose.

const LINE_WIDTHS = [100, 97, 100, 92, 100, 86, 100, 64];

const Lines: React.FC<{ n: number; seed?: number }> = ({ n, seed = 0 }) => (
  <div className="flex flex-col" style={{ gap: '1.5cqw' }}>
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="rounded-full bg-[#DCE3EF]" style={{ height: '0.9cqw', width: `${i === n - 1 ? 58 : LINE_WIDTHS[(i + seed) % LINE_WIDTHS.length]}%` }} />
    ))}
  </div>
);

const Label: React.FC<{ children: React.ReactNode; sub?: boolean }> = ({ children, sub }) => (
  <div className={`font-semibold leading-none truncate ${sub ? 'text-[#64748B]' : 'text-[#0F172A]'}`} style={{ fontSize: sub ? '2.5cqw' : '3.1cqw', marginBottom: '1.6cqw' }}>
    {children}
  </div>
);

const Block: React.FC<{ block: WireBlock; index: number; cols?: 1 | 2 }> = ({ block, index, cols = 1 }) => {
  switch (block.kind) {
    case 'title':
      return (
        <div className="text-center" style={{ marginBottom: '5cqw' }}>
          <div className="mx-auto rounded-full bg-[#0F172A]" style={{ height: '2.4cqw', width: '70%', marginBottom: '1.8cqw' }} />
          <div className="mx-auto rounded-full bg-[#0F172A]" style={{ height: '2.4cqw', width: '46%', marginBottom: '3cqw' }} />
          <div className="mx-auto rounded-full bg-[#94A3B8]" style={{ height: '1.1cqw', width: '38%', marginBottom: '1.4cqw' }} />
          <div className="mx-auto rounded-full bg-[#CBD5E1]" style={{ height: '1cqw', width: '52%' }} />
        </div>
      );
    case 'abstract':
      return (
        <div className="rounded-md bg-[#F1F5FB]" style={{ padding: '3cqw', marginBottom: '4cqw' }}>
          <Label>Abstract</Label>
          {block.structured ? (
            <div className="flex flex-col" style={{ gap: '2cqw' }}>
              {['Background', 'Methods', 'Results', 'Conclusions'].map((s) => (
                <div key={s}>
                  <Label sub>{s}</Label>
                  <Lines n={2} seed={s.length} />
                </div>
              ))}
            </div>
          ) : (
            <Lines n={6} />
          )}
        </div>
      );
    case 'keywords':
      return (
        <div className="flex items-center" style={{ gap: '1.6cqw', marginBottom: '4cqw' }}>
          <span className="font-semibold text-[#0F172A]" style={{ fontSize: '2.6cqw' }}>Keywords</span>
          {[14, 11, 16].map((w, i) => (
            <span key={i} className="rounded-full bg-[#DCE3EF]" style={{ height: '2.4cqw', width: `${w}cqw` }} />
          ))}
        </div>
      );
    case 'section':
      return (
        <div style={{ marginBottom: '4.2cqw', ...(cols === 1 ? { breakInside: 'avoid' } : {}) }}>
          <Label>{block.title}</Label>
          {block.subs.length === 0 ? (
            <Lines n={cols === 2 ? 16 : 8} seed={index} />
          ) : (
            <>
              <Lines n={2} seed={index} />
              {block.subs.map((s, i) => (
                <div key={s} style={{ marginTop: '2.4cqw' }}>
                  <Label sub>{s}</Label>
                  <Lines n={3} seed={i + index} />
                </div>
              ))}
            </>
          )}
        </div>
      );
    case 'refs':
      return (
        <div>
          <Label>References</Label>
          <div className="flex flex-col" style={{ gap: '2.6cqw' }}>
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="flex items-start" style={{ gap: '1.6cqw' }}>
                <span className="text-[#94A3B8]" style={{ fontSize: '2.2cqw' }}>[{i + 1}]</span>
                <div className="flex-1"><Lines n={2} seed={i} /></div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'blank':
      return (
        <div className="flex items-center justify-center rounded-md border border-dashed border-[#C5D0E3] text-[#94A3B8]" style={{ height: '60cqw', fontSize: '3cqw' }}>
          Your own headings go here
        </div>
      );
  }
};

interface Props {
  page: WirePage;
  /** Replaces the placeholder title bars with real text, for a paper's thumbnail. */
  title?: string;
  className?: string;
}

export const PageWireframe: React.FC<Props> = ({ page, title, className = '' }) => (
  <div className={`relative bg-white shadow-sm ring-1 ring-[#D2DCEA] overflow-hidden ${className}`} style={{ aspectRatio: '210 / 297', containerType: 'inline-size' }} aria-hidden="true">
    <div style={{ padding: '9cqw 9cqw 6cqw' }}>
      {page.blocks.map((b, i) =>
        b.kind === 'title' && title ? (
          <div key={i} className="text-center" style={{ marginBottom: '5cqw' }}>
            <div className="font-bold text-[#0F172A] leading-tight line-clamp-3" style={{ fontSize: '5.2cqw', marginBottom: '2.4cqw' }}>{title}</div>
            <div className="mx-auto rounded-full bg-[#CBD5E1]" style={{ height: '1cqw', width: '52%' }} />
          </div>
        ) : b.kind === 'section' || b.kind === 'refs' ? null : (
          <Block key={i} block={b} index={i} />
        )
      )}
      {page.blocks.some((b) => b.kind === 'section' || b.kind === 'refs') && (
        <div style={page.columns === 2 ? { columnCount: 2, columnGap: '5cqw' } : undefined}>
          {page.blocks.map((b, i) => (b.kind === 'section' || b.kind === 'refs' ? <Block key={i} block={b} index={i} cols={page.columns} /> : null))}
        </div>
      )}
    </div>
  </div>
);
