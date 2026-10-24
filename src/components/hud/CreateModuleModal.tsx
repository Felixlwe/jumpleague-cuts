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
  const [activeTab, setActiveTab] = useState<'FILE' | 'MODULES_TOP'>('FILE');
  const [difficulty, setDifficulty] =
    useState<ModuleDifficulty>(defaultDifficulty);

  // File Upload State
  const [shortCode, setShortCode] = useState('');
  const [name, setName] = useState('');
  const [parsedSchem, setParsedSchem] = useState<ParsedSchematic | null>(null);
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // modules.top Import State
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

      // Autofill name if still empty
      if (!name.trim()) {
        setName(parsed.name);
      }
      // Autofill shortCode if still empty
      if (!shortCode.trim()) {
        const prefix = difficulty.charAt(0).toUpperCase();
        setShortCode(`${prefix}-NEW`);
      }
    } catch (err: any) {
      console.error('Failed to parse schematic:', err);
      setError(err.message || 'Fehler beim Lesen der Schematic-Datei.');
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
      const finalId = shortCode.trim().toUpperCase();
      const newModule: JLModule = {
        id: finalId,
        shortCode: finalId,
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
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern des Moduls.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModulesTopImportSubmit = async (e: React.FormEvent) => {
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
        const response = await fetch('/api/import-module', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleId: targetId, source: '120' }),
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.base64) {
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const cleanId = String(targetId).trim().replace(/^#+/, '');
        const finalId = cleanId;
        const shortCode = `#${cleanId}`;

        const parsed = await parseBase64Schematic(
          data.base64,
          `Modul ${cleanId}`,
          {
            difficulty,
            shortCode,
            name: `Modul ${cleanId}`,
          }
        );

        const newModule: JLModule = {
          id: finalId,
          shortCode,
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
          `✓ Modul #${targetId}: ${parsed.blockCount} Blöcke erfolgreich gespeichert`
        );
      } catch (err: any) {
        errors++;
        newLogs.push(
          `✗ Modul #${targetId}: ${err.message || 'Fehler beim Importieren'}`
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

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isImporting && !isSubmitting) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-purple-500/30 bg-zinc-950/95 p-6 shadow-[0_0_60px_rgba(168,85,247,0.25)] text-zinc-100"
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
                Neues JumpLeague-Modul hinzufügen
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isImporting || isSubmitting}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition disabled:opacity-40"
            title="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher: File Upload vs modules.top Import */}
        <div className="mt-4 flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/80 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('FILE');
              setError(null);
            }}
            disabled={isImporting || isSubmitting}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === 'FILE'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-400/50 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Datei (.schem / .litematic)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('MODULES_TOP');
              setError(null);
            }}
            disabled={isImporting || isSubmitting}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === 'MODULES_TOP'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-400/50 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Von modules.top importieren</span>
          </button>
        </div>

        {/* TAB 1: Local File Upload Form */}
        {activeTab === 'FILE' ? (
          <form onSubmit={handleFileUploadSubmit} className="mt-4 space-y-4">
            {/* 1. Category Selection */}
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

            {/* 2. Kürzel/ID & Name */}
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

            {/* 3. Drag & Drop Schematic Upload */}
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

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 p-2.5 text-xs text-rose-300 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
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
        ) : (
          /* TAB 2: modules.top Direct Importer Form */
          <form onSubmit={handleModulesTopImportSubmit} className="mt-4 space-y-4">
            {/* 1. Category Selection */}
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

            {/* 2. Modul-ID(s) Input */}
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

            {/* 3. Progress Bar & Live Status */}
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

                {/* Progress Bar */}
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

                {/* Summary badges */}
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

                {/* Live Logs Box */}
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

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 p-2.5 text-xs text-rose-300 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
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
      </div>
    </div>
  );
};
