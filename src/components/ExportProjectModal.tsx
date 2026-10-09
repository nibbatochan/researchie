'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  FileText, 
  DownloadSimple, 
  Copy, 
  Check, 
  Code, 
  Books,
  ArrowSquareOut,
  CircleNotch,
  Key,
  Globe,
  Archive,
  ArrowRight,
  DotsThree,
  XCircle,
  WarningCircle,
  ShieldCheck,
  Lightbulb,
  CheckCircle,
  BookOpen,
  Question
} from '@phosphor-icons/react';
import { ResearchProject, ResearchAtom } from '@/lib/types/research';
import { formatProjectToMarkdown, formatBibliography, formatProjectToJson } from '@/lib/export/formatters';
import { formatProjectToObsidianMarkdown, generateObsidianVaultZip, getObsidianUri } from '@/lib/export/obsidian';
import { formatProjectToNotionMarkdown } from '@/lib/export/notion';
import { downloadFile } from '@/lib/export/download';

interface ExportProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ResearchProject;
  atoms: ResearchAtom[];
  selectedAtoms?: ResearchAtom[];
}

type TabType = 'obsidian' | 'notion' | 'markdown' | 'citations' | 'json';
type NotionSubTab = 'sync' | 'guide' | 'troubleshooting';

/**
 * Official Obsidian Gemstone Logo from downloaded SVG
 */
