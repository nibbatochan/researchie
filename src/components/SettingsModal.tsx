'use client';

import React, { useState } from 'react';
import {
  X,
  Gear,
  SlidersHorizontal,
  Brain,
  LinkSimple,
  HardDrive,
  ShieldCheck,
  Check,
  Copy,
  ArrowsClockwise,
  DownloadSimple,
  Trash,
  Key,
  Eye,
  EyeSlash,
  Sparkle,
  Warning,
  CheckCircle,
  FileCode,
  Globe,
  Database
} from '@phosphor-icons/react';
import { useSettings } from '@/lib/settings/settingsContext';
import { useAuth } from '@/lib/auth/authContext';
import { AiProviderSettings } from './AiProviderSettings';
import { WebSearchKeySettings } from './WebSearchKeySettings';
import { OpenAlexKeySettings } from './OpenAlexKeySettings';
import { ExtensionConnectionSettings } from './ExtensionConnectionSettings';
import { DeleteAccountSettings } from './DeleteAccountSettings';
import { NotionTokenField } from './NotionTokenField';
import { WelcomeModal } from './WelcomeModal';
import { ResearchAtom, ResearchProject } from '@/lib/types/research';

interface SettingsModalProps {
  atoms: ResearchAtom[];
  projects: ResearchProject[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ atoms, projects }) => {
  const {
    settings,
    updateGeneralSettings,
    updateCaptureSettings,
    updateNotionSettings,
    resetSettings,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    activeSettingsTab,
    setActiveSettingsTab,
    calculateStorageUsage,
    exportAllDataAsJson,
  } = useSettings();

  const { user, signInAsDemo, authRequired } = useAuth();

  const [showNotionToken, setShowNotionToken] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  if (!isSettingsModalOpen) return null;

  const storage = calculateStorageUsage(atoms);

  const triggerSaveNotification = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const tabs = [
    { id: 'general' as const, label: 'General & UI', icon: SlidersHorizontal },
    { id: 'capture' as const, label: 'Capture Engine', icon: Globe },
    { id: 'ai' as const, label: 'AI Intelligence', icon: Brain },
    { id: 'notion' as const, label: 'Notion & Sync', icon: Database },
    { id: 'storage' as const, label: 'Storage & Backup', icon: HardDrive },
    { id: 'account' as const, label: 'Account & Security', icon: ShieldCheck },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-4xl h-[620px] bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-popIn">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#325FEC]/10 dark:bg-[#325FEC]/20 text-[#325FEC] dark:text-[#518FFF] flex items-center justify-center">
              <Gear size={18} weight="bold" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-[#0F172A] dark:text-white flex items-center gap-2">
                <span>Workspace & Engine Settings</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                  v2.4.0
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Configure capture engine mechanics, AI models, Notion sync, and storage limits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveToast && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 animate-fadeIn">
                <CheckCircle size={14} weight="fill" />
                <span>Saved</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(false)}
              aria-label="Close Settings"
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Tab Nav & Right Content Panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Vertical Tabs */}
          <div className="w-52 border-r border-[#D2DCEA] dark:border-[#27272A] bg-[#F4F6F9] dark:bg-[#151518] p-3 space-y-1 select-none flex flex-col justify-between">
            <div className="space-y-1">
              {tabs.map((t) => {
                const Icon = t.icon;
                const isActive = activeSettingsTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveSettingsTab(t.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-[#202024] text-[#325FEC] dark:text-[#518FFF] shadow-xs font-semibold border border-[#D2DCEA] dark:border-[#2E2E33]'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Icon size={16} weight={isActive ? 'bold' : 'regular'} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Status Tag */}
            <div className="p-2.5 rounded-xl bg-white/60 dark:bg-black/20 border border-[#D2DCEA] dark:border-[#27272A] space-y-1 text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
              <div className="flex items-center justify-between">
                <span>Active Quota:</span>
                <span className="font-semibold text-slate-800 dark:text-zinc-200">{storage.formattedTotal}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#325FEC] h-full transition-all"
                  style={{ width: `${Math.max(4, storage.percentUsed)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right Scrollable Form Panel */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#FAFBFD] dark:bg-[#121214] space-y-6">
            
            {/* 1. GENERAL & UI TAB */}
            {activeSettingsTab === 'general' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">Workspace & View Preferences</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Configure default viewports and visual density.</p>
                </div>

                <div className="space-y-4">
                  {/* Default Launch View */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">Default Launch View</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">The mode loaded when Researchie opens.</span>
                    </div>
                    <select
                      value={settings.general.defaultView}
                      onChange={(e) => {
                        updateGeneralSettings({ defaultView: e.target.value as any });
                        triggerSaveNotification();
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] text-slate-800 dark:text-zinc-200 outline-none cursor-pointer"
                    >
                      <option value="feed">Live Research Feed</option>
                      <option value="dashboard">Dashboard Hub</option>
                      <option value="canvas">Interactive Canvas</option>
                      <option value="reader">PDF & Document Reader</option>
                    </select>
                  </div>

                  {/* UI Density */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">Interface Density</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">Card margins and timeline item spacing.</span>
                    </div>
                    <div className="flex gap-1 p-1 bg-[#F4F6F9] dark:bg-[#202024] rounded-lg border border-[#D2DCEA] dark:border-[#27272A]">
                      {(['standard', 'compact'] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            updateGeneralSettings({ density: d });
                            triggerSaveNotification();
                          }}
                          className={`px-3 py-1 rounded text-xs font-medium capitalize transition-all cursor-pointer ${
                            settings.general.density === d
                              ? 'bg-white dark:bg-[#121214] text-[#325FEC] dark:text-[#518FFF] shadow-xs font-semibold'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Format */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">Timestamp Display</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">How capture timestamps are formatted on cards.</span>
                    </div>
                    <select
                      value={settings.general.dateFormat}
                      onChange={(e) => {
                        updateGeneralSettings({ dateFormat: e.target.value as any });
                        triggerSaveNotification();
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] text-slate-800 dark:text-zinc-200 outline-none cursor-pointer"
                    >
                      <option value="relative">Relative (e.g. 5m ago)</option>
                      <option value="formatted">Standard (e.g. Sep 30, 2026 8:30 PM)</option>
                      <option value="iso">ISO 8601 UTC</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CAPTURE ENGINE TAB */}
            {activeSettingsTab === 'capture' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">Web Clipper & Snapshot Mechanics</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Control deep-linking, TextFragments, and raster freeze-frames.</p>
                </div>

                <div className="space-y-4">
                  {/* TextFragment Deep Linking */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">TextFragment URL Generation</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Appends <code className="font-mono text-[10px] bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded">#:~:text=...</code> so clicking a source URL jumps directly to highlighted text in Chromium browsers.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.capture.enableTextFragments}
                      onChange={(e) => {
                        updateCaptureSettings({ enableTextFragments: e.target.checked });
                        triggerSaveNotification();
                      }}
                      className="w-4 h-4 text-[#325FEC] rounded accent-[#325FEC] cursor-pointer mt-1"
                    />
                  </div>

                  {/* Snapshot Capture Mode */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">Web Block Snapshot Format</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">Dual-hybrid stores both raster PNG and sanitized DOM HTML.</span>
                    </div>
                    <select
                      value={settings.capture.snapshotMode}
                      onChange={(e) => {
                        updateCaptureSettings({ snapshotMode: e.target.value as any });
                        triggerSaveNotification();
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] text-slate-800 dark:text-zinc-200 outline-none cursor-pointer"
                    >
                      <option value="dual_hybrid">Dual Hybrid (Raster + Clean DOM)</option>
                      <option value="raster_only">Raster Image Only (PNG)</option>
                      <option value="html_only">Sanitized HTML Only</option>
                    </select>
                  </div>

                  {/* Auto-OCR on Image Paste */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">Automatic OCR Text Extraction</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Automatically runs Tesseract OCR on pasted screenshots and diagrams to make text searchable.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.capture.autoOcrOnImagePaste}
                      onChange={(e) => {
                        updateCaptureSettings({ autoOcrOnImagePaste: e.target.checked });
                        triggerSaveNotification();
                      }}
                      className="w-4 h-4 text-[#325FEC] rounded accent-[#325FEC] cursor-pointer mt-1"
                    />
                  </div>

                  <ExtensionConnectionSettings />

                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B]">
                    <div>
                      <div className="text-xs font-semibold">Setup guide</div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400">Install the extension and add an AI key, step by step.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGuideOpen(true)}
                      data-testid="open-setup-guide"
                      className="h-8 px-3.5 rounded-full text-xs font-semibold bg-[#325FEC] hover:bg-[#274AC4] text-white cursor-pointer"
                    >
                      Open guide
                    </button>
                  </div>
                  <WelcomeModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
                </div>
              </div>
            )}

            {/* 3. AI & INTELLIGENCE TAB */}
            {activeSettingsTab === 'ai' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">AI Provider & Key</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Choose a provider, add your own key, and check that it works.</p>
                </div>

                <div className="space-y-4">
                  {/* Bring your own AI key */}
                  <AiProviderSettings />
                  {/* Bring your own Perplexity key, for web search only */}
                  <WebSearchKeySettings />
                  {/* Optional OpenAlex key for paper search */}
                  <OpenAlexKeySettings />
                </div>
              </div>
            )}

            {/* 4. NOTION & SYNC TAB */}
            {activeSettingsTab === 'notion' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">Notion Workspace Sync & Export</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Configure automated cloud export and deduplication rules.</p>
                </div>

                <div className="space-y-4">
                  {/* Notion API Token */}
                  {authRequired ? (
                    <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A]">
                      <NotionTokenField />
                    </div>
                  ) : (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">Notion Integration Token</span>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">Internal integration secret starting with <code className="font-mono">secret_</code>.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowNotionToken(!showNotionToken)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                      >
                        {showNotionToken ? <EyeSlash size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <input
                      type={showNotionToken ? 'text' : 'password'}
                      placeholder="secret_..."
                      value={settings.notion.integrationToken}
                      onChange={(e) => {
                        updateNotionSettings({ integrationToken: e.target.value });
                        triggerSaveNotification();
                      }}
                      className="w-full px-3 py-1.5 rounded-lg text-xs bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] text-slate-800 dark:text-zinc-200 outline-none font-mono"
                    />
                  </div>
                  )}

                  {/* Notion Database ID */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] space-y-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">Target Database ID</span>
                    <input
                      type="text"
                      placeholder="e.g. 28fa7b2c918a4a169f4b301c27db120e"
                      value={settings.notion.databaseId}
                      onChange={(e) => {
                        updateNotionSettings({ databaseId: e.target.value });
                        triggerSaveNotification();
                      }}
                      className="w-full px-3 py-1.5 rounded-lg text-xs bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] text-slate-800 dark:text-zinc-200 outline-none font-mono"
                    />
                  </div>

                  {/* Collision & Deduplication Strategy */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">Export Deduplication Rule</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">Prevents duplicating clips on re-export.</span>
                    </div>
                    <select
                      value={settings.notion.deduplicationStrategy}
                      onChange={(e) => {
                        updateNotionSettings({ deduplicationStrategy: e.target.value as any });
                        triggerSaveNotification();
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] text-slate-800 dark:text-zinc-200 outline-none cursor-pointer"
                    >
                      <option value="smart_append">Smart Append (New clips only)</option>
                      <option value="strict_dedupe">Strict Hash Match Dedupe</option>
                      <option value="overwrite">Overwrite Page Content</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 5. STORAGE & BACKUP TAB */}
            {activeSettingsTab === 'storage' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">Storage Breakdown & Complete Backup</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Live storage quota analyzer and complete workspace export.</p>
                </div>

                {/* Storage Meter Card */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">Used Storage Space</span>
                    <span className="font-mono text-slate-500 dark:text-zinc-400">
                      <strong className="text-[#325FEC] dark:text-[#518FFF]">{storage.formattedTotal}</strong> of 500 MB ({(storage.percentUsed).toFixed(1)}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden flex">
                    <div style={{ width: `${storage.percentUsed}%` }} className="bg-[#325FEC] h-full" />
                  </div>

                  {/* Distribution Categories */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#D2DCEA]/60 dark:border-[#27272A]/60">
                    <div className="p-2 rounded-lg bg-[#F4F6F9] dark:bg-[#202024] text-xs">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Web Blocks</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">{storage.breakdown.webBlocks.count}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">{storage.breakdown.webBlocks.formatted}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#F4F6F9] dark:bg-[#202024] text-xs">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">PDF Excerpts</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">{storage.breakdown.pdfPages.count}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">{storage.breakdown.pdfPages.formatted}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#F4F6F9] dark:bg-[#202024] text-xs">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Quotes</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">{storage.breakdown.quotes.count}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">{storage.breakdown.quotes.formatted}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#F4F6F9] dark:bg-[#202024] text-xs">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Images & Diagrams</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">{storage.breakdown.images.count}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">{storage.breakdown.images.formatted}</span>
                    </div>
                  </div>
                </div>

                {/* Backup & Purge Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => exportAllDataAsJson(atoms, projects)}
                    className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] hover:border-[#325FEC] flex items-center gap-3 text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#325FEC]/10 dark:bg-[#325FEC]/20 text-[#325FEC] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <DownloadSimple size={20} weight="bold" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">Export Full JSON Archive</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">Download all streams, atoms, snapshots, and tags.</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={resetSettings}
                    className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] hover:border-amber-500 flex items-center gap-3 text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <ArrowsClockwise size={20} weight="bold" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">Reset Preferences to Defaults</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">Restores default capture & AI configurations.</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* 6. ACCOUNT & SECURITY TAB */}
            {activeSettingsTab === 'account' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">Account Sessions & Security</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Active credentials, plan tiers, and security safeguards.</p>
                </div>

                <div className="space-y-4">
                  {user && (
                    <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full overflow-hidden border border-[#D2DCEA] dark:border-[#27272A]">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-[#325FEC] text-white flex items-center justify-center font-bold">
                              {user.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900 dark:text-white">{user.name}</span>
                            {user.tier && (<span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">{user.tier}</span>)}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-zinc-400">{user.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          {user.provider} linked
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Deleting the account (S-43): needs the authenticator app, set up here first. Tester deployment only. */}
                  {authRequired && user && <DeleteAccountSettings />}

                  {/* Local development only: the tester deployment has no demo tiers. */}
                  {!authRequired && (
                  <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] space-y-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">Quick Persona &amp; Tier Switcher</span>
                    <div className="flex gap-2 pt-1">
                      {(["pro", "team", "free"] as const).map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => {
                            signInAsDemo(tier);
                            triggerSaveNotification();
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all cursor-pointer ${
                            user?.tier === tier
                              ? "bg-[#325FEC] text-white border-[#325FEC] shadow-xs"
                              : "bg-[#F4F6F9] dark:bg-[#202024] text-slate-700 dark:text-zinc-300 border-[#D2DCEA] dark:border-[#27272A] hover:border-[#325FEC]"
                          }`}
                        >
                          {tier} Account
                        </button>
                      ))}
                    </div>
                  </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#EEF3F8] dark:bg-[#18181B] border-t border-[#D2DCEA] dark:border-[#27272A] flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
          <span className="font-mono text-[10px]">Changes automatically persist to local workspace cache</span>
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(false)}
            className="px-4 py-1.5 bg-[#325FEC] hover:bg-[#274AC4] text-white font-medium rounded-xl text-xs shadow-xs transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
