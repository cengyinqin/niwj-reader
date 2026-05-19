import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'sepia'
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge'

const FONT_SIZE_MAP: Record<FontSize, number> = {
  small: 16,
  medium: 18,
  large: 22,
  xlarge: 26,
}

export function getFontSizePx(size: FontSize): number {
  return FONT_SIZE_MAP[size]
}

interface ReadingProgress {
  seriesId: number
  bookIdx: number
  chapterIdx: number
  scrollPos: number
  updatedAt: number
}

interface SettingsState {
  theme: Theme
  fontSize: FontSize
  progress: Record<string, ReadingProgress> // key = `${seriesId}-${bookIdx}`
  lastRead: { seriesId: number; bookIdx: number; chapterIdx: number } | null

  setTheme: (theme: Theme) => void
  setFontSize: (size: FontSize) => void
  saveProgress: (seriesId: number, bookIdx: number, chapterIdx: number, scrollPos: number) => void
  getProgress: (seriesId: number, bookIdx: number) => ReadingProgress | null
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      fontSize: 'medium',
      progress: {},
      lastRead: null,

      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),

      saveProgress: (seriesId, bookIdx, chapterIdx, scrollPos) => {
        const key = `${seriesId}-${bookIdx}`
        const entry: ReadingProgress = { seriesId, bookIdx, chapterIdx, scrollPos, updatedAt: Date.now() }
        set((s) => ({
          progress: { ...s.progress, [key]: entry },
          lastRead: { seriesId, bookIdx, chapterIdx },
        }))
      },

      getProgress: (seriesId, bookIdx) => {
        const key = `${seriesId}-${bookIdx}`
        return get().progress[key] || null
      },
    }),
    {
      name: 'niwj-reader-settings',
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        progress: state.progress,
        lastRead: state.lastRead,
      }),
    }
  )
)
