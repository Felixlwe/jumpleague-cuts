'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Boxes,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCode,
  Globe,
  DownloadCloud,
  Sparkles,
  StopCircle,
} from 'lucide-react';
import { JLModule, ModuleDifficulty } from '@/types/jumpleague';
import {
  parseSchematicFile,
  parseBase64Schematic,
  ParsedSchematic,
} from '@/lib/schematicParser';
import { MODULE_DIFFICULTY_CONFIG } from '@/constants/jumpleagueConfig';

interface CreateModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDifficulty: ModuleDifficulty;
  onSave: (module: JLModule) => Promise<void> | void;
}

type ModalTab = 'FILE' | 'SINGLE_IMPORT' | 'AUTO_ALL';

const DIFFICULTIES: ModuleDifficulty[] = ['EASY', 'MEDIUM', 'HARD', 'ULTRA'];

/**
 * Parses user input containing single IDs, comma-separated IDs, or ranges (e.g. "11, 13, 15-18")
 */
export function parseModuleIdInput(raw: string): string[] {
  const parts = raw.split(/[,;\s]+/);
  const result: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Check for range like 10-15 or 1001-1010
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        const count = Math.min(end - start + 1, 100); // safety cap: max 100 per range
        for (let i = 0; i < count; i++) {
          const id = String(start + i);
          if (!seen.has(id)) {
            seen.add(id);
            result.push(id);
          }
        }
        continue;
      }
    }

    // Single ID (can be numeric or text)
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }

  return result;
}

