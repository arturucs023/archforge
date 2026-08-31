import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { BuilderConfig, DistroView, Level, ShellMode } from '../types'
import { registerActivity } from '../lib/streak'

const STORAGE_KEY = 'archforge:v1'

interface PersistState {
  shellMode: ShellMode
  level: Level
  done: Record<string, number>
  lastSection?: string
  lastStep?: string
  builderConfig?: BuilderConfig
  distroView: DistroView
  welcomeDone?: boolean
  lastPath?: string
  lastLabel?: string
  /** timestamp de la última navegación registrada */
  lastVisitAt?: number
  /** racha de aprendizaje: días consecutivos con actividad real */
  learningStreak: number
  longestLearningStreak: number
  lastLearningDay?: string
}

function load(): PersistState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistState>
      return {
        shellMode: parsed.shellMode === 'root' ? 'root' : 'user',
        level: (['beginner', 'intermediate', 'expert'] as const).includes(parsed.level as Level)
          ? (parsed.level as Level)
          : 'beginner',
        done: typeof parsed.done === 'object' && parsed.done ? parsed.done : {},
        lastSection: parsed.lastSection,
        lastStep: parsed.lastStep,
        builderConfig: parsed.builderConfig,
        distroView: (['all', 'arch', 'debian'] as const).includes(parsed.distroView as DistroView)
          ? (parsed.distroView as DistroView)
          : 'all',
        welcomeDone: parsed.welcomeDone ?? false,
        lastPath: parsed.lastPath,
        lastLabel: parsed.lastLabel,
        lastVisitAt: typeof parsed.lastVisitAt === 'number' ? parsed.lastVisitAt : undefined,
        learningStreak: typeof parsed.learningStreak === 'number' ? parsed.learningStreak : 0,
        longestLearningStreak: typeof parsed.longestLearningStreak === 'number' ? parsed.longestLearningStreak : 0,
        lastLearningDay: typeof parsed.lastLearningDay === 'string' ? parsed.lastLearningDay : undefined,
      }
    }
  } catch {
    /* estado corrupto → empezar de cero */
  }
  return { shellMode: 'user', level: 'beginner', done: {}, distroView: 'all', learningStreak: 0, longestLearningStreak: 0 }
}

interface AppContextValue extends PersistState {
  setShellMode(m: ShellMode): void
  setLevel(l: Level): void
  isDone(id: string): boolean
  toggleDone(id: string): void
  markDone(id: string, value: boolean): void
  resetProgress(): void
  importProgress(json: string): boolean
  exportProgress(): string
  setLastVisit(sectionId: string, stepId?: string): void
  setBuilderConfig(c: BuilderConfig | undefined): void
  setDistroView(v: DistroView): void
  setWelcomeDone(v: boolean): void
  setLastRoute(path: string, label: string): void
  searchOpen: boolean
  setSearchOpen(open: boolean): void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistState>(load)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* almacenamiento lleno o bloqueado */
    }
  }, [state])

  const setShellMode = useCallback((shellMode: ShellMode) => setState((s) => ({ ...s, shellMode })), [])
  const setLevel = useCallback((level: Level) => setState((s) => ({ ...s, level })), [])

  const isDone = useCallback(
    (id: string) => state.done[id] !== undefined,
    [state.done],
  )

  const markDone = useCallback((id: string, value: boolean) => {
    setState((s) => {
      const done = { ...s.done }
      if (value) done[id] = Date.now()
      else delete done[id]
      // racha: SOLO al completar contenido real (nunca por navegar); done al final para priorizar
      return value ? { ...s, ...registerActivity(s), done } : { ...s, done }
    })
  }, [])

  const toggleDone = useCallback(
    (id: string) => markDone(id, !isDone(id)),
    [isDone, markDone],
  )

  const resetProgress = useCallback(
    () =>
      setState((s) => ({
        ...s,
        done: {},
        lastSection: undefined,
        lastStep: undefined,
        learningStreak: 0,
        longestLearningStreak: 0,
        lastLearningDay: undefined,
      })),
    [],
  )

  const importProgress = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json)
      if (!parsed || typeof parsed !== 'object' || typeof parsed.done !== 'object') return false
      setState((s) => ({
        ...s,
        done: parsed.done ?? {},
        lastSection: parsed.lastSection,
        lastStep: parsed.lastStep,
        builderConfig: parsed.builderConfig,
        shellMode: parsed.shellMode === 'root' ? 'root' : 'user',
        level: (['beginner', 'intermediate', 'expert'] as const).includes(parsed.level) ? parsed.level : s.level,
        distroView: (['all', 'arch', 'debian'] as const).includes(parsed.distroView) ? parsed.distroView : s.distroView,
        welcomeDone: typeof parsed.welcomeDone === 'boolean' ? parsed.welcomeDone : s.welcomeDone,
        lastPath: parsed.lastPath,
        lastLabel: parsed.lastLabel,
        lastVisitAt: typeof parsed.lastVisitAt === 'number' ? parsed.lastVisitAt : s.lastVisitAt,
        learningStreak: typeof parsed.learningStreak === 'number' ? parsed.learningStreak : s.learningStreak,
        longestLearningStreak: typeof parsed.longestLearningStreak === 'number' ? parsed.longestLearningStreak : s.longestLearningStreak,
        lastLearningDay: typeof parsed.lastLearningDay === 'string' ? parsed.lastLearningDay : s.lastLearningDay,
      }))
      return true
    } catch {
      return false
    }
  }, [])

  const exportProgress = useCallback(() => JSON.stringify(state, null, 2), [state])

  const setLastVisit = useCallback(
    (lastSection: string, lastStep?: string) => setState((s) => ({ ...s, lastSection, lastStep })),
    [],
  )

  const setBuilderConfig = useCallback((builderConfig: BuilderConfig | undefined) => setState((s) => ({ ...s, builderConfig })), [])
  const setDistroView = useCallback((distroView: DistroView) => setState((s) => ({ ...s, distroView })), [])
  const setWelcomeDone = useCallback((welcomeDone: boolean) => setState((s) => ({ ...s, welcomeDone })), [])
  const setLastRoute = useCallback(
    (lastPath: string, lastLabel: string) => setState((s) => ({ ...s, lastPath, lastLabel, lastVisitAt: Date.now() })),
    [],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      setShellMode,
      setLevel,
      isDone,
      toggleDone,
      markDone,
      resetProgress,
      importProgress,
      exportProgress,
      setLastVisit,
      setBuilderConfig,
      setDistroView,
      setWelcomeDone,
      setLastRoute,
      searchOpen,
      setSearchOpen,
    }),
    [state, setShellMode, setLevel, isDone, toggleDone, markDone, resetProgress, importProgress, exportProgress, setLastVisit, setBuilderConfig, setDistroView, setWelcomeDone, setLastRoute, searchOpen],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
