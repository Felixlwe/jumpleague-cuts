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
} from 'lucide-react';
import { JLModule, ModuleDifficulty } from '@/types/jumpleague';
import { parseSchematicFile, ParsedSchematic } from '@/lib/schematicParser';
import { MODULE_DIFFICULTY_CONFIG } from '@/constants/jumpleagueConfig';

interface CreateModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDifficulty: ModuleDifficulty;
  onSave: (module: JLModule) => Promise<void> | void;
}

const DIFFICULTIES: ModuleDifficulty[] = ['EASY', 'MEDIUM', 'HARD', 'ULTRA'];

export const CreateModuleModal: React.FC<CreateModuleModalProps> = ({
  isOpen,
  onClose,
  defaultDifficulty,
  onSave,
}) => {
  const [difficulty, setDifficulty] =
    useState<ModuleDifficulty>(defaultDifficulty);
  const [shortCode, setShortCode] = useState('');
  const [name, setName] = useState('');
  const [parsedSchem, setParsedSchem] = useState<ParsedSchematic | null>(null);
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    if (!file.name.match(/\.(schem|schematic)$/i)) {
      setError('Bitte wähle eine gültige .schem oder .schematic Datei aus.');
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

  const handleSubmit = async (e: React.FormEvent) => {
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
      setError('Bitte lade eine .schem-Datei mit mindestens 1 Block hoch.');
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

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-purple-500/30 bg-zinc-950/95 p-6 shadow-[0_0_60px_rgba(168,85,247,0.25)] text-zinc-100"
      >
        {/* Glow ambient background accent */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-emerald-600/15 blur-3xl" />

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
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
            title="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
              Sponge Schematic (.schem / .schematic)
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
                accept=".schem,.schematic"
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
                    .schem Datei hier ablegen oder klicken
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Unterstützt Sponge (.schem) v1/v2/v3 und klassische .schematic
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
      </div>
    </div>
  );
};
