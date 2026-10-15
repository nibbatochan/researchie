'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkle,
  ShareNetwork,
  Copy,
  Check,
  ArrowSquareOut,
  FolderSimplePlus,
  FileText,
  Camera,
  Globe,
  Tag,
  CalendarBlank,
  UsersThree,
  MagnifyingGlass,
  ArrowLeft,
  Eye,
  Lightning,
  Quotes
} from '@phosphor-icons/react';
import { ResearchProject, ResearchAtom, AtomType } from '@/lib/types/research';

export default function PublicSharePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [project, setProject] = useState<ResearchProject | null>(null);
  const [atoms, setAtoms] = useState<ResearchAtom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // An edit link opened while signed out: the person is asked to sign in first and comes back here.
  const [needsSignIn, setNeedsSignIn] = useState(false);
  // A signed-in person opened a project they cannot see: they can ask the owner for access.
  const [noAccess, setNoAccess] = useState<null | { request: 'none' | 'pending' | 'denied' }>(null);
  const [askMessage, setAskMessage] = useState('');
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [copiedLink, setCopiedLink] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateSuccess, setDuplicateSuccess] = useState(false);
  const [activeSnapshotAtom, setActiveSnapshotAtom] = useState<ResearchAtom | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchSharedData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/share/${encodeURIComponent(projectId)}`, { credentials: 'same-origin' });
        const json = await res.json().catch(() => ({}));
        if (res.status === 401 && json.code === 'SIGN_IN_REQUIRED') {
          setNeedsSignIn(true);
          return;
        }
        if (res.status === 403 && json.code === 'NO_ACCESS') {
          setNoAccess({ request: json.request || 'none' });
          return;
        }
        if (!res.ok) {
          throw new Error(json.error || 'This research stream is private or does not exist.');
        }
        if (json.joined) {
          // An edit link: the person is now an editor, so the project is in their app under "Shared with me".
          router.replace('/');
          return;
        }
        if (json.data) {
          setProject(json.data.project);
          setAtoms(json.data.atoms || []);
        } else {
          throw new Error('Project not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load research stream');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedData();
  }, [projectId]);

  const filteredAtoms = useMemo(() => {
    return atoms.filter((atom) => {
      const matchesType = selectedType === 'ALL' || atom.type === selectedType;
      const text = `${atom.title || ''} ${atom.content?.rawText || ''} ${atom.content?.description || ''} ${atom.content?.sourceUrl || ''} ${atom.tags?.join(' ') || ''}`.toLowerCase();
      const matchesSearch = !searchQuery.trim() || text.includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [atoms, selectedType, searchQuery]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDuplicateWorkspace = async () => {
    if (!project || duplicating) return;
    try {
      setDuplicating(true);
      // 1. Create a copy of the project in user's workspace
      const createRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${project.title} (Forked)`,
          description: project.description || '',
          color: project.color || '#325FEC',
          color_badge: project.color || '#325FEC',
          tags: [...(project.tags || []), 'forked'],
          parentId: null,
        }),
      });

      if (!createRes.ok) throw new Error('Failed to fork project');
      const createJson = await createRes.json();
      const newProjectId = createJson.data.id;

      // 2. Clone all atoms into the new project
      for (const atom of atoms) {
        await fetch('/api/atoms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: newProjectId,
            type: atom.type,
            title: atom.title,
            content: atom.content,
            metadata: atom.metadata,
            visualSnapshot: atom.visualSnapshot,
            tags: atom.tags,
            userNotes: atom.userNotes,
          }),
        });
      }

      setDuplicateSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 1200);
    } catch (err) {
      console.error('Fork failed:', err);
    } finally {
      setDuplicating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-[#325FEC]/10 flex items-center justify-center text-[#325FEC] animate-pulse mb-4">
          <Sparkle size={24} weight="fill" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">Loading research stream...</p>
      </div>
    );
  }

  async function requestAccess() {
    setAsking(true);
    setAskError(null);
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(projectId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'request-access', message: askMessage }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not send the request.');
      if (json.already) {
        router.replace('/');
        return;
      }
      setNoAccess({ request: 'pending' });
    } catch (e: any) {
      setAskError(e.message || 'Could not send the request.');
    } finally {
      setAsking(false);
    }
  }

  if (noAccess) {
    const pending = noAccess.request === 'pending';
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6 font-sans text-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#325FEC]/10 text-[#325FEC] flex items-center justify-center mx-auto">
            <UsersThree size={24} />
          </div>
          <h1 className="font-display font-bold text-lg">You need access</h1>
          {pending ? (
            <p className="text-xs text-slate-500 dark:text-zinc-400">Your request was sent. When the owner approves it, the project appears under “Shared with me” in your workspace. No email is sent, so check back later.</p>
          ) : (
            <>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {noAccess.request === 'denied' ? 'Your last request was declined. You can ask again.' : 'This project is private. You can ask the owner to let you in.'}
              </p>
              <textarea
                value={askMessage}
                onChange={(e) => setAskMessage(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Add a short message (optional)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#18181B] outline-none focus:ring-1 focus:ring-blue-500"
              />
              {askError && <p className="text-xs text-red-600 dark:text-red-400">{askError}</p>}
              <button
                type="button"
                disabled={asking}
                onClick={() => void requestAccess()}
                className="inline-flex items-center px-4 py-2 bg-[#325FEC] disabled:opacity-50 text-white rounded-xl text-xs font-medium hover:bg-[#274AC4] transition-all cursor-pointer"
              >
                {asking ? 'Sending…' : 'Request access'}
              </button>
            </>
          )}
          <div>
            <Link href="/" className="text-xs text-slate-500 dark:text-zinc-400 hover:underline">Back to my workspace</Link>
          </div>
        </div>
      </div>
    );
  }

  if (needsSignIn) {
    const next = encodeURIComponent(`/share/${projectId}`);
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6 font-sans text-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#325FEC]/10 text-[#325FEC] flex items-center justify-center mx-auto">
            <UsersThree size={24} />
          </div>
          <h1 className="font-display font-bold text-lg">Sign in to open this project</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400">This link lets you edit, so it needs an account. After you sign in you come straight back and the project is added to your workspace.</p>
          <div className="flex items-center justify-center gap-2">
            <Link href={`/login?next=${next}`} className="inline-flex items-center px-4 py-2 bg-[#325FEC] text-white rounded-xl text-xs font-medium hover:bg-[#274AC4] transition-all">Sign in</Link>
            <Link href={`/login?tab=register&next=${next}`} className="inline-flex items-center px-4 py-2 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all">Create an account</Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6 font-sans text-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <Globe size={24} />
          </div>
          <h1 className="font-display font-bold text-lg">Stream Unavailable</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            {error || 'This research stream is private or no longer available.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#325FEC] text-white rounded-xl text-xs font-medium hover:bg-[#274AC4] transition-all"
          >
            <ArrowLeft size={14} />
            <span>Return to Workspace</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 font-sans flex flex-col selection:bg-[#325FEC]/20">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-[#121214]/85 backdrop-blur-md border-b border-[#D2DCEA] dark:border-[#27272A] px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-[#325FEC] flex items-center justify-center text-white font-black font-mono text-sm shadow-xs">
              R
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-sm tracking-tight group-hover:text-[#325FEC] transition-colors">
                  Researchie
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-[#325FEC] border border-blue-200 dark:border-blue-900">
                  Shared Stream
                </span>
              </div>
            </div>
          </Link>

          <span className="h-4 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

          <div className="hidden sm:flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: project.color || '#325FEC' }}
            />
            <span className="font-semibold text-xs text-slate-700 dark:text-zinc-300 truncate max-w-[200px] md:max-w-xs">
              {project.title}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 transition-all cursor-pointer"
          >
            {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={handleDuplicateWorkspace}
            disabled={duplicating || duplicateSuccess}
            className="px-3.5 py-1.5 rounded-xl bg-[#325FEC] hover:bg-[#274AC4] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {duplicateSuccess ? (
              <>
                <Check size={14} weight="bold" />
                <span>Forked to Workspace!</span>
              </>
            ) : duplicating ? (
              <>
                <Sparkle size={14} className="animate-spin" />
                <span>Forking Stream...</span>
              </>
            ) : (
              <>
                <FolderSimplePlus size={14} weight="bold" />
                <span>Fork Stream</span>
              </>
            )}
          </button>

          <Link
            href="/"
            className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-slate-800 transition-all hidden md:flex items-center gap-1.5"
          >
            <span>Open Researchie</span>
            <ArrowSquareOut size={13} />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        
        {/* Project Header Banner */}
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] shadow-xs relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ backgroundColor: project.color || '#325FEC' }}
          />

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: project.color || '#325FEC' }}
                />
                <h1 className="font-display font-bold text-xl md:text-2xl text-slate-900 dark:text-white tracking-tight">
                  {project.title}
                </h1>
              </div>

              {project.description && (
                <p className="text-xs md:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {project.description}
                </p>
              )}

              {/* Tags & Metadata */}
              <div className="flex items-center gap-2 flex-wrap pt-2">
                {project.tags?.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-700/60"
                  >
                    <Tag size={10} />
                    {t}
                  </span>
                ))}
                
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono flex items-center gap-1 ml-2">
                  <CalendarBlank size={12} />
                  Captured {new Date(project.createdAt || Date.now()).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Quick Metrics Badge */}
            <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-2 flex-shrink-0 bg-slate-50 dark:bg-[#18181B] p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800">
              <div className="text-right">
                <span className="text-2xl font-mono font-bold text-[#325FEC] block">
                  {atoms.length}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Total Captured Clips
                </span>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
                <Globe size={13} className="text-emerald-500" />
                <span>Public Read-Only</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#121214] p-1 rounded-xl border border-slate-200 dark:border-zinc-800 overflow-x-auto w-full sm:w-auto">
            {(['ALL', 'HIGHLIGHT', 'DOM_EXTRACT', 'DOCUMENT_SNIPPET', 'VISUAL_SNAPSHOT'] as const).map((type) => {
              const count = type === 'ALL' ? atoms.length : atoms.filter((a) => (a.type as string) === type).length;
              const label =
                type === 'ALL'
                  ? 'All Clips'
                  : type === 'HIGHLIGHT'
                  ? 'Highlights'
                  : type === 'DOM_EXTRACT'
                  ? 'DOM Web'
                  : type === 'DOCUMENT_SNIPPET'
                  ? 'PDF Quotes'
                  : 'Snapshots';

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    selectedType === type
                      ? 'bg-[#325FEC] text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`text-[10px] font-mono px-1 rounded ${selectedType === type ? 'bg-white/20' : 'bg-slate-100 dark:bg-zinc-800'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stream clips..."
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:border-[#325FEC]"
            />
          </div>
        </div>

        {/* Timeline Stream Feed */}
        <div className="space-y-4">
          {filteredAtoms.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-2">
              <Quotes size={24} className="mx-auto text-slate-400" />
              <p className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                No research clips found matching your filters.
              </p>
            </div>
          ) : (
            filteredAtoms.map((atom, idx) => (
              <article
                key={atom.id || idx}
                className="p-5 rounded-2xl bg-white dark:bg-[#121214] border border-slate-200/90 dark:border-zinc-800 shadow-xs hover:border-[#325FEC]/40 transition-all space-y-3"
              >
                {/* Atom Meta Top */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono text-[10px] uppercase font-bold flex items-center gap-1 ${
                        (atom.type as string) === 'HIGHLIGHT'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                          : (atom.type as string) === 'DOM_EXTRACT'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                          : (atom.type as string) === 'DOCUMENT_SNIPPET'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                      }`}
                    >
                      {(atom.type as string) === 'HIGHLIGHT' && <Quotes size={10} />}
                      {(atom.type as string) === 'DOM_EXTRACT' && <Globe size={10} />}
                      {(atom.type as string) === 'DOCUMENT_SNIPPET' && <FileText size={10} />}
                      {(atom.type as string) === 'VISUAL_SNAPSHOT' && <Camera size={10} />}
                      {String(atom.type).replace('_', ' ')}
                    </span>

                    {atom.metadata?.pageNumber && (
                      <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                        Page {atom.metadata.pageNumber}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">
                    {new Date(atom.capturedAt || atom.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Title */}
                {atom.title && (
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                    {atom.title}
                  </h3>
                )}

                {/* Clip Content */}
                {atom.content?.rawText && (
                  <div className="text-xs text-slate-700 dark:text-zinc-300 bg-slate-50 dark:bg-[#18181B] p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 leading-relaxed font-sans whitespace-pre-wrap">
                    {atom.content.rawText}
                  </div>
                )}

                {atom.content?.description && !atom.content?.rawText && (
                  <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                    {atom.content.description}
                  </p>
                )}

                {/* Visual Snapshot Preview */}
                {atom.visualSnapshot?.rasterSnapshotUrl && (
                  <div className="pt-1">
                    <div
                      onClick={() => setActiveSnapshotAtom(atom)}
                      className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 max-h-60 cursor-pointer bg-slate-100 dark:bg-zinc-900"
                    >
                      <img
                        src={atom.visualSnapshot.rasterSnapshotUrl}
                        alt={atom.title || 'Visual freeze-frame'}
                        className="w-full object-cover group-hover:scale-[1.01] transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-medium">
                        <Eye size={16} />
                        <span>Inspect Freeze-Frame Snapshot</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Source Citation */}
                {(atom.content?.sourceUrl || atom.metadata?.sourceUrl || atom.content?.targetUrl) && (
                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 border-t border-slate-100 dark:border-zinc-800/80">
                    <a
                      href={atom.content?.sourceUrl || atom.metadata?.sourceUrl || atom.content?.targetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[#325FEC] dark:text-[#518FFF] hover:underline truncate max-w-md"
                    >
                      <Globe size={12} />
                      <span className="truncate">{atom.content?.sourceUrl || atom.metadata?.sourceUrl || atom.content?.targetUrl}</span>
                      <ArrowSquareOut size={11} />
                    </a>

                    {atom.tags && atom.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {atom.tags.map((t) => (
                          <span key={t} className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1 rounded">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </main>

      {/* Freeze-Frame Fullscreen Modal */}
      {activeSnapshotAtom && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setActiveSnapshotAtom(null)}
        >
          <div
            className="max-w-4xl w-full bg-white dark:bg-[#121214] rounded-2xl overflow-hidden border border-slate-300 dark:border-zinc-800 shadow-2xl space-y-3 p-4 animate-popIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800 text-xs">
              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                {activeSnapshotAtom.title || 'Visual Evidence Snapshot'}
              </span>
              <button
                type="button"
                onClick={() => setActiveSnapshotAtom(null)}
                className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-lg">
              <img
                src={activeSnapshotAtom.visualSnapshot?.rasterSnapshotUrl}
                alt="Freeze-frame full resolution"
                className="w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="py-6 border-t border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400 dark:text-zinc-500 font-sans">
        <p>Published with Researchie • Grounded High-Fidelity Research Capture Engine</p>
      </footer>
    </div>
  );
}
