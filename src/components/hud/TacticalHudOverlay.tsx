'use client';

import React from 'react';
import { TopHudBar } from './TopHudBar';
import { FilterAndCutListPanel } from './FilterAndCutListPanel';
import { CutInspectorPanel } from './CutInspectorPanel';
import { CutSubmissionPanel } from './CutSubmissionPanel';
import { AdminReviewPanel } from './AdminReviewPanel';
import { BottomHudBar } from './BottomHudBar';
import { useJumpLeagueStore } from '@/store/useJumpLeagueStore';

export const TacticalHudOverlay: React.FC = () => {
  const activeMode = useJumpLeagueStore((s) => s.activeMode);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-4">
      {/* Top Bar */}
      <TopHudBar />

      {/* Middle Workspace Columns: Left (List/Admin) & Right (Inspector/Submit) */}
      <div className="my-3 flex flex-1 items-start justify-between gap-4 overflow-hidden">
        {/* Left Floating Column */}
        {activeMode === 'ADMIN' ? (
          <AdminReviewPanel />
        ) : (
          <FilterAndCutListPanel />
        )}

        {/* Right Floating Column */}
        {activeMode === 'SUBMIT' ? (
          <CutSubmissionPanel />
        ) : (
          <CutInspectorPanel />
        )}
      </div>

      {/* Bottom Telemetry & Color Legend Bar */}
      <BottomHudBar />
    </div>
  );
};
