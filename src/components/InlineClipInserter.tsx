'use client';

import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Quotes, 
  LinkSimple, 
  FileText, 
  Image as ImageIcon, 
  X, 
  Check, 
  ClipboardText, 
  Trash 
} from '@phosphor-icons/react';
import { AtomType } from '@/lib/types/research';

interface InlineClipInserterProps {
  projectId: string;
  onInsertClip: (clip: {
    projectId: string;
    type: AtomType;
    title?: string;
    content: { text?: string; description?: string; targetUrl?: string; imageUrl?: string; markdownContent?: string };
    metadata?: { sourceUrl?: string; pageTitle?: string };
    tags?: string[];
  }) => void;
}

export const InlineClipInserter: React.FC<InlineClipInserterProps> = ({
  projectId,
  onInsertClip,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<AtomType>('quote');
  const [text, setText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tag, setTag] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setText('');
    setSourceUrl('');
    setTitle('');
    setDescription('');
    setImageUrl('');
    setTag('');
    setIsOpen(false);
  };

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processImageFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const cleanTag = tag.trim().replace(/^#+/, '');
    const tags = cleanTag ? [cleanTag] : undefined;

    let contentPayload: any = {};
    if (type === 'quote') {
      contentPayload = {
        text: text.trim(),
        rawText: text.trim(),
        description: description.trim() || undefined,
      };
    } else if (type === 'link') {
      contentPayload = {
        targetUrl: sourceUrl.trim(),
        description: description.trim() || undefined,
      };
    } else if (type === 'image') {
      contentPayload = {
        imageUrl: imageUrl.trim(),
        targetUrl: sourceUrl.trim() || undefined,
        description: description.trim() || undefined,
      };
    } else {
      contentPayload = {
        description: description.trim() || text.trim(),
        markdownContent: description.trim() || text.trim(),
      };
    }

    onInsertClip({
      projectId,
      type,
      title: title.trim() || (type === 'quote' ? text.slice(0, 50) : type === 'image' ? 'Captured Image' : undefined),
      content: contentPayload,
      metadata: sourceUrl.trim() ? {
        sourceUrl: sourceUrl.trim(),
        pageTitle: title.trim() || undefined,
      } : undefined,
      tags,
    });

    handleReset();
    setSaving(false);
  };

  if (!isOpen) {
    return (
      <div className="relative group/inserter h-2 -my-1 py-0 flex items-center justify-center transition-all duration-200 hover:h-8 hover:my-0.5 z-10">
        <div className="absolute inset-x-8 sm:inset-x-20 h-px bg-transparent group-hover/inserter:bg-[#325FEC]/30 dark:group-hover/inserter:bg-[#518FFF]/30 transition-all pointer-events-none" />
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative opacity-0 pointer-events-none group-hover/inserter:opacity-100 group-hover/inserter:pointer-events-auto transition-all duration-150 transform scale-90 group-hover/inserter:scale-100 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAFBFD] dark:bg-[#121214] hover:bg-[#EEF3F8] dark:hover:bg-[#18181B] text-[#325FEC] dark:text-[#518FFF] border border-[#325FEC]/35 dark:border-[#518FFF]/30 text-xs font-sans font-medium shadow-xs hover:scale-105 cursor-pointer"
        >
          <Plus size={11} weight="bold" />
          <span>New Clip</span>
        </button>
      </div>
    );
  }

  return (
    <div 
      onPaste={handlePaste}
      className="my-3 p-4 md:p-5 bg-[#FAFBFD] dark:bg-[#121214] border border-[#325FEC]/40 dark:border-[#518FFF]/40 rounded-2xl shadow-xl animate-popIn"
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-[#D9E1EC] dark:border-[#27272A] mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#325FEC] dark:bg-[#518FFF]" />
          <h4 className="font-display font-semibold text-sm text-[#0F172A] dark:text-white">Add New Clip</h4>
          <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 ml-2 hidden sm:inline">
            (Tip: Press Ctrl+V anytime to paste clipboard images)
          </span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="p-1 text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded"
        >
          <X size={15} />
        </button>
      </div>

      {/* Type Selector Buttons */}
      <div className="grid grid-cols-4 gap-1.5 mb-3.5">
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
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                isSelected
                  ? 'bg-blue-50/80 dark:bg-[#1C1C20] text-[#325FEC] dark:text-[#518FFF] border-[#325FEC] dark:border-[#518FFF] font-semibold'
                  : 'bg-[#EEF3F8] dark:bg-[#09090B] text-slate-600 dark:text-zinc-400 border-[#D9E1EC] dark:border-[#27272A] hover:text-[#0F172A] dark:hover:text-zinc-200'
              }`}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        {type === 'quote' && (
          <div>
            <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">Quote text</label>
            <textarea
              required
              autoFocus
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste research quote or excerpt..."
              className="w-full px-3 py-2 bg-[#EEF3F8] dark:bg-[#09090B] border border-[#D9E1EC] dark:border-[#27272A] focus:border-[#325FEC] dark:focus:border-[#518FFF] rounded-xl text-sm text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        )}

        {type === 'note' && (
          <div>
            <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">Note or observations</label>
            <textarea
              required
              autoFocus
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write your research notes, findings, or thoughts..."
              className="w-full px-3 py-2 bg-[#EEF3F8] dark:bg-[#09090B] border border-[#D9E1EC] dark:border-[#27272A] focus:border-[#325FEC] dark:focus:border-[#518FFF] rounded-xl text-sm text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        )}

        {type === 'image' && (
          <div className="space-y-2">
            <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">Image Source</label>
            
            {imageUrl ? (
              <div className="p-3 bg-[#EEF3F8] dark:bg-[#09090B] border border-[#325FEC]/40 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 object-contain rounded bg-black/60 border border-[#D9E1EC] dark:border-[#27272A]"
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
                  className="p-1.5 rounded text-slate-400 hover:text-red-500 bg-[#FAFBFD] dark:bg-[#18181B] border border-[#D9E1EC] dark:border-[#27272A] transition-colors flex-shrink-0"
                  title="Remove image"
                >
                  <Trash size={14} />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#CBD5E1] dark:border-[#27272A] hover:border-[#325FEC] bg-[#EEF3F8]/80 dark:bg-[#09090B]/80 hover:bg-[#E4ECF6]/60 dark:hover:bg-[#18181B]/40 rounded-2xl p-5 text-center cursor-pointer transition-colors"
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
                  <div className="p-2 rounded-full bg-blue-50/80 dark:bg-[#18181B] text-[#325FEC] dark:text-[#518FFF] border border-blue-200/80 dark:border-[#27272A]">
                    <ClipboardText size={20} />
                  </div>
                  <p className="text-xs text-[#0F172A] dark:text-white font-medium">
                    Press <span className="text-[#325FEC] dark:text-[#518FFF] font-mono font-bold">Ctrl+V</span> to paste from clipboard
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                    or drag & drop / click to browse image file
                  </p>
                </div>
              </div>
            )}

            {!imageUrl && (
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Or paste web image URL directly:</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="w-full px-3 py-2 bg-[#EEF3F8] dark:bg-[#09090B] border border-[#D9E1EC] dark:border-[#27272A] focus:border-[#325FEC] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        {(type === 'quote' || type === 'link' || type === 'image') && (
          <div>
            <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">Source URL (optional)</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://en.wikipedia.org/wiki/Mountain_gorilla"
              className="w-full px-3 py-2 bg-[#EEF3F8] dark:bg-[#09090B] border border-[#D9E1EC] dark:border-[#27272A] focus:border-[#325FEC] rounded-xl text-sm text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Source title or caption..."
              className="w-full px-3 py-2 bg-[#EEF3F8] dark:bg-[#09090B] border border-[#D9E1EC] dark:border-[#27272A] focus:border-[#325FEC] rounded-xl text-sm text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">Tag (optional)</label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. social-dynamics, field-data"
              className="w-full px-3 py-2 bg-[#EEF3F8] dark:bg-[#09090B] border border-[#D9E1EC] dark:border-[#27272A] focus:border-[#325FEC] rounded-xl text-sm text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {type === 'image' && (
          <div>
            <label className="block text-slate-700 dark:text-zinc-300 font-medium mb-1">Image Caption / Note (optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add observations or notes about this image..."
              className="w-full px-3 py-2 bg-[#EEF3F8] dark:bg-[#09090B] border border-[#D9E1EC] dark:border-[#27272A] focus:border-[#325FEC] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9E1EC] dark:border-[#27272A]">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:text-[#0F172A] dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || (type === 'quote' && !text.trim()) || (type === 'image' && !imageUrl.trim()) || (type === 'note' && !description.trim())}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-40 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <Check size={13} weight="bold" />
            <span>Save Clip</span>
          </button>
        </div>
      </form>
    </div>
  );
};