export const ObsidianLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={Math.round(size * (332 / 256))}
    viewBox="0 0 256 332"
    preserveAspectRatio="xMidYMid"
    className={className}
  >
    <defs>
      <radialGradient id="obs-a" cx="72.819%" cy="96.934%" r="163.793%" fx="72.819%" fy="96.934%" gradientTransform="rotate(-104 11141.322 0)">
        <stop offset="0%" stopColor="#FFF" stopOpacity=".4" />
        <stop offset="100%" stopOpacity=".1" />
      </radialGradient>
      <radialGradient id="obs-b" cx="52.917%" cy="90.632%" r="190.361%" fx="52.917%" fy="90.632%" gradientTransform="rotate(-82 10746.75 0)">
        <stop offset="0%" stopColor="#FFF" stopOpacity=".6" />
        <stop offset="100%" stopColor="#FFF" stopOpacity=".1" />
      </radialGradient>
      <radialGradient id="obs-c" cx="31.174%" cy="97.138%" r="178.714%" fx="31.174%" fy="97.138%" gradientTransform="rotate(-77 10724.606 0)">
        <stop offset="0%" stopColor="#FFF" stopOpacity=".8" />
        <stop offset="100%" stopColor="#FFF" stopOpacity=".4" />
      </radialGradient>
      <radialGradient id="obs-d" cx="71.813%" cy="99.994%" r="92.086%" fx="71.813%" fy="99.994%" gradientTransform="translate(0 22251839.658) skewY(-90)">
        <stop offset="0%" stopColor="#FFF" stopOpacity=".3" />
        <stop offset="100%" stopOpacity=".3" />
      </radialGradient>
      <radialGradient id="obs-e" cx="117.013%" cy="34.769%" r="328.729%" fx="117.013%" fy="34.769%" gradientTransform="rotate(102 -1004.443 0)">
        <stop offset="0%" stopColor="#FFF" stopOpacity="0" />
        <stop offset="100%" stopColor="#FFF" stopOpacity=".2" />
      </radialGradient>
      <radialGradient id="obs-f" cx="-9.431%" cy="8.712%" r="153.492%" fx="-9.431%" fy="8.712%" gradientTransform="rotate(45 1674.397 0)">
        <stop offset="0%" stopColor="#FFF" stopOpacity=".2" />
        <stop offset="100%" stopColor="#FFF" stopOpacity=".4" />
      </radialGradient>
      <radialGradient id="obs-g" cx="103.902%" cy="-22.172%" r="394.771%" fx="103.902%" fy="-22.172%" gradientTransform="rotate(80 3757.522 0)">
        <stop offset="0%" stopColor="#FFF" stopOpacity=".1" />
        <stop offset="100%" stopColor="#FFF" stopOpacity=".3" />
      </radialGradient>
      <radialGradient id="obs-h" cx="99.348%" cy="89.193%" r="203.824%" fx="99.348%" fy="89.193%" gradientTransform="translate(0 -38783246.548) skewY(-90)">
        <stop offset="0%" stopColor="#FFF" stopOpacity=".2" />
        <stop offset="50%" stopColor="#FFF" stopOpacity=".2" />
        <stop offset="100%" stopColor="#FFF" stopOpacity=".3" />
      </radialGradient>
    </defs>
    <path fillOpacity=".3" d="M209.056 308.305c-2.043 14.93-16.738 26.638-31.432 22.552-20.823-5.658-44.946-14.616-66.634-16.266l-33.317-2.515a22.002 22.002 0 0 1-14.144-6.522L6.167 246.778a21.766 21.766 0 0 1-4.244-24.124s35.36-77.478 36.775-81.485c1.257-4.008 6.13-39.211 8.958-58.07a22.002 22.002 0 0 1 7.072-12.965L122.462 9.47a22.002 22.002 0 0 1 31.903 2.672l57.048 71.978a23.18 23.18 0 0 1 4.872 14.38c0 13.594 1.179 41.646 8.8 59.72a236.756 236.756 0 0 0 27.974 45.732 11.001 11.001 0 0 1 .786 12.258c-4.95 8.408-14.851 24.595-28.76 45.26a111.738 111.738 0 0 0-16.108 46.834h.079Z" />
    <path fill="#6C31E3" d="M209.606 305.79c-2.043 15.009-16.737 26.717-31.432 22.71-20.744-5.737-44.79-14.695-66.555-16.345L78.38 309.64a21.923 21.923 0 0 1-14.144-6.6L6.874 244.106a21.923 21.923 0 0 1-4.243-24.36s35.438-77.792 36.774-81.878c1.336-4.007 6.13-39.289 8.958-58.305a22.002 22.002 0 0 1 7.072-13.044L123.17 5.621a22.002 22.002 0 0 1 31.902 2.75l56.97 72.292a23.338 23.338 0 0 1 4.871 14.38c0 13.673 1.18 41.804 8.723 59.955a238.092 238.092 0 0 0 27.974 45.969 11.001 11.001 0 0 1 .864 12.336c-5.03 8.487-14.851 24.674-28.838 45.497a112.603 112.603 0 0 0-16.03 46.99Z" />
    <path fill="url(#obs-a)" d="M70.365 307.44c26.638-53.983 25.93-92.722 14.537-120.225-10.372-25.459-29.781-41.489-45.025-51.468a19.233 19.233 0 0 1-1.415 4.243L2.631 219.747a21.923 21.923 0 0 0 4.321 24.36l57.284 58.933a23.762 23.762 0 0 0 6.129 4.4Z" />
    <path fill="url(#obs-b)" d="M142.814 197.902a86.025 86.025 0 0 1 21.06 4.793c21.844 8.172 41.724 26.56 58.147 61.999 1.179-2.043 2.357-4.008 3.615-5.894a960.226 960.226 0 0 0 28.838-45.497 11.001 11.001 0 0 0-.786-12.336 238.092 238.092 0 0 1-28.052-45.969c-7.544-18.073-8.644-46.282-8.723-59.955 0-5.186-1.65-10.294-4.871-14.38l-56.97-72.292-.943-1.178c4.165 13.75 3.93 24.752 1.336 34.731-2.357 9.272-6.757 17.68-11.394 26.56-1.571 2.986-3.143 6.05-4.636 9.193a110.01 110.01 0 0 0-12.415 45.576c-.786 19.016 3.064 42.825 15.716 74.65h.078Z" />
    <path fill="url(#obs-c)" d="M142.736 197.902c-12.652-31.824-16.502-55.633-15.716-74.65.786-18.858 6.286-33.002 12.415-45.575l4.715-9.193c4.558-8.88 8.88-17.288 11.315-26.56a61.684 61.684 0 0 0-1.336-34.731c-8.136-8.94-21.96-9.642-30.96-1.572L55.436 66.519a22.002 22.002 0 0 0-7.072 13.044l-8.25 54.69c0 .55-.158 1.022-.236 1.572 15.244 9.901 34.574 25.931 45.025 51.312 2.043 5.029 3.772 10.294 5.029 16.03a157.157 157.157 0 0 1 52.805-5.343v.078Z" />
    <path fill="url(#obs-d)" d="M178.253 328.5c14.616 4.007 29.31-7.701 31.353-22.789a120.225 120.225 0 0 1 12.494-41.017c-16.502-35.44-36.382-53.827-58.148-61.999-23.18-8.643-48.404-5.736-74.021.472 5.736 26.01 2.357 60.034-19.487 104.273 2.436 1.257 5.186 1.965 7.936 2.2l34.496 2.593c18.701 1.336 46.597 11.001 65.377 16.266Z" />
    <path fill="url(#obs-e)" d="M127.177 122.074c-.864 18.859 1.493 40.39 14.144 72.135l-3.929-.393c-11.394-33.081-13.908-50.054-13.044-69.149.786-19.094 6.994-33.789 13.123-46.361 1.571-3.143 5.186-9.037 6.758-12.023 4.557-8.879 7.622-13.515 10.215-21.609 3.772-11.315 2.986-16.658 2.514-22.001 2.908 19.251-8.172 35.988-16.501 53.04a113.939 113.939 0 0 0-13.358 46.361h.078Z" />
    <path fill="url(#obs-f)" d="M88.674 188.551c1.571 3.458 2.907 6.287 3.85 10.608l-3.379.786c-1.336-5.029-2.357-8.643-4.322-12.965-11.472-26.953-29.86-40.861-44.79-51.076 18.074 9.744 36.697 25.066 48.64 52.647Z" />
    <path fill="url(#obs-g)" d="M92.681 202.617c6.286 29.467-.786 66.948-21.609 103.409 17.445-36.146 25.931-70.8 18.859-102.938l2.75-.55v.079Z" />
    <path fill="url(#obs-h)" d="M164.659 199.867c34.181 12.808 47.383 40.86 57.205 64.355-12.18-24.516-29.074-51.626-58.462-61.684-22.317-7.7-41.175-6.758-73.471.55l-.707-3.143c34.26-7.858 52.176-8.8 75.435 0v-.078Z" />
  </svg>
);