export const CreateModuleModal: React.FC<CreateModuleModalProps> = ({
  isOpen,
  onClose,
  defaultDifficulty,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('AUTO_ALL');
  const [difficulty, setDifficulty] =
    useState<ModuleDifficulty>(defaultDifficulty);

  // File Upload State
  const [shortCode, setShortCode] = useState('');
  const [name, setName] = useState('');
  const [parsedSchem, setParsedSchem] = useState<ParsedSchematic | null>(null);
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Manual / Range Import State
  const [importInput, setImportInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    currentId: string;
    successCount: number;
    errorCount: number;
    logs: string[];
  } | null>(null);

  // Bulk Auto-All Import State
  const [bulkFilter, setBulkFilter] = useState<'ALL' | ModuleDifficulty>('ALL');
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    status: 'DISCOVERING' | 'IMPORTING' | 'DONE';
    current: number;
    total: number;
    currentId: string;
    currentName: string;
    currentDiff: string;
    successCount: number;
    errorCount: number;
    logs: string[];
  } | null>(null);

  const isAbortedRef = useRef(false);

  // General State
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    if (!file.name.match(/\.(schem|schematic|litematic)$/i)) {
      setError(
        'Bitte wähle eine gültige .schem, .schematic oder .litematic Datei aus.'
      );
      return;
    }

    setIsParsing(true);
    setError(null);
    setFileName(file.name);

    try {
      const parsed = await parseSchematicFile(file);
      setParsedSchem(parsed);

      if (!name.trim()) {
        setName(parsed.name);
      }
      if (!shortCode.trim()) {
        const prefix = difficulty.charAt(0).toUpperCase();
        setShortCode(`${prefix}-NEW`);
      }
    } catch (err: unknown) {
      console.error('Failed to parse schematic:', err);
      const msg = err instanceof Error ? err.message : 'Fehler beim Lesen der Schematic-Datei.';
      setError(msg);
      setParsedSchem(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortCode.trim()) {
      setError('Bitte gib ein Kürzel bzw. eine ID für das Modul ein (z. B. E2).');
      return;
    }
    if (!name.trim()) {
      setError('Bitte gib einen Namen für das Modul ein (z. B. Birkenwald).');
      return;
    }
    if (!parsedSchem || parsedSchem.blocks.length === 0) {
      setError(
        'Bitte lade eine .schem- oder .litematic-Datei mit mindestens 1 Block hoch.'
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const finalId = shortCode.trim().toUpperCase().replace(/^#+/, '');
      const newModule: JLModule = {
        id: finalId,
        shortCode: `#${finalId}`,
        name: name.trim(),
        difficulty,
        dimensions: parsedSchem.dimensions,
        blockCount: parsedSchem.blocks.length,
        blocks: parsedSchem.blocks,
        spawnPoint: parsedSchem.module?.spawnPoint,
        finishPoint: parsedSchem.module?.finishPoint,
        createdAt: new Date().toISOString(),
      };

      await onSave(newModule);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Speichern des Moduls.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSingleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = parseModuleIdInput(importInput);
    if (ids.length === 0) {
      setError(
        'Bitte gib mindestens eine gültige Modul-ID ein (z. B. 11 oder 10-15).'
      );
      return;
    }

    setIsImporting(true);
    setError(null);
    setImportProgress({
      current: 0,
      total: ids.length,
      currentId: ids[0],
      successCount: 0,
      errorCount: 0,
      logs: [],
    });

    let successes = 0;
    let errors = 0;
    const newLogs: string[] = [];

    for (let i = 0; i < ids.length; i++) {
      const targetId = ids[i];
      setImportProgress((prev) =>
        prev
          ? {
              ...prev,
              current: i + 1,
              currentId: targetId,
            }
          : null
      );

      try {
        const cleanId = String(targetId).trim().replace(/^#+/, '');
        const finalId = cleanId;
        const shortCodeVal = `#${cleanId}`;

        const response = await fetch('/api/import-module', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleId: cleanId, source: '120' }),
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.base64) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const parsed = await parseBase64Schematic(
          data.base64,
          `Modul ${cleanId}`,
          {
            difficulty,
            shortCode: shortCodeVal,
            name: `Modul ${cleanId}`,
          }
        );

        const newModule: JLModule = {
          id: finalId,
          shortCode: shortCodeVal,
          name: parsed.name || `Modul ${cleanId}`,
          difficulty,
          dimensions: parsed.dimensions,
          blockCount: parsed.blocks.length,
          blocks: parsed.blocks,
          spawnPoint: parsed.module?.spawnPoint,
          finishPoint: parsed.module?.finishPoint,
          createdAt: new Date().toISOString(),
        };

        await onSave(newModule);

        successes++;
        newLogs.push(
          `✓ Modul #${cleanId}: ${parsed.blockCount} Blöcke erfolgreich gespeichert`
        );
      } catch (err: unknown) {
        errors++;
        const msg = err instanceof Error ? err.message : 'Fehler beim Importieren';
        newLogs.push(
          `✗ Modul #${targetId}: ${msg}`
        );
      }

      setImportProgress((prev) =>
        prev
          ? {
              ...prev,
              successCount: successes,
              errorCount: errors,
              logs: [...newLogs],
            }
          : null
      );
    }

    setIsImporting(false);

    if (successes > 0 && errors === 0) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  const handleStartBulkAutoImport = async () => {
    setIsBulkImporting(true);
    setError(null);
    isAbortedRef.current = false;

    setBulkProgress({
      status: 'DISCOVERING',
      current: 0,
      total: 0,
      currentId: '',
      currentName: '',
      currentDiff: '',
      successCount: 0,
      errorCount: 0,
      logs: ['Erfasse alle 1.20 Module von modules.top...'],
    });

    try {
      const listRes = await fetch('/api/import-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: '120' }),
      });

      const listData = await listRes.json();
      if (!listRes.ok || !listData.success || !Array.isArray(listData.modules)) {
        throw new Error(
          listData.error || 'Fehler beim Abrufen der Modulliste von modules.top.'
        );
      }

      let targetModules: Array<{
        id: string;
        name: string;
        difficulty: ModuleDifficulty;
      }> = listData.modules;

      if (bulkFilter !== 'ALL') {
        targetModules = targetModules.filter((m) => m.difficulty === bulkFilter);
      }

      const total = targetModules.length;
      if (total === 0) {
        throw new Error('Keine Module für den gewählten Filter gefunden.');
      }

      setBulkProgress({
        status: 'IMPORTING',
        current: 0,
        total,
        currentId: targetModules[0]?.id || '',
        currentName: targetModules[0]?.name || '',
        currentDiff: targetModules[0]?.difficulty || '',
        successCount: 0,
        errorCount: 0,
        logs: [
          `Gefunden: ${total} Module auf modules.top. Starte NBT-Download & Speicherung...`,
        ],
      });

      let successes = 0;
      let errors = 0;
      const logs: string[] = [
        `Gefunden: ${total} Module. Starte Massen-Import...`,
      ];

      for (let i = 0; i < total; i++) {
        if (isAbortedRef.current) {
          logs.unshift('⚠️ Massen-Import durch Benutzer angehalten.');
          break;
        }

        const modInfo = targetModules[i];
        const rawId = modInfo.id;
        const cleanId = String(rawId).trim().replace(/^#+/, '');
        const shortCodeVal = `#${cleanId}`;

        setBulkProgress((prev) =>
          prev
            ? {
                ...prev,
                current: i + 1,
                currentId: cleanId,
                currentName: modInfo.name,
                currentDiff: modInfo.difficulty,
              }
            : null
        );

        try {
          const modRes = await fetch('/api/import-module', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moduleId: cleanId, source: '120' }),
          });

          const modData = await modRes.json();
          if (!modRes.ok || !modData.success || !modData.base64) {
            throw new Error(modData.error || `HTTP ${modRes.status}`);
          }

          const parsed = await parseBase64Schematic(
            modData.base64,
            modInfo.name || `Modul ${cleanId}`,
            {
              difficulty: modInfo.difficulty,
              shortCode: shortCodeVal,
              name: modInfo.name || `Modul ${cleanId}`,
            }
          );

          const newModule: JLModule = {
            id: cleanId,
            shortCode: shortCodeVal,
            name: parsed.name || modInfo.name || `Modul ${cleanId}`,
            difficulty:
              modInfo.difficulty || parsed.module?.difficulty || 'EASY',
            dimensions: parsed.dimensions,
            blockCount: parsed.blocks.length,
            blocks: parsed.blocks,
            spawnPoint: parsed.module?.spawnPoint,
            finishPoint: parsed.module?.finishPoint,
            createdAt: new Date().toISOString(),
          };

          await onSave(newModule);

          successes++;
          logs.unshift(
            `✓ [${i + 1}/${total}] Modul #${cleanId} (${modInfo.difficulty}): ${parsed.blockCount} Blöcke gespeichert`
          );
        } catch (err: unknown) {
          errors++;
          const msg = err instanceof Error ? err.message : 'Fehlgeschlagen';
          logs.unshift(
            `✗ [${i + 1}/${total}] Modul #${cleanId}: ${msg}`
          );
        }

        setBulkProgress((prev) =>
          prev
            ? {
                ...prev,
                successCount: successes,
                errorCount: errors,
                logs: logs.slice(0, 60),
              }
            : null
        );
      }

      setBulkProgress((prev) =>
        prev ? { ...prev, status: 'DONE' } : null
      );
    } catch (err: unknown) {
      console.error('Bulk auto-import error:', err);
      const msg = err instanceof Error ? err.message : 'Fehler beim automatischen Massen-Import.';
      setError(msg);
    } finally {
      setIsBulkImporting(false);
    }
  };

  const handleStopBulkImport = () => {
    isAbortedRef.current = true;
  };

  const isAnyLoading = isImporting || isBulkImporting || isSubmitting;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isAnyLoading) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-purple-500/30 bg-zinc-950/95 p-6 shadow-[0_0_60px_rgba(168,85,247,0.25)] text-zinc-100"
      >
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-cyan-600/15 blur-3xl" />

        {/* Modal Header */}
        <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-400/40 bg-purple-500/20 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.35)]">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <div className="font-mono text-[10px] font-bold tracking-widest uppercase text-purple-400">
                ADMIN // MODUL-VERWALTUNG
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                JumpLeague-Module importieren &amp; hinzufügen
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isAnyLoading}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition disabled:opacity-40"
            title="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 3 Tabs: Auto-All Import | Manual ID Import | File Upload */}
        <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-xl border border-white/10 bg-zinc-900/80 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('AUTO_ALL');
              setError(null);
            }}
            disabled={isAnyLoading}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === 'AUTO_ALL'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-400/50 shadow-md ring-1 ring-purple-400/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>Alle 1.20 Module</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('SINGLE_IMPORT');
              setError(null);
            }}
            disabled={isAnyLoading}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === 'SINGLE_IMPORT'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-400/50 shadow-md ring-1 ring-purple-400/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-cyan-400" />
            <span>ID-Direktimport</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('FILE');
              setError(null);
            }}
            disabled={isAnyLoading}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === 'FILE'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-400/50 shadow-md ring-1 ring-purple-400/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Upload className="h-3.5 w-3.5 text-emerald-400" />
            <span>Datei (.schem)</span>
          </button>
        </div>

        {/* TAB 1: AUTO ALL 1.20 MODULES (THE NEW AUTOMATED BULK IMPORTER) */}
        {activeTab === 'AUTO_ALL' && (
          <div className="mt-4 space-y-4">
            {/* Info Box */}
            <div className="rounded-2xl border border-purple-500/25 bg-purple-950/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">
                    Automatischer 1.20 Massen-Import von modules.top
                  </h4>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Erkennt alle 893 JumpLeague-Module aus den Kategorien{' '}
                    <span className="text-emerald-400 font-semibold">Easy (199)</span>,{' '}
                    <span className="text-cyan-400 font-semibold">Medium (418)</span>,{' '}
                    <span className="text-amber-400 font-semibold">Hard (239)</span> und{' '}
                    <span className="text-purple-400 font-semibold">Ultra (37)</span>.
                    Jedes Modul wird mit seinen 3D-Blöcken, Spawn- &amp; Ziel-Punkten
                    geladen und direkt in Supabase gespeichert.
                  </p>
                </div>
              </div>
            </div>

            {/* Category Filter Selector */}
            <div>
              <label className="block mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                Umfang des Imports
              </label>
              <div className="grid grid-cols-5 gap-1.5 text-xs font-bold">
                {[
                  { id: 'ALL', label: 'Alle (893)' },
                  { id: 'EASY', label: 'Easy (199)' },
                  { id: 'MEDIUM', label: 'Medium (418)' },
                  { id: 'HARD', label: 'Hard (239)' },
                  { id: 'ULTRA', label: 'Ultra (37)' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setBulkFilter(cat.id as any)}
                    disabled={isBulkImporting}
                    className={`rounded-xl border py-2 text-[11px] font-bold transition ${
                      bulkFilter === cat.id
                        ? 'border-purple-400/80 bg-purple-500/25 text-white shadow-sm'
                        : 'border-white/10 bg-zinc-900/60 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Progress Bar & Status Display */}
            {bulkProgress && (
              <div className="rounded-2xl border border-purple-500/30 bg-zinc-900/90 p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-purple-300 font-bold truncate pr-2">
                    {bulkProgress.status === 'DISCOVERING' ? (
                      'Erfasse Module von modules.top...'
                    ) : bulkProgress.status === 'IMPORTING' ? (
                      `Importiere Modul ${bulkProgress.current} von ${bulkProgress.total} (Modul #${bulkProgress.currentId}) [${bulkProgress.currentDiff}]...`
                    ) : (
                      `✓ Fertig! ${bulkProgress.successCount} von ${bulkProgress.total} Modulen importiert.`
                    )}
                  </span>
                  <span className="font-mono text-xs font-bold text-white shrink-0">
                    {bulkProgress.total > 0
                      ? `${Math.round(
                          (bulkProgress.current / bulkProgress.total) * 100
                        )}%`
                      : '0%'}
                  </span>
                </div>

                {/* Animated Gradient Progress Bar */}
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 transition-all duration-300"
                    style={{
                      width: `${
                        bulkProgress.total > 0
                          ? Math.round(
                              (bulkProgress.current / bulkProgress.total) * 100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                {/* Counters */}
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-300 border border-emerald-500/40">
                      ✓ {bulkProgress.successCount} gespeichert
                    </span>
                    {bulkProgress.errorCount > 0 && (
                      <span className="rounded-md bg-rose-500/20 px-2 py-0.5 font-bold text-rose-300 border border-rose-500/40">
                        ✗ {bulkProgress.errorCount} fehlgeschlagen
                      </span>
                    )}
                  </div>
                  <span className="text-zinc-400">
                    Verbleibend:{' '}
                    {Math.max(
                      0,
                      bulkProgress.total - bulkProgress.current
                    )}
                  </span>
                </div>

                {/* Activity Feed Terminal */}
                <div className="max-h-36 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950 p-2.5 font-mono text-[10px] text-zinc-400 space-y-1">
                  {bulkProgress.logs.map((log, idx) => (
                    <div
                      key={idx}
                      className={
                        log.startsWith('✓')
                          ? 'text-emerald-400'
                          : log.startsWith('⚠️')
                          ? 'text-amber-300 font-bold'
                          : log.startsWith('✗')
                          ? 'text-rose-400'
                          : 'text-zinc-300'
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 p-2.5 text-xs text-rose-300 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isBulkImporting}
                className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition disabled:opacity-40"
              >
                {bulkProgress && !isBulkImporting ? 'Fertigstellen & Schließen' : 'Abbrechen'}
              </button>

              {isBulkImporting ? (
                <button
                  type="button"
                  onClick={handleStopBulkImport}
                  className="flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-600/80 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-rose-600 transition active:scale-95"
                >
                  <StopCircle className="h-4 w-4" />
                  <span>Import stoppen</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartBulkAutoImport}
                  className="flex items-center gap-2 rounded-xl border border-purple-400/50 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 px-6 py-2.5 text-xs font-bold text-white shadow-[0_0_25px_rgba(168,85,247,0.45)] hover:from-purple-500 hover:to-cyan-500 transition active:scale-95"
                >
                  <Sparkles className="h-4 w-4 text-purple-200" />
                  <span>Alle 1.20 Module jetzt massenhaft importieren</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL ID / RANGE IMPORT FROM MODULES.TOP */}
        {activeTab === 'SINGLE_IMPORT' && (
          <form onSubmit={handleSingleImportSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                Ziel-Kategorie / Schwierigkeit
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DIFFICULTIES.map((diff) => {
                  const isSelected = difficulty === diff;
                  const cfg = MODULE_DIFFICULTY_CONFIG[diff];
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      disabled={isImporting}
                      className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-white/30 text-white shadow-md'
                          : 'border-white/10 bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80'
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: `${cfg.color}25`,
                              borderColor: `${cfg.color}88`,
                              color: '#ffffff',
                              boxShadow: `0 0 15px ${cfg.color}33`,
                            }
                          : {}
                      }
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                Modul-ID(s) auf modules.top
              </label>
              <input
                type="text"
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder="z.B. 11 oder 11, 13, 17 oder 10-20"
                disabled={isImporting}
                required
                className="w-full rounded-xl border border-white/15 bg-zinc-900/90 px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none transition"
              />
              <p className="mt-1.5 text-[11px] text-zinc-400 leading-relaxed">
                Unterstützt Einzel-IDs (z. B.{' '}
                <span className="font-mono text-cyan-300 font-semibold">11</span>
                ), Listen (
                <span className="font-mono text-cyan-300 font-semibold">
                  11, 17, 19
                </span>
                ) oder Bereiche (
                <span className="font-mono text-cyan-300 font-semibold">
                  10-15
                </span>
                ). Module werden als Kürzel{' '}
                <span className="font-mono text-purple-300">#&lt;id&gt;</span> mit
                Name angelegt.
              </p>
            </div>

            {importProgress && (
              <div className="rounded-2xl border border-purple-500/30 bg-zinc-900/80 p-3.5 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-purple-300 font-bold">
                    {isImporting
                      ? `Importiere Modul #${importProgress.currentId} (${importProgress.current}/${importProgress.total})...`
                      : `Import abgeschlossen (${importProgress.successCount}/${importProgress.total} erfolgreich)`}
                  </span>
                  <span className="font-mono text-xs text-zinc-400">
                    {Math.round(
                      (importProgress.current /
                        Math.max(1, importProgress.total)) *
                        100
                    )}
                    %
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        (importProgress.current /
                          Math.max(1, importProgress.total)) *
                          100
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex items-center gap-2 pt-1 font-mono text-[10px]">
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-300 border border-emerald-500/40">
                    ✓ {importProgress.successCount} erfolgreich
                  </span>
                  {importProgress.errorCount > 0 && (
                    <span className="rounded-md bg-rose-500/20 px-2 py-0.5 font-bold text-rose-300 border border-rose-500/40">
                      ✗ {importProgress.errorCount} fehlgeschlagen / 404
                    </span>
                  )}
                </div>

                {importProgress.logs.length > 0 && (
                  <div className="max-h-28 overflow-y-auto rounded-xl border border-white/5 bg-zinc-950 p-2 font-mono text-[10px] text-zinc-400 space-y-0.5">
                    {importProgress.logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={
                          log.startsWith('✓')
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 p-2.5 text-xs text-rose-300 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isImporting}
                className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition disabled:opacity-40"
              >
                {importProgress && !isImporting ? 'Schließen' : 'Abbrechen'}
              </button>

              <button
                type="submit"
                disabled={isImporting || !importInput.trim()}
                className="flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-gradient-to-r from-cyan-600 to-purple-600 px-5 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:from-cyan-500 hover:to-purple-500 transition active:scale-95 disabled:opacity-40"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Importiere...</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="h-3.5 w-3.5" />
                    <span>Jetzt importieren</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: FILE UPLOAD (.schem / .litematic) */}
        {activeTab === 'FILE' && (
          <form onSubmit={handleFileUploadSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                Kategorie / Schwierigkeit
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DIFFICULTIES.map((diff) => {
                  const isSelected = difficulty === diff;
                  const cfg = MODULE_DIFFICULTY_CONFIG[diff];
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-white/30 text-white shadow-md'
                          : 'border-white/10 bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80'
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: `${cfg.color}25`,
                              borderColor: `${cfg.color}88`,
                              color: '#ffffff',
                              boxShadow: `0 0 15px ${cfg.color}33`,
                            }
                          : {}
                      }
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                  Kürzel / ID
                </label>
                <input
                  type="text"
                  value={shortCode}
                  onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                  placeholder="z.B. E2"
                  required
                  className="w-full rounded-xl border border-white/15 bg-zinc-900/90 px-3.5 py-2 font-mono text-xs font-bold text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none transition"
                />
              </div>
              <div className="col-span-2">
                <label className="block mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                  Modul-Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Birkenwald"
                  required
                  className="w-full rounded-xl border border-white/15 bg-zinc-900/90 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                Minecraft Datei (.schem / .litematic / .schematic)
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-purple-400 bg-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.3)]'
                    : parsedSchem
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-white/15 bg-zinc-900/50 hover:border-purple-400/60 hover:bg-zinc-900/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".schem,.schematic,.litematic"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {isParsing ? (
                  <div className="flex flex-col items-center gap-2 text-purple-300">
                    <Loader2 className="h-7 w-7 animate-spin text-purple-400" />
                    <span className="font-mono text-xs font-semibold">
                      Analysiere NBT-Daten &amp; Blöcke...
                    </span>
                  </div>
                ) : parsedSchem ? (
                  <div className="flex flex-col items-center gap-1.5 text-emerald-300">
                    <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                    <span className="font-bold text-xs text-white">
                      {fileName}
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400">
                      {parsedSchem.blockCount} Blöcke erkannt (
                      {parsedSchem.dimensions.x}x{parsedSchem.dimensions.y}x
                      {parsedSchem.dimensions.z})
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-1">
                      Klicke, um eine andere Datei zu wählen
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-zinc-400">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                      <Upload className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-xs text-zinc-200">
                      .schem oder .litematic Datei hier ablegen oder klicken
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Unterstützt Litematica (.litematic), Sponge (.schem)
                      v1/v2/v3 und klassische .schematic
                    </span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 p-2.5 text-xs text-rose-300 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition"
              >
                Abbrechen
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isParsing || !parsedSchem}
                className="flex items-center gap-2 rounded-xl border border-purple-400/50 bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:bg-purple-500 transition active:scale-95 disabled:opacity-40"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Speichere...</span>
                  </>
                ) : (
                  <>
                    <FileCode className="h-3.5 w-3.5" />
                    <span>Modul anlegen &amp; speichern</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
