import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Types ──────────────────────────────────────────────
export interface HistoryEntry {
  seriesId: number
  bookIdx: number
  chapterIdx: number
  chapterTitle: string
  bookTitle: string
  seriesLabel: string
  timestamp: number // Date.now()
}

interface DailyActivity {
  date: string // 'YYYY-MM-DD'
  minutes: number
}

interface ReadingState {
  // Stats
  totalMinutes: number
  chaptersRead: Record<string, boolean> // `${seriesId}-${bookIdx}-${chapterIdx}` → true
  dailyActivity: DailyActivity[] // last 90 days
  // History
  history: HistoryEntry[]

  // Actions
  addReadingTime: (seconds: number) => void
  markChapterRead: (seriesId: number, bookIdx: number, chapterIdx: number) => void
  addToHistory: (entry: HistoryEntry) => void
  clearHistory: () => void
  getChapterReadCount: () => number
  getBooksCompleted: (books: { seriesId: number; bookIdx: number; chapterCount: number }[]) => number
  getStreak: () => number
  getTodayMinutes: () => number
}

// ── Helpers ────────────────────────────────────────────
function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const MAX_HISTORY = 50

export const useReading = create<ReadingState>()(
  persist(
    (set, get) => ({
      totalMinutes: 0,
      chaptersRead: {},
      dailyActivity: [],
      history: [],

      addReadingTime: (seconds) => {
        if (seconds <= 0) return
        const minutes = seconds / 60
        const key = todayKey()
        set((s) => {
          const act = [...s.dailyActivity]
          const today = act.find((a) => a.date === key)
          if (today) {
            today.minutes += minutes
          } else {
            act.push({ date: key, minutes })
            // Keep last 90 days
            if (act.length > 90) act.shift()
          }
          return {
            totalMinutes: s.totalMinutes + minutes,
            dailyActivity: act,
          }
        })
      },

      markChapterRead: (seriesId, bookIdx, chapterIdx) => {
        const key = `${seriesId}-${bookIdx}-${chapterIdx}`
        set((s) => ({
          chaptersRead: { ...s.chaptersRead, [key]: true },
        }))
      },

      addToHistory: (entry) => {
        set((s) => {
          const h = [entry, ...s.history]
            // Dedupe same chapter, keep latest
            .filter(
              (e, i, arr) =>
                arr.findIndex(
                  (x) =>
                    x.seriesId === e.seriesId &&
                    x.bookIdx === e.bookIdx &&
                    x.chapterIdx === e.chapterIdx
                ) === i
            )
            .slice(0, MAX_HISTORY)
          return { history: h }
        })
      },

      clearHistory: () => set({ history: [] }),

      getChapterReadCount: () => Object.keys(get().chaptersRead).length,

      getBooksCompleted: (books) => {
        const read = get().chaptersRead
        return books.filter((b) => {
          let allRead = true
          for (let ci = 0; ci < b.chapterCount; ci++) {
            if (!read[`${b.seriesId}-${b.bookIdx}-${ci}`]) {
              allRead = false
              break
            }
          }
          return allRead
        }).length
      },

      getStreak: () => {
        const act = get().dailyActivity
        if (!act.length) return 0
        const sorted = [...act].sort((a, b) => b.date.localeCompare(a.date))
        // Count consecutive days back from today
        const today = todayKey()
        let streak = 0
        let check = new Date(today)
        // If no activity today, check starting from yesterday
        const hasToday = sorted.some((a) => a.date === today)
        if (!hasToday) {
          check.setDate(check.getDate() - 1)
        }
        for (let i = 0; i < 365; i++) {
          const ds = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, '0')}-${String(check.getDate()).padStart(2, '0')}`
          const found = sorted.find((a) => a.date === ds && a.minutes > 0)
          if (found) {
            streak++
            check.setDate(check.getDate() - 1)
          } else {
            break
          }
        }
        return streak
      },

      getTodayMinutes: () => {
        const key = todayKey()
        const today = get().dailyActivity.find((a) => a.date === key)
        return today ? today.minutes : 0
      },
    }),
    {
      name: 'niwj-reader-reading',
      partialize: (state) => ({
        totalMinutes: state.totalMinutes,
        chaptersRead: state.chaptersRead,
        dailyActivity: state.dailyActivity,
        history: state.history,
      }),
    }
  )
)
