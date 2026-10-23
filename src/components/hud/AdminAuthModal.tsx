'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useJLStore } from '@/store/useJLStore';

export const AdminAuthModal: React.FC = () => {
  const isOpen = useJLStore((s) => s.isAdminAuthModalOpen);
  const setOpen = useJLStore((s) => s.setAdminAuthModalOpen);
  const setAuthenticated = useJLStore((s) => s.setAdminAuthenticated);
  const setActiveMode = useJLStore((s) => s.setActiveMode);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage('Bitte gib das Admin-Passwort ein.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          setAuthenticated(true);
          setOpen(false);
          setActiveMode('ADMIN');
          setPassword('');
          setSuccess(false);
        }, 400);
      } else {
        setErrorMessage(data.error || 'Ungültiges Admin-Passwort.');
      }
    } catch {
      setErrorMessage('Verbindungsfehler beim Verifizieren des Passworts.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPassword('');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-purple-500/30 bg-zinc-950/95 p-6 shadow-[0_0_60px_rgba(168,85,247,0.25)] text-zinc-100">
        {/* Glow ambient background accent */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-cyan-600/15 blur-3xl" />

        {/* Header */}
        <div className="relative flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-400/40 bg-purple-500/20 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.35)]">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-purple-400">
                  SECURITY CLEARANCE // LEVEL 4
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Admin-Freigabe erforderlich
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body content */}
        <p className="mt-3 text-xs leading-relaxed text-zinc-300">
          Dieser Bereich ist für Moderatoren und Administratoren reserviert.
          Bitte autorisiere dich, um Community-Cuts zu prüfen, freizuschalten
          oder abzulehnen.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
              Admin-Passwort
            </label>
            <div className="relative flex items-center">
              <Lock className="pointer-events-none absolute left-3.5 h-4 w-4 text-zinc-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Passwort eingeben..."
                className="w-full rounded-xl border border-white/15 bg-zinc-900/90 py-2.5 pl-10 pr-10 text-xs text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-zinc-400 hover:text-zinc-200 transition"
                title={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 p-2.5 text-xs text-rose-300 animate-in fade-in duration-150">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-2.5 text-xs text-emerald-300 animate-in fade-in duration-150">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Zugriff autorisiert! Admin-Panel wird geladen...</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition"
            >
              Abbrechen
            </button>

            <button
              type="submit"
              disabled={isLoading || success}
              className="flex items-center gap-1.5 rounded-xl border border-purple-400/50 bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:bg-purple-500 transition active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Überprüfe...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Freischalten</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Tactical helper footer */}
        <div className="mt-5 border-t border-white/5 pt-3 font-mono text-[10px] text-zinc-400 flex items-center justify-between">
          <span>STATUS: GESCHÜTZT</span>
          <span>DEV-KEY: &apos;jumpleague-admin&apos;</span>
        </div>
      </div>
    </div>
  );
};
