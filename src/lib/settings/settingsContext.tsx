'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ResearchAtom } from '@/lib/types/research';
import { usePrefs } from '@/lib/prefs/prefsContext';

export interface AppSettings {
  general: {
    defaultView: 'dashboard' | 'feed' | 'canvas' | 'reader';
    density: 'standard' | 'compact';
    dateFormat: 'relative' | 'iso' | 'formatted';
    soundEnabled: boolean;
    autoRefreshIntervalSec: number;
  };
  capture: {
    enableTextFragments: boolean;
    fallbackFullTextAnchor: boolean;
    snapshotMode: 'raster_only' | 'html_only' | 'dual_hybrid';
    retinaScale: '1x' | '2x';
    autoOcrOnImagePaste: boolean;
    defaultProjectId: string;
  };
  ai: {
    model: 'llama-3.3-70b-versatile' | 'deepseek-r1-distill-llama-70b' | 'mixtral-8x7b-32768' | 'gemma2-9b-it';
    ragChunkCount: number;
    temperature: number;
    streamResponses: boolean;
  };
  notion: {
    integrationToken: string;
    databaseId: string;
    deduplicationStrategy: 'smart_append' | 'strict_dedupe' | 'overwrite';
    autoSyncOnMilestone: boolean;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  general: {
    defaultView: 'feed',
    density: 'standard',
    dateFormat: 'relative',
    soundEnabled: true,
    autoRefreshIntervalSec: 15,
  },
  capture: {
    enableTextFragments: true,
    fallbackFullTextAnchor: true,
    snapshotMode: 'dual_hybrid',
    retinaScale: '2x',
    autoOcrOnImagePaste: true,
    defaultProjectId: 'all',
  },
  ai: {
    model: 'llama-3.3-70b-versatile',
    ragChunkCount: 5,
    temperature: 0.2,
    streamResponses: true,
  },
  notion: {
    integrationToken: '',
    databaseId: '',
    deduplicationStrategy: 'smart_append',
    autoSyncOnMilestone: false,
  },
};

export interface StorageMetrics {
  totalBytes: number;
  formattedTotal: string;
  maxBytes: number;
  percentUsed: number;
  breakdown: {
    webBlocks: { count: number; bytes: number; formatted: string };
    pdfPages: { count: number; bytes: number; formatted: string };
    quotes: { count: number; bytes: number; formatted: string };
    images: { count: number; bytes: number; formatted: string };
    notes: { count: number; bytes: number; formatted: string };
  };
}

interface SettingsContextType {
  settings: AppSettings;
  updateGeneralSettings: (general: Partial<AppSettings['general']>) => void;
  updateCaptureSettings: (capture: Partial<AppSettings['capture']>) => void;
  updateAiSettings: (ai: Partial<AppSettings['ai']>) => void;
  updateNotionSettings: (notion: Partial<AppSettings['notion']>) => void;
  resetSettings: () => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  activeSettingsTab: 'general' | 'capture' | 'ai' | 'notion' | 'storage' | 'account';
  setActiveSettingsTab: (tab: 'general' | 'capture' | 'ai' | 'notion' | 'storage' | 'account') => void;
  calculateStorageUsage: (atoms: ResearchAtom[]) => StorageMetrics;
  exportAllDataAsJson: (atoms: ResearchAtom[], projects: any[]) => void;
}

const SETTINGS_STORAGE_KEY = 'researchie_app_settings_v1';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const prefs = usePrefs();
  // The Notion token is a secret: on the tester site it is kept in memory only, never saved to the account or the browser.
  const persistSettings = (value: any) => {
    const toSave = prefs.inAccount ? { ...value, notion: { ...value?.notion, integrationToken: '' } } : value;
    prefs.set(SETTINGS_STORAGE_KEY, JSON.stringify(toSave));
  };
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<
    'general' | 'capture' | 'ai' | 'notion' | 'storage' | 'account'
  >('general');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = prefs.get(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // An AI key pasted here by an older version must not stay in the browser. Keys now live on the server.
        if (parsed?.ai && 'customGroqApiKey' in parsed.ai) {
          delete parsed.ai.customGroqApiKey;
          persistSettings(parsed);
        }
        setSettings({
          general: { ...DEFAULT_SETTINGS.general, ...parsed.general },
          capture: { ...DEFAULT_SETTINGS.capture, ...parsed.capture },
          ai: { ...DEFAULT_SETTINGS.ai, ...parsed.ai },
          notion: { ...DEFAULT_SETTINGS.notion, ...parsed.notion },
        });
      }
    } catch (err) {
      console.warn('Failed to load settings from storage:', err);
    }
  }, []);

  // Persist to localStorage on change
  const saveSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      persistSettings(newSettings);
    } catch (err) {
      console.warn('Failed to save settings:', err);
    }
  }, []);

  const updateGeneralSettings = useCallback(
    (general: Partial<AppSettings['general']>) => {
      setSettings((prev) => {
        const next = { ...prev, general: { ...prev.general, ...general } };
        try {
          persistSettings(next);
        } catch {}
        return next;
      });
    },
    []
  );

  const updateCaptureSettings = useCallback(
    (capture: Partial<AppSettings['capture']>) => {
      setSettings((prev) => {
        const next = { ...prev, capture: { ...prev.capture, ...capture } };
        try {
          persistSettings(next);
        } catch {}
        return next;
      });
    },
    []
  );

  const updateAiSettings = useCallback(
    (ai: Partial<AppSettings['ai']>) => {
      setSettings((prev) => {
        const next = { ...prev, ai: { ...prev.ai, ...ai } };
        try {
          persistSettings(next);
        } catch {}
        return next;
      });
    },
    []
  );

  const updateNotionSettings = useCallback(
    (notion: Partial<AppSettings['notion']>) => {
      setSettings((prev) => {
        const next = { ...prev, notion: { ...prev.notion, ...notion } };
        try {
          persistSettings(next);
        } catch {}
        return next;
      });
    },
    []
  );

  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
  }, [saveSettings]);

  // Compute live storage metrics across actual atoms
  const calculateStorageUsage = useCallback((atoms: ResearchAtom[]): StorageMetrics => {
    let totalBytes = 0;
    const maxBytes = 500 * 1024 * 1024; // 500 MB Free / Pro baseline

    const counts = {
      webBlocks: { count: 0, bytes: 0 },
      pdfPages: { count: 0, bytes: 0 },
      quotes: { count: 0, bytes: 0 },
      images: { count: 0, bytes: 0 },
      notes: { count: 0, bytes: 0 },
    };

    atoms.forEach((atom) => {
      // Approximate byte weights from content & snapshots
      const rawTextBytes = (atom.content?.rawText || atom.content?.text || '').length * 2;
      const htmlBytes = (atom.content?.sanitizedHtml || '').length * 2;
      const screenshotBytes = atom.visualSnapshot?.rasterSnapshotUrl || atom.content?.imageUrl ? 180 * 1024 : 0; // ~180KB per raster snapshot
      const atomSize = rawTextBytes + htmlBytes + screenshotBytes + 512; // 512B metadata overhead

      totalBytes += atomSize;

      if (atom.type === 'block') {
        counts.webBlocks.count++;
        counts.webBlocks.bytes += atomSize;
      } else if (atom.type === 'document' || atom.metadata?.documentType === 'pdf') {
        counts.pdfPages.count++;
        counts.pdfPages.bytes += atomSize;
      } else if (atom.type === 'quote') {
        counts.quotes.count++;
        counts.quotes.bytes += atomSize;
      } else if (atom.type === 'image') {
        counts.images.count++;
        counts.images.bytes += atomSize;
      } else {
        counts.notes.count++;
        counts.notes.bytes += atomSize;
      }
    });

    const percentUsed = Math.min(100, Math.max(1, (totalBytes / maxBytes) * 100));

    return {
      totalBytes,
      formattedTotal: formatBytes(totalBytes),
      maxBytes,
      percentUsed,
      breakdown: {
        webBlocks: {
          ...counts.webBlocks,
          formatted: formatBytes(counts.webBlocks.bytes),
        },
        pdfPages: {
          ...counts.pdfPages,
          formatted: formatBytes(counts.pdfPages.bytes),
        },
        quotes: {
          ...counts.quotes,
          formatted: formatBytes(counts.quotes.bytes),
        },
        images: {
          ...counts.images,
          formatted: formatBytes(counts.images.bytes),
        },
        notes: {
          ...counts.notes,
          formatted: formatBytes(counts.notes.bytes),
        },
      },
    };
  }, []);

  // Export full JSON workspace backup
  const exportAllDataAsJson = useCallback((atoms: ResearchAtom[], projects: any[]) => {
    const payload = {
      version: 'researchie-backup-v1',
      exportedAt: new Date().toISOString(),
      projectCount: projects.length,
      atomCount: atoms.length,
      projects,
      atoms,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `researchie-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateGeneralSettings,
        updateCaptureSettings,
        updateAiSettings,
        updateNotionSettings,
        resetSettings,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        activeSettingsTab,
        setActiveSettingsTab,
        calculateStorageUsage,
        exportAllDataAsJson,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
