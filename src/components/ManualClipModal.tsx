'use client';

import React, { useState, useRef } from 'react';
import { X, Quotes, LinkSimple, FileText, Image as ImageIcon, ClipboardText, Trash } from '@phosphor-icons/react';
import { AtomType } from '@/lib/types/research';

interface ManualClipModalProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onSubmit: (atom: {
    projectId: string;
    type: AtomType;
    title?: string;
    content: { text?: string; rawText?: string; description?: string; targetUrl?: string; imageUrl?: string; markdownContent?: string };
    metadata?: { sourceUrl?: string; pageTitle?: string };
  }) => Promise<void>;
}

export const ManualClipModal: React.FC<ManualClipModalProps> = ({
  isOpen,
  projectId,
  onClose,
  onSubmit,
}) => {
  const [type, setType] = useState<AtomType>('quote');
  const [text, setText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setType('image');
        setImageUrl(result);
        if (!title) {
          setTitle(file.name ? file.name.replace(/\.[^/.]+$/, '') : `Pasted Image`);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file);
        }
        break;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        projectId,
        type,
        title: title.trim() || undefined,
        content: {
          text: type === 'quote' ? text.trim() : undefined,
          rawText: type === 'quote' ? text.trim() : undefined,
          targetUrl: sourceUrl.trim() || undefined,
          imageUrl: type === 'image' ? imageUrl.trim() : undefined,
          description: description.trim() || undefined,
          markdownContent: type === 'note' ? (description.trim() || text.trim() || undefined) : undefined,
        },
        metadata: {
          sourceUrl: sourceUrl.trim() || undefined,
          pageTitle: title.trim() || undefined,
        },
      });
      setText('');
      setSourceUrl('');
      setTitle('');
      setDescription('');
      setImageUrl('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      onPaste={handlePaste}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] rounded-2xl p-6 shadow-2xl animate-popIn">
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E5EB] dark:border-[#27272A] mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-display font-bold text-[#0F172A] dark:text-white">
              Add Research Clip
            </h2>
            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
              (Ctrl+V to paste image)
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-[#0F172A] dark:hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Atom Type Selector */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { id: 'quote', label: 'Quote', icon: Quotes },
            { id: 'note', label: 'Note', icon: FileText },
            { id: 'link', label: 'Link', icon: LinkSimple },
            { id: 'image', label: 'Image', icon: ImageIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = type === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setType(item.id as AtomType)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-mono font-medium border transition-all ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-[#1C1C20] text-[#325FEC] dark:text-[#518FFF] border-[#325FEC] dark:border-[#518FFF] shadow-sm font-semibold'
                    : 'bg-[#F8F9FB] dark:bg-[#09090B] text-slate-600 dark:text-zinc-400 border-[#E2E5EB] dark:border-[#27272A] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'quote' && (
            <div>
              <label className="block text-xs font-mono text-slate-500 dark:text-zinc-400 mb-1.5 uppercase">
                Quote Text *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Paste highlighted research text..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#09090B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl text-sm text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#325FEC] transition-colors resize-none leading-relaxed"
              />
            </div>
          )}

          {type === 'image' && (
            <div className="space-y-2">
              <label className="block text-xs font-mono text-slate-500 dark:text-zinc-400 mb-1.5 uppercase">
                Image Upload or Web URL *
              </label>
              
              {imageUrl ? (
                <div className="p-3 bg-[#F8F9FB] dark:bg-[#09090B] border border-[#325FEC]/40 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 object-contain rounded bg-black/60 border border-[#E2E5EB] dark:border-[#27272A]"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-[#0F172A] dark:text-white block truncate">
                        {imageUrl.startsWith('data:image/') ? 'Image pasted from clipboard' : imageUrl}
                      </span>
                      <span className="text-[11px] text-[#325FEC] dark:text-[#518FFF] font-mono">Ready to save</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="p-1.5 rounded text-slate-400 hover:text-red-500 bg-white dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] transition-colors flex-shrink-0"
                    title="Remove image"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#CBD5E1] dark:border-[#27272A] hover:border-[#325FEC] bg-[#F8F9FB]/80 dark:bg-[#09090B]/80 hover:bg-slate-100/40 dark:hover:bg-[#18181B]/40 rounded-2xl p-4 text-center cursor-pointer transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processImageFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="p-2 rounded-full bg-blue-50 dark:bg-[#18181B] text-[#325FEC] dark:text-[#518FFF] border border-blue-200 dark:border-[#27272A]">
                      <ClipboardText size={18} />
                    </div>
                    <p className="text-xs text-[#0F172A] dark:text-white font-medium">
                      Press <span className="text-[#325FEC] dark:text-[#518FFF] font-mono font-bold">Ctrl+V</span> to paste from clipboard
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                      or click to browse image file
                    </p>
                  </div>
                </div>
              )}

              {!imageUrl && (
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Or paste web image URL: https://example.com/image.png"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#09090B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#325FEC] transition-colors"
                />
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-500 dark:text-zinc-400 mb-1.5 uppercase">
              Source URL
            </label>
            <input
              type="url"
              placeholder="https://example.com/research-paper"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#09090B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl text-sm text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#325FEC] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 dark:text-zinc-400 mb-1.5 uppercase">
              Source Title / Caption
            </label>
            <input
              type="text"
              placeholder="e.g. Memory Bandwidth Scaling Analysis"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#09090B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl text-sm text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#325FEC] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 dark:text-zinc-400 mb-1.5 uppercase">
              Notes / Context
            </label>
            <textarea
              rows={2}
              placeholder="Optional notes or takeaways..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#09090B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl text-sm text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#325FEC] transition-colors resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E5EB] dark:border-[#27272A] mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-slate-500 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (type === 'quote' && !text.trim()) || (type === 'image' && !imageUrl.trim())}
              className="px-5 py-2 text-xs font-display font-semibold text-white bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-50 rounded-xl transition-colors shadow-sm"
            >
              {loading ? 'Saving...' : 'Save Clip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