/**
 * Official Notion Logo with high-contrast white card + dark monogram
 */
export const NotionLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={Math.round(size * (268 / 256))}
    viewBox="0 0 256 268"
    preserveAspectRatio="xMidYMid"
    className={className}
  >
    <path fill="#FFFFFF" d="M16.092 11.538 164.09.608c18.179-1.56 22.85-.508 34.28 7.801l47.243 33.282C253.406 47.414 256 48.975 256 55.207v182.527c0 11.439-4.155 18.205-18.696 19.24L65.44 267.378c-10.913.517-16.11-1.043-21.825-8.327L8.826 213.814C2.586 205.487 0 199.254 0 191.97V29.726c0-9.352 4.155-17.153 16.092-18.188Z" />
    <path fill="#000000" d="M164.09.608 16.092 11.538C4.155 12.573 0 20.374 0 29.726v162.245c0 7.284 2.585 13.516 8.826 21.843l34.789 45.237c5.715 7.284 10.912 8.844 21.825 8.327l171.864-10.404c14.532-1.035 18.696-7.801 18.696-19.24V55.207c0-5.911-2.336-7.614-9.21-12.66l-1.185-.856L198.37 8.409C186.94.1 182.27-.952 164.09.608ZM69.327 52.22c-14.033.945-17.216 1.159-25.186-5.323L23.876 30.778c-2.06-2.086-1.026-4.69 4.163-5.207l142.274-10.395c11.947-1.043 18.17 3.12 22.842 6.758l24.401 17.68c1.043.525 3.638 3.637.517 3.637L71.146 52.095l-1.819.125Zm-16.36 183.954V81.222c0-6.767 2.077-9.887 8.3-10.413L230.02 60.93c5.724-.517 8.31 3.12 8.31 9.879v153.917c0 6.767-1.044 12.49-10.387 13.008l-161.487 9.361c-9.343.517-13.489-2.594-13.489-10.921ZM212.377 89.53c1.034 4.681 0 9.362-4.681 9.897l-7.783 1.542v114.404c-6.758 3.637-12.981 5.715-18.18 5.715-8.308 0-10.386-2.604-16.609-10.396l-50.898-80.079v77.476l16.1 3.646s0 9.362-12.989 9.362l-35.814 2.077c-1.043-2.086 0-7.284 3.63-8.318l9.351-2.595V109.823l-12.98-1.052c-1.044-4.68 1.55-11.439 8.826-11.965l38.426-2.585 52.958 81.113v-71.76l-13.498-1.552c-1.043-5.733 3.111-9.896 8.3-10.404l35.84-2.087Z" />
  </svg>
);

