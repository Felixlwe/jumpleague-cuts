import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Cut,
  CutDifficulty,
  FilterState,
  JLModule,
  MovementTech,
  Vector3D,
  VoxelBlock,
} from '@/types/jumpleague';
import { INITIAL_CUTS, INITIAL_MODULES } from '@/lib/mockModuleGenerator';
import {
  fetchCutsFromSupabase,
  insertCutIntoSupabase,
  updateCutInSupabase,
  deleteCutFromSupabase,
  fetchModulesFromSupabase,
  upsertModuleInSupabase,
  deleteModuleInSupabase,
} from '@/lib/supabase';

export type AppMode = 'EXPLORE' | 'SUBMIT' | 'ADMIN';
export type BlockPickStage = 'START' | 'MID' | 'END';

export interface SubmitCutInput {
  moduleId: string;
  name: string;
  description: string;
  timeSavedSeconds: number;
  difficulty: CutDifficulty;
  consistencyRating: number;
  techniques: MovementTech[];
  startBlock: Vector3D;
  midPoints?: Vector3D[];
  endBlock: Vector3D;
  cameraPosition: Vector3D;
  cameraTarget: Vector3D;
  videoUrl: string;
  submittedBy: string;
}

/**
 * Shared predicate to check whether a Cut matches the active FilterState
 */
export function doesCutMatchFilters(cut: Cut, filters: FilterState): boolean {
  if (
    filters.cutDifficulties.length > 0 &&
    !filters.cutDifficulties.includes(cut.difficulty)
  ) {
    return false;
  }

  if (
    filters.techniques.length > 0 &&
    !filters.techniques.some((tech) => cut.techniques.includes(tech))
  ) {
    return false;
  }

  if (cut.timeSavedSeconds < filters.minTimeSaved) {
    return false;
  }

  if (cut.consistencyRating < filters.minConsistency) {
    return false;
  }

  if (filters.searchQuery.trim() !== '') {
    const q = filters.searchQuery.toLowerCase().trim();
    const matchName = cut.name.toLowerCase().includes(q);
    const matchDesc = cut.description.toLowerCase().includes(q);
    const matchAuthor = cut.submittedBy.toLowerCase().includes(q);
    const matchTech = cut.techniques.some((t) => t.toLowerCase().includes(q));
    if (!matchName && !matchDesc && !matchAuthor && !matchTech) {
      return false;
    }
  }

  return true;
}

export interface JLStoreState {
  modules: JLModule[];
  cuts: Cut[];
  selectedModuleId: string;
  selectedCutId: string | null;
  hoveredCutId: string | null;
  showCutLines: boolean;
  isFilterDrawerOpen: boolean;
  cameraResetCounter: number;
  activeMode: AppMode;
  filters: FilterState;

  // Live 3D Camera tracking
  liveCameraPosition: Vector3D;
  liveCameraTarget: Vector3D;

  // Interactive 3D Block Picking for 'SUBMIT' mode
  pickStage: BlockPickStage;
  hoveredBlock: Vector3D | null;
  draftStartBlock: Vector3D | null;
  draftMidPoints: Vector3D[];
  activeDraftMidPointIndex: number | null;
  isDraggingInScene: boolean;
  draftEndBlock: Vector3D | null;
  draftCameraPosition: Vector3D | null;
  draftCameraTarget: Vector3D | null;

  // Admin & Cloud Database State
  isAdminAuthenticated: boolean;
  isAdminMode: boolean;
  isAdminAuthModalOpen: boolean;
  isSyncingWithSupabase: boolean;

  // Core Actions
  selectModule: (moduleId: string) => void;
  addModule: (module: JLModule) => Promise<void> | void;
  updateModule: (
    moduleId: string,
    partial: Partial<JLModule>
  ) => Promise<void> | void;
  deleteModule: (moduleId: string) => Promise<void> | void;
  replaceModuleSchematic: (
    moduleId: string,
    newBlocks: VoxelBlock[],
    dimensions?: Vector3D,
    name?: string
  ) => Promise<void> | void;
  selectCut: (cutId: string | null) => void;
  setHoveredCut: (cutId: string | null) => void;
  toggleCutLines: () => void;
  setShowCutLines: (show: boolean) => void;
  toggleFilterDrawer: () => void;
  setFilterDrawerOpen: (open: boolean) => void;
  resetCamera: () => void;
  triggerCameraReset: () => void;
  setActiveMode: (mode: AppMode) => void;
  setAdminAuthenticated: (auth: boolean) => void;
  setAdminMode: (active: boolean) => void;
  toggleAdminMode: () => void;
  setAdminAuthModalOpen: (open: boolean) => void;
  syncCutsFromSupabase: () => Promise<void>;
  syncModulesFromSupabase: () => Promise<void>;

  // Filter Actions
  updateFilters: (partial: Partial<FilterState>) => void;
  toggleCutDifficultyFilter: (difficulty: CutDifficulty) => void;
  toggleTechniqueFilter: (tech: MovementTech) => void;
  resetFilters: () => void;

  // Camera & Submission Actions
  setLiveCameraState: (position: Vector3D, target: Vector3D) => void;
  setPickStage: (stage: BlockPickStage) => void;
  setHoveredBlock: (pos: Vector3D | null) => void;
  pickBlockInScene: (pos: Vector3D, forceMidPoint?: boolean) => void;
  addInterpolatedMidPoint: (sideOffset?: number) => void;
  setActiveDraftMidPointIndex: (index: number | null) => void;
  setIsDraggingInScene: (isDragging: boolean) => void;
  updateDraftMidPoint: (index: number, nextPt: Vector3D) => void;
  removeDraftMidPoint: (index: number) => void;
  clearDraftMidPoints: () => void;
  captureCurrentCameraForDraft: () => void;
  resetDraft: () => void;

  // Cut CRUD & Admin Actions
  submitCut: (input: SubmitCutInput) => Cut;
  updateCut: (cutId: string, partial: Partial<Cut>) => void;
  approveCut: (cutId: string, overrides?: Partial<Cut>) => void;
  rejectCut: (cutId: string) => void;
  deleteCut: (cutId: string) => void;
  resetStoreToDefaults: () => void;
}

export const DEFAULT_FILTERS: FilterState = {
  moduleDifficulty: 'ALL',
  searchQuery: '',
  cutDifficulties: [],
  techniques: [],
  minTimeSaved: 0,
  minConsistency: 1,
};

function syncStateAfterFilterUpdate(
  state: JLStoreState,
  nextFilters: FilterState
): Partial<JLStoreState> {
  const nextModuleId = state.selectedModuleId;

  let nextSelectedCutId = state.selectedCutId;
  if (nextSelectedCutId) {
    const currentCut = state.cuts.find((c) => c.id === nextSelectedCutId);
    if (
      !currentCut ||
      currentCut.moduleId !== nextModuleId ||
      !doesCutMatchFilters(currentCut, nextFilters)
    ) {
      nextSelectedCutId = null;
    }
  }

  return {
    filters: nextFilters,
    selectedCutId: nextSelectedCutId,
  };
}

function getInitialAdminState(): { auth: boolean; mode: boolean } {
  if (typeof window === 'undefined') return { auth: false, mode: false };
  try {
    const auth = sessionStorage.getItem('jl_admin_auth') === 'true';
    const mode = sessionStorage.getItem('jl_admin_mode') === 'true';
    return { auth, mode: auth && mode };
  } catch {
    return { auth: false, mode: false };
  }
}