export const ExportProjectModal: React.FC<ExportProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  atoms,
  selectedAtoms = [],
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('obsidian');
  const [useSelectedOnly, setUseSelectedOnly] = useState<boolean>(selectedAtoms.length > 0);
  const [citationFormat, setCitationFormat] = useState<'markdown' | 'apa' | 'bibtex'>('markdown');
  const [copied, setCopied] = useState(false);

  // Obsidian Specific State
  const [obsidianMode, setObsidianMode] = useState<'single' | 'vault'>('vault');
  const [vaultName, setVaultName] = useState('Research');
  const [isZipping, setIsZipping] = useState(false);

  // Notion Specific State
  const [notionSubTab, setNotionSubTab] = useState<NotionSubTab>('sync');
  const [notionSyncMode, setNotionSyncMode] = useState<'new_page' | 'incremental_append'>('new_page');
  const [notionApiKey, setNotionApiKey] = useState('');
  const [notionPageId, setNotionPageId] = useState('');
  const [isDatabase, setIsDatabase] = useState(false);
  const [isPushingNotion, setIsPushingNotion] = useState(false);
  const [notionSuccessUrl, setNotionSuccessUrl] = useState<string | null>(null);
  const [notionSyncStats, setNotionSyncStats] = useState<{ appended: number; skipped: number; message?: string } | null>(null);
  const [notionError, setNotionError] = useState<string | null>(null);
  const [rememberNotionToken, setRememberNotionToken] = useState(true);

  // Load saved Notion settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('researchie_notion_api_key');
      const savedPageId = localStorage.getItem('researchie_notion_page_id');
      const savedVault = localStorage.getItem('researchie_obsidian_vault_name');
      if (savedKey) setNotionApiKey(savedKey);
      if (savedPageId) setNotionPageId(savedPageId);
      if (savedVault) setVaultName(savedVault);
    }
  }, []);

  // Determine active clip set
  const activeAtoms = useMemo(() => {
    return useSelectedOnly && selectedAtoms.length > 0 ? selectedAtoms : atoms;
  }, [useSelectedOnly, selectedAtoms, atoms]);

  const sanitizedSlug = project.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Obsidian Content
  const obsidianMarkdown = useMemo(() => {
    return formatProjectToObsidianMarkdown(project, activeAtoms);
  }, [project, activeAtoms]);

  // Notion Markdown (for paste)
  const notionMarkdown = useMemo(() => {
    return formatProjectToNotionMarkdown(project, activeAtoms);
  }, [project, activeAtoms]);

  // Standard Markdown
  const markdownContent = useMemo(() => {
    return formatProjectToMarkdown(project, activeAtoms);
  }, [project, activeAtoms]);

  // Citations
  const citationsContent = useMemo(() => {
    return formatBibliography(activeAtoms, citationFormat);
  }, [activeAtoms, citationFormat]);

  // JSON
  const jsonContent = useMemo(() => {
    return formatProjectToJson(project, activeAtoms);
  }, [project, activeAtoms]);

  if (!isOpen) return null;

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Obsidian Multi-File Vault as .zip
  const handleDownloadObsidianZip = async () => {
    try {
      setIsZipping(true);
      const zipBlob = await generateObsidianVaultZip(project, activeAtoms);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sanitizedSlug}-obsidian-vault.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate Obsidian zip vault:', err);
    } finally {
      setIsZipping(false);
    }
  };

  // Open Directly in Obsidian via URI protocol
  const handleOpenInObsidian = () => {
    if (typeof window !== 'undefined' && vaultName) {
      localStorage.setItem('researchie_obsidian_vault_name', vaultName);
    }
    const uri = getObsidianUri(vaultName || 'Research', project.title, obsidianMarkdown);
    window.location.href = uri;
  };

  // Direct Push to Notion API
  const handlePushToNotion = async () => {
    if (!notionApiKey.trim() || !notionPageId.trim()) {
      setNotionError('Please enter both your Notion Integration Token and Parent Page/Database ID.');
      return;
    }

    setIsPushingNotion(true);
    setNotionError(null);
    setNotionSuccessUrl(null);
    setNotionSyncStats(null);

    if (rememberNotionToken && typeof window !== 'undefined') {
      localStorage.setItem('researchie_notion_api_key', notionApiKey.trim());
      localStorage.setItem('researchie_notion_page_id', notionPageId.trim());
    }

    try {
      const res = await fetch('/api/export/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: notionApiKey.trim(),
          parentPageId: notionPageId.trim(),
          project,
          atoms: activeAtoms,
          isDatabase,
          incremental: notionSyncMode === 'incremental_append',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync with Notion.');
      }

      setNotionSuccessUrl(data.pageUrl);
      setNotionSyncStats({
        appended: data.appendedCount ?? activeAtoms.length,
        skipped: data.skippedCollisions ?? 0,
        message: data.message,
      });
    } catch (err: any) {
      setNotionError(err.message || 'An unexpected error occurred while syncing to Notion.');
    } finally {
      setIsPushingNotion(false);
    }
  };

  const handleDownload = () => {
    if (activeTab === 'obsidian') {
      if (obsidianMode === 'vault') {
        handleDownloadObsidianZip();
      } else {
        downloadFile(obsidianMarkdown, `${sanitizedSlug}-obsidian.md`, 'text/markdown;charset=utf-8');
      }
    } else if (activeTab === 'notion') {
      downloadFile(notionMarkdown, `${sanitizedSlug}-notion.md`, 'text/markdown;charset=utf-8');
    } else if (activeTab === 'markdown') {
      downloadFile(markdownContent, `${sanitizedSlug}-research.md`, 'text/markdown;charset=utf-8');
    } else if (activeTab === 'citations') {
      const ext = citationFormat === 'bibtex' ? 'bib' : 'txt';
      downloadFile(citationsContent, `${sanitizedSlug}-citations.${ext}`, 'text/plain;charset=utf-8');
    } else if (activeTab === 'json') {
      downloadFile(jsonContent, `${sanitizedSlug}-backup.json`, 'application/json;charset=utf-8');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-5xl h-[720px] max-h-[94vh] bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-popIn">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E5EB] dark:border-[#27272A] bg-[#F8F9FB] dark:bg-[#09090B]/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-base text-[#0F172A] dark:text-white">
              Export & Knowledge Base Sync
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            title="Close modal"
            className="p-1.5 text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#18181B] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Controls Bar & Tab Switcher */}
        <div className="px-5 py-2.5 border-b border-[#E2E5EB] dark:border-[#27272A] bg-[#F8F9FB]/60 dark:bg-[#09090B]/60 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0 min-h-[48px]">
          {/* Main Format Tabs */}
          <div className="flex items-center bg-[#ECEFF4] dark:bg-[#09090B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl p-0.5">
            {/* Obsidian Tab */}
            <button
              onClick={() => setActiveTab('obsidian')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'obsidian'
                  ? 'bg-white dark:bg-[#1C1C20] text-purple-700 dark:text-purple-300 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-zinc-200'
              }`}
            >
              <ObsidianLogo size={16} />
              <span>Obsidian</span>
            </button>

            {/* Notion Tab */}
            <button
              onClick={() => setActiveTab('notion')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'notion'
                  ? 'bg-white dark:bg-[#1C1C20] text-slate-950 dark:text-white font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-zinc-200'
              }`}
            >
              <div className="w-4 h-4 rounded flex items-center justify-center bg-black">
                <NotionLogo size={13} />
              </div>
              <span>Notion</span>
            </button>

            {/* Markdown Tab */}
            <button
              onClick={() => setActiveTab('markdown')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'markdown'
                  ? 'bg-white dark:bg-[#1C1C20] text-[#325FEC] dark:text-[#518FFF] font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-zinc-200'
              }`}
            >
              <FileText size={14} />
              <span>Markdown</span>
            </button>

            {/* Citations Tab */}
            <button
              onClick={() => setActiveTab('citations')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'citations'
                  ? 'bg-white dark:bg-[#1C1C20] text-[#325FEC] dark:text-[#518FFF] font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-zinc-200'
              }`}
            >
              <Books size={14} />
              <span>Citations</span>
            </button>

            {/* JSON Tab */}
            <button
              onClick={() => setActiveTab('json')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'json'
                  ? 'bg-white dark:bg-[#1C1C20] text-[#325FEC] dark:text-[#518FFF] font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-zinc-200'
              }`}
            >
              <Code size={14} />
              <span>JSON</span>
            </button>
          </div>

          {/* Scope Selector */}
          <div className="flex items-center gap-3">
            {selectedAtoms.length > 0 && (
              <label className="inline-flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 font-sans cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useSelectedOnly}
                  onChange={(e) => setUseSelectedOnly(e.target.checked)}
                  className="rounded border-[#CBD5E1] dark:border-[#3F3F46] text-[#325FEC] focus:ring-[#325FEC]"
                />
                <span>Selected only ({selectedAtoms.length} of {atoms.length})</span>
              </label>
            )}

            {activeTab === 'citations' && (
              <div className="flex items-center bg-[#ECEFF4] dark:bg-[#09090B] rounded-lg border border-[#E2E5EB] dark:border-[#27272A] p-0.5 font-mono text-[11px]">
                {(['markdown', 'apa', 'bibtex'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setCitationFormat(fmt)}
                    className={`px-2 py-0.5 rounded-md uppercase transition-colors ${
                      citationFormat === fmt ? 'bg-white dark:bg-[#1C1C20] text-[#325FEC] dark:text-[#518FFF] font-bold shadow-sm' : 'text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Secondary Action Toolbar for Obsidian */}
        {activeTab === 'obsidian' && (
          <div className="px-5 py-2.5 border-b border-[#E2E5EB] dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
            <div className="flex items-center gap-2">
              <ObsidianLogo size={16} />
              <span className="font-semibold text-slate-900 dark:text-white">Obsidian Vault Mode:</span>
              <div className="flex items-center bg-[#ECEFF4] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded-lg p-0.5 ml-1">
                <button
                  onClick={() => setObsidianMode('vault')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    obsidianMode === 'vault'
                      ? 'bg-purple-600 text-white font-medium shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  Multi-Note Vault (.zip)
                </button>
                <button
                  onClick={() => setObsidianMode('single')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    obsidianMode === 'single'
                      ? 'bg-purple-600 text-white font-medium shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  Single Note (.md)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-zinc-400 font-sans">Vault Name:</span>
              <input
                type="text"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                placeholder="Vault name"
                className="px-2.5 py-1 text-xs rounded-lg border border-[#CBD5E1] dark:border-[#3F3F46] bg-white dark:bg-[#18181B] text-[#0F172A] dark:text-white w-28 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
              />
              <button
                onClick={handleOpenInObsidian}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
                title="Launch Obsidian app directly via URI"
              >
                <ArrowSquareOut size={13} weight="bold" />
                <span>Open in Obsidian</span>
              </button>
            </div>
          </div>
        )}

        {/* Content & Interactive Panels */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left Side: Notion Hub */}
          {activeTab === 'notion' && (
            <div className="w-full md:w-96 border-b md:border-b-0 md:border-r border-[#E2E5EB] dark:border-[#27272A] bg-[#F8F9FB] dark:bg-[#0C0C0E] flex flex-col flex-shrink-0 overflow-hidden">
              {/* Notion Panel Sub-Header */}
              <div className="p-3 border-b border-[#E2E5EB] dark:border-[#27272A] flex items-center justify-between bg-white dark:bg-[#121214] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center bg-black">
                    <NotionLogo size={14} />
                  </div>
                  <span className="font-semibold text-xs text-[#0F172A] dark:text-white">Notion Sync Hub</span>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center bg-[#ECEFF4] dark:bg-[#18181B] rounded-lg p-0.5 text-[11px]">
                  <button
                    onClick={() => setNotionSubTab('sync')}
                    className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                      notionSubTab === 'sync'
                        ? 'bg-white dark:bg-[#27272A] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    Sync
                  </button>
                  <button
                    onClick={() => setNotionSubTab('guide')}
                    className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                      notionSubTab === 'guide'
                        ? 'bg-white dark:bg-[#27272A] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    Guide
                  </button>
                  <button
                    onClick={() => setNotionSubTab('troubleshooting')}
                    className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                      notionSubTab === 'troubleshooting'
                        ? 'bg-white dark:bg-[#27272A] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    FAQs
                  </button>
                </div>
              </div>

              {/* Sub-tab 1: Direct Sync Form */}
              {notionSubTab === 'sync' && (
                <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3 text-xs">
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                    Pushes your project and all research clips directly into your Notion workspace formatted as native Notion blocks.
                  </p>

                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                        Sync Strategy
                      </label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-[#18181B] rounded-xl border border-[#D9E1EC] dark:border-[#27272A]">
                        <button
                          type="button"
                          onClick={() => setNotionSyncMode('new_page')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                            notionSyncMode === 'new_page'
                              ? 'bg-white dark:bg-[#27272A] text-[#0F172A] dark:text-white shadow-xs'
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          📄 New Sub-Page
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotionSyncMode('incremental_append')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                            notionSyncMode === 'incremental_append'
                              ? 'bg-white dark:bg-[#27272A] text-[#325FEC] dark:text-[#518FFF] shadow-xs'
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          ⚡ Incremental Append
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 block">
                        {notionSyncMode === 'new_page'
                          ? 'Creates a new dedicated child page under your Notion parent.'
                          : 'Appends new clips safely into the target page without duplicating existing sections.'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                        <Key size={13} className="text-slate-500" />
                        <span>Notion Internal Integration Token</span>
                      </label>
                      <input
                        type="password"
                        value={notionApiKey}
                        onChange={(e) => setNotionApiKey(e.target.value)}
                        placeholder="secret_..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] dark:border-[#3F3F46] bg-white dark:bg-[#18181B] text-[#0F172A] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 block">
                        Get free token at{' '}
                        <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                          notion.so/my-integrations ↗
                        </a>
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                        <Globe size={13} className="text-slate-500" />
                        <span>Parent Page URL or ID</span>
                      </label>
                      <input
                        type="text"
                        value={notionPageId}
                        onChange={(e) => setNotionPageId(e.target.value)}
                        placeholder="Paste Notion page URL or ID"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] dark:border-[#3F3F46] bg-white dark:bg-[#18181B] text-[#0F172A] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 block">
                        Make sure the integration is connected to this page in Notion.
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-zinc-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isDatabase}
                          onChange={(e) => setIsDatabase(e.target.checked)}
                          className="rounded border-[#CBD5E1] dark:border-[#3F3F46] text-[#325FEC]"
                        />
                        <span>Target is a Database (Table/Board)</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-zinc-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberNotionToken}
                          onChange={(e) => setRememberNotionToken(e.target.checked)}
                          className="rounded border-[#CBD5E1] dark:border-[#3F3F46] text-[#325FEC]"
                        />
                        <span>Remember credentials on this device</span>
                      </label>
                    </div>

                    <button
                      onClick={handlePushToNotion}
                      disabled={isPushingNotion || !notionApiKey.trim() || !notionPageId.trim()}
                      className="w-full mt-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-white dark:text-black dark:hover:bg-zinc-200 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-sm"
                    >
                      {isPushingNotion ? (
                        <>
                          <CircleNotch size={14} className="animate-spin" />
                          <span>Pushing to Notion...</span>
                        </>
                      ) : (
                        <>
                          <NotionLogo size={14} />
                          <span>Push Project to Notion</span>
                        </>
                      )}
                    </button>

                    {notionSuccessUrl && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs animate-fadeIn space-y-2">
                        <div className="flex items-center gap-1.5 font-bold">
                          <CheckCircle size={15} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
                          <span>Successfully Synced to Notion!</span>
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                          <p>{notionSyncStats?.message || `Wrote ${notionSyncStats?.appended ?? activeAtoms.length} clips to your Notion page.`}</p>
                          {notionSyncStats && notionSyncStats.skipped > 0 && (
                            <p className="mt-1 font-semibold text-emerald-800 dark:text-emerald-200">
                              🛡️ Collision Prevention: {notionSyncStats.skipped} existing clips skipped to prevent duplication.
                            </p>
                          )}
                        </div>
                        <a
                          href={notionSuccessUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] transition-colors shadow-xs"
                        >
                          <span>Open in Notion</span>
                          <ArrowSquareOut size={12} weight="bold" />
                        </a>
                      </div>
                    )}

                    {notionError && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-[11px] animate-fadeIn">
                        <div className="flex items-center gap-1 font-bold mb-1">
                          <WarningCircle size={14} weight="fill" />
                          <span>Push Error</span>
                        </div>
                        <p className="leading-relaxed mb-1.5">{notionError}</p>
                        {notionError.includes('Could not find page') && (
                          <div className="text-[10px] bg-red-100/70 dark:bg-red-900/40 p-2 rounded-md flex items-center gap-1">
                            <ArrowRight size={12} className="text-red-600 flex-shrink-0" />
                            <span>Open target page in Notion, click the three dots menu, select <b>Connections</b>, and connect <b>Researchie</b>.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Complete Setup Guide */}
              {notionSubTab === 'guide' && (
                <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#0F172A] dark:text-white">
                    <BookOpen size={15} className="text-blue-500" />
                    <span>How to Connect Notion</span>
                  </div>

                  <div className="space-y-2.5 text-[11px]">
                    {/* Step 1 */}
                    <div className="p-2.5 bg-white dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl">
                      <div className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 mb-1">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                        <span>Create Notion Integration</span>
                      </div>
                      <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                        Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="text-blue-500 underline font-medium">notion.so/my-integrations ↗</a>, click <b>New integration</b>, name it <b>Researchie</b>, and copy the secret token.
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="p-2.5 bg-white dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl">
                      <div className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 mb-1">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                        <span>Grant Page Access in Notion</span>
                      </div>
                      <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                        Open your destination page in Notion. Click the <DotsThree size={14} className="inline mx-0.5" weight="bold" /> menu in top right, click <b>Connections</b>, then search and select <b>Researchie</b>.
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="p-2.5 bg-white dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl">
                      <div className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 mb-1">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                        <span>Paste URL & Push</span>
                      </div>
                      <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                        Copy the Notion page URL from your browser address bar and paste it into the <b>Sync</b> tab, then click <b>Push Project to Notion</b>.
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#ECEFF4] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl text-[11px] text-slate-700 dark:text-zinc-300 flex items-start gap-1.5">
                    <Lightbulb size={14} className="text-amber-500 flex-shrink-0 mt-0.5" weight="fill" />
                    <span><b>Tip:</b> Connect Researchie to your root workspace page. All nested subpages will automatically inherit access without re-connecting.</span>
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Troubleshooting & FAQs */}
              {notionSubTab === 'troubleshooting' && (
                <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#0F172A] dark:text-white">
                    <Question size={15} className="text-purple-500" />
                    <span>Error Guide & FAQs</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    {/* Error 1 */}
                    <div className="p-2.5 bg-white dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl">
                      <span className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1 mb-0.5">
                        <XCircle size={13} weight="fill" />
                        <span>Could not find page with ID</span>
                      </span>
                      <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                        The integration does not have permission for that page yet. Open that page in Notion, click the three dots menu, select <b>Connections</b>, and connect <b>Researchie</b>.
                      </p>
                    </div>

                    {/* Error 2 */}
                    <div className="p-2.5 bg-white dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl">
                      <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-0.5">
                        <WarningCircle size={13} weight="fill" />
                        <span>Invalid URL for link</span>
                      </span>
                      <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                        Automatically resolved by Researchie's built-in URL validator and sanitizer.
                      </p>
                    </div>

                    {/* FAQ 1 */}
                    <div className="p-2.5 bg-white dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl">
                      <span className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1 mb-0.5">
                        <ShieldCheck size={13} className="text-blue-500" weight="fill" />
                        <span>Where is my Notion token saved?</span>
                      </span>
                      <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                        Stored strictly in your local browser's storage. Never transmitted to third-party analytics.
                      </p>
                    </div>

                    {/* FAQ 2 */}
                    <div className="p-2.5 bg-white dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] rounded-xl">
                      <span className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1 mb-0.5">
                        <Copy size={13} className="text-slate-500" weight="bold" />
                        <span>Can I export without an API token?</span>
                      </span>
                      <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                        Yes! Click <b>Copy Content</b> at the bottom and paste directly (<kbd>Ctrl+V</kbd>) into any Notion page.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right Side: Code / Markdown Preview Box */}
          <div className="flex-1 p-5 overflow-y-auto bg-[#F8F9FB] dark:bg-[#09090B] font-mono text-xs text-slate-800 dark:text-zinc-200 min-h-0">
            <pre className="whitespace-pre-wrap break-words leading-relaxed select-text font-mono text-slate-700 dark:text-zinc-300">
              {activeTab === 'obsidian' && obsidianMarkdown}
              {activeTab === 'notion' && notionMarkdown}
              {activeTab === 'markdown' && markdownContent}
              {activeTab === 'citations' && citationsContent}
              {activeTab === 'json' && jsonContent}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#E2E5EB] dark:border-[#27272A] bg-white dark:bg-[#121214] flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-500 dark:text-zinc-400 font-sans">
            Ready to import into <span className="text-[#0F172A] dark:text-zinc-200 font-medium">Obsidian, Notion, Logseq, or LaTeX</span>.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const textToCopy = 
                  activeTab === 'obsidian' ? obsidianMarkdown :
                  activeTab === 'notion' ? notionMarkdown :
                  activeTab === 'markdown' ? markdownContent :
                  activeTab === 'citations' ? citationsContent : jsonContent;
                handleCopy(textToCopy);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F8F9FB] dark:bg-[#18181B] hover:bg-slate-100 dark:hover:bg-[#222226] text-slate-700 dark:text-zinc-200 border border-[#E2E5EB] dark:border-[#27272A] font-medium text-xs transition-colors"
            >
              {copied ? <Check size={14} className="text-[#325FEC] dark:text-[#518FFF]" /> : <Copy size={14} />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Content'}</span>
            </button>

            {activeTab === 'obsidian' && obsidianMode === 'vault' ? (
              <button
                onClick={handleDownloadObsidianZip}
                disabled={isZipping}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-sm"
              >
                {isZipping ? <CircleNotch size={15} className="animate-spin" /> : <Archive size={15} weight="bold" />}
                <span>{isZipping ? 'Generating Vault...' : 'Download Obsidian Vault (.zip)'}</span>
              </button>
            ) : activeTab === 'notion' ? (
              <button
                onClick={handlePushToNotion}
                disabled={isPushingNotion || !notionApiKey.trim() || !notionPageId.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {isPushingNotion ? <CircleNotch size={14} className="animate-spin" /> : <div className="w-3.5 h-3.5 rounded-xs flex items-center justify-center bg-black"><NotionLogo size={12} /></div>}
                <span>Push to Notion</span>
              </button>
            ) : (
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#325FEC] hover:bg-[#274AC4] text-white font-semibold text-xs transition-colors shadow-sm"
              >
                <DownloadSimple size={15} weight="bold" />
                <span>
                  {activeTab === 'obsidian' ? 'Download Note (.md)' :
                   activeTab === 'citations' ? `Download ${citationFormat.toUpperCase()}` :
                   activeTab === 'json' ? 'Download JSON' : 'Download File'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