export const useJLStore = create<JLStoreState>()(
  persist(
    (set, get) => ({
      modules: INITIAL_MODULES,
      cuts: INITIAL_CUTS,
      selectedModuleId: 'E1',
      selectedCutId: null,
      hoveredCutId: null,
      showCutLines: true,
      isFilterDrawerOpen: false,
      cameraResetCounter: 0,
      activeMode: 'EXPLORE',
      filters: DEFAULT_FILTERS,

      // Admin & Supabase Sync State
      isAdminAuthenticated: getInitialAdminState().auth,
      isAdminMode: getInitialAdminState().mode,
      isAdminAuthModalOpen: false,
      isSyncingWithSupabase: false,

      liveCameraPosition: { x: 18, y: 14, z: 10 },
      liveCameraTarget: { x: 0, y: 4, z: 22 },

      pickStage: 'START',
      hoveredBlock: null,
      draftStartBlock: null,
      draftMidPoints: [],
      activeDraftMidPointIndex: null,
      isDraggingInScene: false,
      draftEndBlock: null,
      draftCameraPosition: null,
      draftCameraTarget: null,

      selectModule: (moduleId) => {
        const state = get();
        const normalizedTarget = moduleId.trim().toLowerCase();
        const matchedModule = state.modules.find(
          (m) => m.id.toLowerCase() === normalizedTarget
        );
        const resolvedId = matchedModule ? matchedModule.id : moduleId;

        set({
          selectedModuleId: resolvedId,
          selectedCutId: null,
          draftStartBlock: null,
          draftMidPoints: [],
          activeDraftMidPointIndex: null,
          draftEndBlock: null,
          pickStage: 'START',
          cameraResetCounter: state.cameraResetCounter + 1,
        });
      },

      addModule: async (newModule) => {
        // 1. Zuerst direkt an Supabase senden
        try {
          await upsertModuleInSupabase(newModule);
        } catch (err) {
          console.warn('[Store] Fehler beim Speichern des Moduls in Supabase:', err);
        }

        // 2. Danach den lokalen State aktualisieren
        const state = get();
        const existingIdx = state.modules.findIndex((m) => m.id === newModule.id);
        const updatedModules =
          existingIdx >= 0
            ? state.modules.map((m, idx) => (idx === existingIdx ? newModule : m))
            : [newModule, ...state.modules];

        set({
          modules: updatedModules,
          selectedModuleId: newModule.id,
          selectedCutId: null,
          draftStartBlock: null,
          draftMidPoints: [],
          activeDraftMidPointIndex: null,
          draftEndBlock: null,
          pickStage: 'START',
          cameraResetCounter: state.cameraResetCounter + 1,
        });
      },

      updateModule: async (moduleId, partial) => {
        const state = get();
        const currentMod = state.modules.find((m) => m.id === moduleId);
        if (!currentMod) return;

        const targetUpdated: JLModule = {
          ...currentMod,
          ...partial,
        };

        // 1. Zuerst direkt an Supabase senden
        try {
          await upsertModuleInSupabase(targetUpdated);
        } catch (err) {
          console.warn('[Store] Fehler beim Aktualisieren des Moduls in Supabase:', err);
        }

        // 2. Danach den lokalen State aktualisieren
        set({
          modules: state.modules.map((m) => (m.id === moduleId ? targetUpdated : m)),
        });
      },

      deleteModule: async (moduleId) => {
        // 1. Zuerst direkt an Supabase senden
        try {
          await deleteModuleInSupabase(moduleId);
        } catch (err) {
          console.warn('[Store] Fehler beim Löschen des Moduls in Supabase:', err);
        }

        // 2. Danach den lokalen State aktualisieren
        const state = get();
        const nextModules = state.modules.filter((m) => m.id !== moduleId);
        const nextSelected =
          state.selectedModuleId === moduleId
            ? nextModules[0]?.id || ''
            : state.selectedModuleId;

        set({
          modules: nextModules,
          selectedModuleId: nextSelected,
          selectedCutId: null,
          cameraResetCounter: state.cameraResetCounter + 1,
        });
      },

      replaceModuleSchematic: async (moduleId, newBlocks, dimensions, name) => {
        const state = get();
        const currentMod = state.modules.find((m) => m.id === moduleId);
        if (!currentMod) return;

        const targetUpdated: JLModule = {
          ...currentMod,
          name: name || currentMod.name,
          blocks: newBlocks,
          blockCount: newBlocks.length,
          dimensions: dimensions || currentMod.dimensions,
        };

        // 1. Zuerst direkt an Supabase senden
        try {
          await upsertModuleInSupabase(targetUpdated);
        } catch (err) {
          console.warn('[Store] Fehler beim Aktualisieren der Schematic in Supabase:', err);
        }

        // 2. Danach den lokalen State aktualisieren
        set({
          modules: state.modules.map((m) => (m.id === moduleId ? targetUpdated : m)),
          cameraResetCounter: state.cameraResetCounter + 1,
        });
      },

      selectCut: (cutId) => {
        if (!cutId) {
          set({ selectedCutId: null });
          return;
        }
        const targetCut = get().cuts.find((c) => c.id === cutId);
        if (targetCut && targetCut.moduleId !== get().selectedModuleId) {
          set({
            selectedModuleId: targetCut.moduleId,
            selectedCutId: cutId,
            showCutLines: true,
          });
        } else {
          set({ selectedCutId: cutId, showCutLines: true });
        }
      },

      setHoveredCut: (cutId) => set({ hoveredCutId: cutId }),

      toggleCutLines: () =>
        set((state) => ({ showCutLines: !state.showCutLines })),

      setShowCutLines: (show) => set({ showCutLines: show }),

      toggleFilterDrawer: () =>
        set((state) => ({ isFilterDrawerOpen: !state.isFilterDrawerOpen })),

      setFilterDrawerOpen: (open) => set({ isFilterDrawerOpen: open }),

      resetCamera: () =>
        set((state) => ({
          selectedCutId: null,
          cameraResetCounter: state.cameraResetCounter + 1,
        })),

      triggerCameraReset: () =>
        set((state) => ({
          selectedCutId: null,
          cameraResetCounter: state.cameraResetCounter + 1,
        })),

      setActiveMode: (mode) => {
        const current = get();

        // Security Gate: Admin Mode requires verified password
        if (mode === 'ADMIN' && !current.isAdminAuthenticated) {
          set({ isAdminAuthModalOpen: true });
          return;
        }

        if (mode === 'SUBMIT') {
          set({
            activeMode: mode,
            selectedCutId: null,
            showCutLines: true,
            pickStage: current.draftStartBlock
              ? current.draftEndBlock
                ? 'MID'
                : 'END'
              : 'START',
          });
        } else if (mode === 'ADMIN') {
          const firstPending = current.cuts.find((c) => c.status === 'PENDING');
          set({
            activeMode: mode,
            hoveredBlock: null,
            showCutLines: true,
            selectedModuleId: firstPending
              ? firstPending.moduleId
              : current.selectedModuleId,
            selectedCutId: firstPending
              ? firstPending.id
              : current.selectedCutId,
          });
        } else {
          set({
            activeMode: mode,
            hoveredBlock: null,
          });
        }
      },

      setAdminAuthenticated: (auth) => {
        if (typeof window !== 'undefined') {
          if (auth) {
            sessionStorage.setItem('jl_admin_auth', 'true');
            sessionStorage.setItem('jl_admin_mode', 'true');
          } else {
            sessionStorage.removeItem('jl_admin_auth');
            sessionStorage.removeItem('jl_admin_mode');
          }
        }
        set({
          isAdminAuthenticated: auth,
          isAdminMode: auth,
        });
      },

      setAdminMode: (active) => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('jl_admin_mode', String(active));
        }
        set({ isAdminMode: active });
      },

      toggleAdminMode: () => {
        const state = get();
        if (!state.isAdminAuthenticated) {
          set({ isAdminAuthModalOpen: true });
        } else {
          const next = !state.isAdminMode;
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('jl_admin_mode', String(next));
          }
          set({ isAdminMode: next });
        }
      },

      setAdminAuthModalOpen: (open) => set({ isAdminAuthModalOpen: open }),

      syncModulesFromSupabase: async () => {
        try {
          const remoteModules = await fetchModulesFromSupabase();
          if (remoteModules !== null && remoteModules.length > 0) {
            set((state) => {
              const moduleMap = new Map<string, JLModule>();
              // 1. Basis Mock-Module als Fundament
              INITIAL_MODULES.forEach((m) => moduleMap.set(m.id, m));
              // 2. Lokale State-Module einbeziehen
              state.modules.forEach((m) => moduleMap.set(m.id, m));
              // 3. Aus Supabase geladene Module (is_deleted = false) haben Priorität
              remoteModules.forEach((m) => moduleMap.set(m.id, m));

              return { modules: Array.from(moduleMap.values()) };
            });
          } else if (remoteModules === null) {
            // Reiner Fallback auf lokale Mock-Daten, falls Fetch-Anfrage fehlschlägt
            set((state) => ({
              modules: state.modules.length > 0 ? state.modules : INITIAL_MODULES,
            }));
          }
        } catch (err) {
          console.warn(
            '[Store] Fehler beim Laden der Module aus Supabase, nutze Fallback:',
            err
          );
          set((state) => ({
            modules: state.modules.length > 0 ? state.modules : INITIAL_MODULES,
          }));
        }
      },

      syncCutsFromSupabase: async () => {
        set({ isSyncingWithSupabase: true });
        try {
          const supabaseCuts = await fetchCutsFromSupabase();
          if (supabaseCuts && supabaseCuts.length > 0) {
            set((state) => {
              const cutMap = new Map<string, Cut>();
              // 1. Initial base mock cuts
              INITIAL_CUTS.forEach((c) => cutMap.set(c.id, c));
              // 2. Existing local storage cuts
              state.cuts.forEach((c) => cutMap.set(c.id, c));
              // 3. Supabase cuts (take precedence)
              supabaseCuts.forEach((c) => cutMap.set(c.id, c));

              return {
                cuts: Array.from(cutMap.values()),
                isSyncingWithSupabase: false,
              };
            });
          } else {
            set({ isSyncingWithSupabase: false });
          }
        } catch (err) {
          console.warn('[Store] Could not sync cuts with Supabase:', err);
          set({ isSyncingWithSupabase: false });
        }
      },

      updateFilters: (partial) =>
        set((state) => {
          const nextFilters = { ...state.filters, ...partial };
          return syncStateAfterFilterUpdate(state, nextFilters);
        }),

      toggleCutDifficultyFilter: (difficulty) =>
        set((state) => {
          const exists = state.filters.cutDifficulties.includes(difficulty);
          const nextFilters: FilterState = {
            ...state.filters,
            cutDifficulties: exists
              ? state.filters.cutDifficulties.filter((d) => d !== difficulty)
              : [...state.filters.cutDifficulties, difficulty],
          };
          return syncStateAfterFilterUpdate(state, nextFilters);
        }),

      toggleTechniqueFilter: (tech) =>
        set((state) => {
          const exists = state.filters.techniques.includes(tech);
          const nextFilters: FilterState = {
            ...state.filters,
            techniques: exists
              ? state.filters.techniques.filter((t) => t !== tech)
              : [...state.filters.techniques, tech],
          };
          return syncStateAfterFilterUpdate(state, nextFilters);
        }),

      resetFilters: () =>
        set((state) => syncStateAfterFilterUpdate(state, DEFAULT_FILTERS)),

      setLiveCameraState: (position, target) =>
        set({
          liveCameraPosition: position,
          liveCameraTarget: target,
        }),

      setPickStage: (stage) => set({ pickStage: stage }),

      setHoveredBlock: (pos) => set({ hoveredBlock: pos }),

      pickBlockInScene: (pos, forceMidPoint = false) => {
        const state = get();
        if (state.activeMode !== 'SUBMIT') return;

        if (forceMidPoint || state.pickStage === 'MID') {
          // Place mid-point in the air slightly above/around the clicked block
          const nextMidPoints = [
            ...state.draftMidPoints,
            {
              x: Number(pos.x.toFixed(1)),
              y: Number((pos.y + 1.3).toFixed(1)),
              z: Number(pos.z.toFixed(1)),
            },
          ];
          set({
            draftMidPoints: nextMidPoints,
            activeDraftMidPointIndex: nextMidPoints.length - 1,
            pickStage: state.draftEndBlock ? 'MID' : 'END',
          });
          return;
        }

        if (state.pickStage === 'START') {
          // 1st Click: Set startBlock (green marker) -> automatically advance to END
          set({
            draftStartBlock: { ...pos },
            pickStage: 'END',
          });
        } else if (state.pickStage === 'END') {
          // 2nd Click: Set endBlock (target marker) & immediately render preview curve
          set({
            draftEndBlock: { ...pos },
            draftCameraPosition:
              state.draftCameraPosition ?? { ...state.liveCameraPosition },
            draftCameraTarget:
              state.draftCameraTarget ?? { ...state.liveCameraTarget },
          });
        }
      },

      addInterpolatedMidPoint: (sideOffset = 1.5) => {
        const state = get();
        const start = state.draftStartBlock ?? { x: 0, y: 2, z: 0 };
        const end = state.draftEndBlock ?? {
          x: start.x,
          y: start.y + 1,
          z: start.z + 4,
        };
        const midX = Number(((start.x + end.x) / 2 + sideOffset).toFixed(1));
        const midY = Number((Math.max(start.y, end.y) + 1.5).toFixed(1));
        const midZ = Number(((start.z + end.z) / 2).toFixed(1));

        const nextMidPoints = [
          ...state.draftMidPoints,
          { x: midX, y: midY, z: midZ },
        ];

        set({
          draftMidPoints: nextMidPoints,
          activeDraftMidPointIndex: nextMidPoints.length - 1,
          pickStage: 'MID',
        });
      },

      setActiveDraftMidPointIndex: (index) =>
        set({ activeDraftMidPointIndex: index }),

      setIsDraggingInScene: (isDragging) =>
        set({ isDraggingInScene: isDragging }),

      updateDraftMidPoint: (index, nextPt) =>
        set((state) => ({
          draftMidPoints: state.draftMidPoints.map((pt, i) =>
            i === index ? nextPt : pt
          ),
        })),

      removeDraftMidPoint: (index) =>
        set((state) => {
          const next = state.draftMidPoints.filter((_, i) => i !== index);
          let nextActive = state.activeDraftMidPointIndex;
          if (next.length === 0) {
            nextActive = null;
          } else if (nextActive === index) {
            nextActive = Math.max(0, index - 1);
          } else if (nextActive !== null && nextActive > index) {
            nextActive = nextActive - 1;
          }
          return {
            draftMidPoints: next,
            activeDraftMidPointIndex: nextActive,
          };
        }),

      clearDraftMidPoints: () =>
        set({ draftMidPoints: [], activeDraftMidPointIndex: null }),

      captureCurrentCameraForDraft: () => {
        const state = get();
        set({
          draftCameraPosition: {
            x: Number(state.liveCameraPosition.x.toFixed(2)),
            y: Number(state.liveCameraPosition.y.toFixed(2)),
            z: Number(state.liveCameraPosition.z.toFixed(2)),
          },
          draftCameraTarget: {
            x: Number(state.liveCameraTarget.x.toFixed(2)),
            y: Number(state.liveCameraTarget.y.toFixed(2)),
            z: Number(state.liveCameraTarget.z.toFixed(2)),
          },
        });
      },

      resetDraft: () =>
        set({
          pickStage: 'START',
          draftStartBlock: null,
          draftMidPoints: [],
          activeDraftMidPointIndex: null,
          draftEndBlock: null,
          draftCameraPosition: null,
          draftCameraTarget: null,
        }),

      submitCut: (input) => {
        const newCut: Cut = {
          ...input,
          id: `cut-community-${Date.now()}`,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          cuts: [newCut, ...state.cuts],
          pickStage: 'START',
          draftStartBlock: null,
          draftMidPoints: [],
          activeDraftMidPointIndex: null,
          draftEndBlock: null,
          draftCameraPosition: null,
          draftCameraTarget: null,
          selectedCutId: newCut.id,
        }));

        // Persist directly to Supabase cloud database
        void insertCutIntoSupabase(newCut);

        return newCut;
      },

      updateCut: (cutId, partial) => {
        set((state) => ({
          cuts: state.cuts.map((c) =>
            c.id === cutId ? { ...c, ...partial } : c
          ),
        }));
        void updateCutInSupabase(cutId, partial);
      },

      approveCut: (cutId, overrides) => {
        const payload: Partial<Cut> = { ...(overrides ?? {}), status: 'APPROVED' };
        set((state) => ({
          cuts: state.cuts.map((c) =>
            c.id === cutId ? { ...c, ...payload } : c
          ),
        }));
        void updateCutInSupabase(cutId, payload);
      },

      rejectCut: (cutId) => {
        set((state) => ({
          cuts: state.cuts.map((c) =>
            c.id === cutId ? { ...c, status: 'REJECTED' } : c
          ),
        }));
        void updateCutInSupabase(cutId, { status: 'REJECTED' });
      },

      deleteCut: (cutId) => {
        set((state) => ({
          cuts: state.cuts.filter((c) => c.id !== cutId),
          selectedCutId:
            state.selectedCutId === cutId ? null : state.selectedCutId,
        }));
        void deleteCutFromSupabase(cutId);
      },

      resetStoreToDefaults: () =>
        set({
          modules: INITIAL_MODULES,
          cuts: INITIAL_CUTS,
          selectedModuleId: 'E1',
          selectedCutId: null,
          showCutLines: true,
          filters: DEFAULT_FILTERS,
          activeMode: 'EXPLORE',
        }),
    }),
    {
      name: 'jumpleague-cuts-jlstore-v2',
      partialize: (state) => ({
        cuts: state.cuts,
        selectedModuleId: state.selectedModuleId,
        showCutLines: state.showCutLines,
      }),
    }
  )
);

// Auto-sync cuts and modules from Supabase cloud database upon client load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    void useJLStore.getState().syncCutsFromSupabase();
    void useJLStore.getState().syncModulesFromSupabase();
  }, 50);
}

