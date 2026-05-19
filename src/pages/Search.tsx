import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchIndex, fetchBook, IndexData, BookData } from '../hooks/useBook'

// ── Types ──────────────────────────────────────────────
interface SearchEntry {
  s: number; sl: string; b: number; bt: string; c: number; ct: string; t: string
}

type Level = 'L1' | 'L2' | 'L3'

interface L2State {
  seriesId: number; bookIdx: number; bookTitle: string
}

interface L3State {
  seriesId: number; bookIdx: number; chapterIdx: number; chapterTitle: string
}

// ── Book picker panel types ────────────────────────────
type PickerLevel = 'series' | 'books' | 'chapters'
interface PickerBook { seriesId: number; bookIdx: number; title: string; chapterCount: number }

// ── Component ──────────────────────────────────────────
export default function Search() {
  // Search state
  const [query, setQuery] = useState('')
  const [searchData, setSearchData] = useState<SearchEntry[] | null>(null)
  const [index, setIndex] = useState<IndexData | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  // Internal navigation stack
  const [level, setLevel] = useState<Level>('L1')
  const [l2, setL2] = useState<L2State | null>(null)
  const [l3, setL3] = useState<L3State | null>(null)

  // L3 state
  const [l3Content, setL3Content] = useState<string>('')
  const [l3Loading, setL3Loading] = useState(false)

  // Book picker panel
  const [showPicker, setShowPicker] = useState(false)
  const [pickerLevel, setPickerLevel] = useState<PickerLevel>('series')
  const [pickerSeriesId, setPickerSeriesId] = useState(0)
  const [pickerBooks, setPickerBooks] = useState<PickerBook[]>([])

  const inputRef = useRef<HTMLInputElement>(null)

  // ── Load data ────────────────────────────────────────
  useEffect(() => { fetchIndex().then(setIndex) }, [])

  const loadSearchData = useCallback(() => {
    if (!searchData && !searchLoading) {
      setSearchLoading(true)
      fetch('/data/search-index.json')
        .then((r) => r.json())
        .then(setSearchData)
        .catch(console.error)
        .finally(() => setSearchLoading(false))
    }
  }, [searchData, searchLoading])

  // ── Search logic ─────────────────────────────────────
  const allResults = useMemo(() => {
    if (!query.trim() || !searchData) return []
    const q = query.trim().toLowerCase()
    const results: SearchEntry[] = []
    for (const e of searchData) {
      if (e.ct.toLowerCase().includes(q) || e.t.toLowerCase().includes(q)) {
        results.push(e)
        if (results.length >= 200) break
      }
    }
    return results
  }, [query, searchData])

  // Group by series → book
  const grouped = useMemo(() => {
    const map = new Map<string, { seriesId: number; seriesLabel: string; bookIdx: number; bookTitle: string; entries: SearchEntry[] }>()
    for (const r of allResults) {
      const key = `${r.s}-${r.b}`
      if (!map.has(key)) {
        map.set(key, { seriesId: r.s, seriesLabel: r.sl, bookIdx: r.b, bookTitle: r.bt, entries: [] })
      }
      map.get(key)!.entries.push(r)
    }
    return Array.from(map.values())
  }, [allResults])

  // L2 filtered: only one book
  const l2Results = useMemo(() => {
    if (!l2 || !searchData || !query.trim()) return []
    const q = query.trim().toLowerCase()
    return searchData.filter((e) => {
      if (e.s !== l2.seriesId || e.b !== l2.bookIdx) return false
      return e.ct.toLowerCase().includes(q) || e.t.toLowerCase().includes(q)
    })
  }, [l2, searchData, query])

  // ── Handlers ─────────────────────────────────────────
  const goL2 = (seriesId: number, bookIdx: number, bookTitle: string) => {
    setL2({ seriesId, bookIdx, bookTitle })
    setLevel('L2')
  }

  const goL3 = async (seriesId: number, bookIdx: number, chapterIdx: number, chapterTitle: string) => {
    setL3({ seriesId, bookIdx, chapterIdx, chapterTitle })
    setL3Loading(true)
    setL3Content('')
    setLevel('L3')
    try {
      const book = await fetchBook(seriesId, bookIdx)
      const ch = book.chapters[chapterIdx]
      setL3Content(ch?.content || '')
    } catch { setL3Content('') }
    finally { setL3Loading(false) }
  }

  const goBack = () => {
    if (level === 'L3') setLevel('L2')
    else if (level === 'L2') { setLevel('L1'); setL2(null) }
  }

  const openPicker = () => {
    if (!index) return
    setPickerLevel('series')
    setShowPicker(true)
  }

  const pickerSelectSeries = (seriesId: number) => {
    if (!index) return
    const s = index.series.find((x) => x.id === seriesId)
    if (!s) return
    setPickerSeriesId(seriesId)
    setPickerBooks(s.books.map((b, i) => ({ seriesId, bookIdx: i, title: b.title, chapterCount: b.chapterCount })))
    setPickerLevel('books')
  }

  const pickerSelectBook = (book: PickerBook) => {
    // Navigate search to that book's chapter list
    goL2(book.seriesId, book.bookIdx, book.title)
    setShowPicker(false)
    // Trigger search if query is empty
    if (!query.trim()) {
      setQuery(' ') // dummy to trigger results
      setTimeout(() => setQuery(''), 100)
    }
  }

  const pickerBack = () => {
    if (pickerLevel === 'books') setPickerLevel('series')
    else if (pickerLevel === 'chapters') setPickerLevel('books')
  }

  // ── Highlight helper ─────────────────────────────────
  const highlight = (text: string, keyword: string) => {
    if (!keyword.trim()) return [text]
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return text.split(new RegExp(`(${escaped})`, 'gi'))
  }

  const q = query.trim().toLowerCase()

  // ── Render ───────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* ── Header ────────────────────────────── */}
      {level === 'L1' && (
        <div className="app-header search-header">
          <button className="picker-btn" onClick={openPicker}>
            📂
          </button>
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              ref={inputRef}
              className="search-input"
              type="text"
              placeholder="搜索文集..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={loadSearchData}
              autoFocus
            />
            {query && (
              <button className="search-clear" onClick={() => setQuery('')}>✕</button>
            )}
          </div>
        </div>
      )}

      {(level === 'L2' || level === 'L3') && (
        <div className="app-header">
          <button className="btn-back" onClick={goBack}>←</button>
          <h1>{level === 'L3' ? l3?.chapterTitle : l2?.bookTitle}</h1>
        </div>
      )}

      {/* ── Content ──────────────────────────── */}
      <div className="app-content">
        {/* === L1: Search Results === */}
        {level === 'L1' && (
          <>
            {searchLoading && <div className="loading">加载搜索数据...</div>}

            {!searchData && !searchLoading && (
              <div className="empty-state">
                <div className="icon">🔍</div>
                <p>输入关键词搜索章节标题和内容</p>
              </div>
            )}

            {searchData && query.trim() && allResults.length === 0 && !searchLoading && (
              <div className="empty-state">
                <div className="icon">?</div>
                <p>未找到「{query}」</p>
              </div>
            )}

            {allResults.length > 0 && (
              <div className="search-results">
                <div className="search-result-count">找到 {allResults.length} 条</div>
                {grouped.map((g) => (
                  <div key={`${g.seriesId}-${g.bookIdx}`} className="search-group">
                    <div className="search-group-header">
                      <span className="search-series">{g.seriesLabel}</span>
                      <span className="search-book-arrow">›</span>
                      <span className="search-book">{g.bookTitle}</span>
                      <span className="search-book-count">({g.entries.length}条)</span>
                    </div>
                    {g.entries.slice(0, 5).map((e, i) => (
                      <button
                        key={i}
                        className="search-result-item"
                        onClick={() => goL3(e.s, e.b, e.c, e.ct)}
                      >
                        <div className="search-chapter-title">
                          {highlight(e.ct, q).map((p, j) =>
                            p.toLowerCase() === q ? <mark key={j} className="search-highlight">{p}</mark> : p
                          )}
                        </div>
                        {e.t.toLowerCase().includes(q) && (
                          <Snippet text={e.t} keyword={q} />
                        )}
                      </button>
                    ))}
                    {g.entries.length > 5 && (
                      <button
                        className="search-more-btn"
                        onClick={() => goL2(g.seriesId, g.bookIdx, g.bookTitle)}
                      >
                        查看全部 {g.entries.length} 条 →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* === L2: Book Filter === */}
        {level === 'L2' && l2 && (
          <div className="search-results">
            <div className="search-result-count">{l2Results.length} 条匹配</div>
            {l2Results.map((e, i) => (
              <button
                key={i}
                className="search-result-item"
                onClick={() => goL3(e.s, e.b, e.c, e.ct)}
              >
                <div className="search-chapter-title">
                  {highlight(e.ct, q).map((p, j) =>
                    p.toLowerCase() === q ? <mark key={j} className="search-highlight">{p}</mark> : p
                  )}
                </div>
                {e.t.toLowerCase().includes(q) && (
                  <Snippet text={e.t} keyword={q} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* === L3: Text Locator === */}
        {level === 'L3' && l3 && <TextLocator content={l3Content} keyword={q} loading={l3Loading} />}
      </div>

      {/* ── Book Picker Panel ──────────────────── */}
      {showPicker && index && (
        <PickerPanel
          index={index}
          pickerLevel={pickerLevel}
          pickerSeriesId={pickerSeriesId}
          pickerBooks={pickerBooks}
          onClose={() => setShowPicker(false)}
          onSelectSeries={pickerSelectSeries}
          onSelectBook={pickerSelectBook}
          onBack={pickerBack}
        />
      )}
    </div>
  )
}

// ── Snippet component ───────────────────────────────────
function Snippet({ text, keyword }: { text: string; keyword: string }) {
  const idx = text.toLowerCase().indexOf(keyword)
  if (idx === -1) return null
  const start = Math.max(0, idx - 25)
  const end = Math.min(text.length, idx + keyword.length + 60)
  const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = snippet.split(new RegExp(`(${escaped})`, 'gi'))
  return (
    <div className="search-snippet">
      {parts.map((p, i) =>
        p.toLowerCase() === keyword ? <mark key={i} className="search-highlight">{p}</mark> : p
      )}
    </div>
  )
}

// ── Text Locator (L3) ───────────────────────────────────
function TextLocator({ content, keyword, loading }: { content: string; keyword: string; loading: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const markRefs = useRef<(HTMLElement | null)[]>([])
  const [currentMatch, setCurrentMatch] = useState(0)
  const [totalMatches, setTotalMatches] = useState(0)

  // Build paragraphs and find match positions
  const { paragraphs, matchCount } = useMemo(() => {
    if (!content || !keyword.trim()) {
      return { paragraphs: content.split('\n').filter(Boolean), matchCount: 0 }
    }
    const lines = content.split('\n').filter(Boolean)
    let count = 0
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'gi')
    for (const line of lines) {
      const matches = line.match(regex)
      if (matches) count += matches.length
    }
    return { paragraphs: lines, matchCount: count }
  }, [content, keyword])

  useEffect(() => {
    setTotalMatches(matchCount)
    setCurrentMatch(0)
    markRefs.current = []
  }, [content, keyword, matchCount])

  // Auto-scroll to first match
  useEffect(() => {
    if (!loading && matchCount > 0 && markRefs.current.length > 0) {
      setTimeout(() => {
        const el = markRefs.current[0]
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.style.background = '#f0a040'
          el.style.transition = 'background 0.3s'
          setTimeout(() => { el.style.background = '' }, 1500)
        }
      }, 200)
    }
  }, [loading, matchCount])

  // Scroll to specific match
  const scrollToMatch = (index: number) => {
    const el = markRefs.current[index]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.style.background = '#f0a040'
      el.style.transition = 'background 0.3s'
      setTimeout(() => { el.style.background = '' }, 1500)
      setCurrentMatch(index)
    }
  }

  const goNext = () => {
    const next = (currentMatch + 1) % matchCount
    scrollToMatch(next)
  }

  const goPrev = () => {
    const prev = (currentMatch - 1 + matchCount) % matchCount
    scrollToMatch(prev)
  }

  if (loading) return <div className="loading">加载中...</div>
  if (!content) return <div className="empty-state"><p>暂无内容</p></div>

  return (
    <div className="locator-container">
      {/* Next match bar */}
      {matchCount > 0 && (
        <div className="locator-bar">
          <button className="locator-nav-btn" onClick={goPrev}>↑</button>
          <span className="locator-counter">
            {currentMatch + 1} / {matchCount}
          </span>
          <button className="locator-nav-btn" onClick={goNext}>↓ 下一处</button>
        </div>
      )}

      {/* Text content */}
      <div ref={containerRef} className="locator-content">
        {matchCount === 0 && !keyword.trim() && (
          paragraphs.map((p, i) => <p key={i} className="locator-p">{p}</p>)
        )}
        {matchCount === 0 && keyword.trim() && (
          <div className="empty-state"><p>本章未找到「{keyword}」</p></div>
        )}
        {matchCount > 0 && (
          <HighlightedText
            paragraphs={paragraphs}
            keyword={keyword}
            markRefs={markRefs}
          />
        )}
      </div>

      {/* Floating nav */}
      {matchCount > 1 && (
        <div className="locator-fab">
          <button className="locator-fab-btn" onClick={goPrev}>↑</button>
          <span className="locator-fab-count">{currentMatch + 1}/{matchCount}</span>
          <button className="locator-fab-btn" onClick={goNext}>↓</button>
        </div>
      )}
    </div>
  )
}

// ── Highlighted paragraphs ──────────────────────────────
function HighlightedText({ paragraphs, keyword, markRefs }: {
  paragraphs: string[]; keyword: string;
  markRefs: React.MutableRefObject<(HTMLElement | null)[]>
}) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(escaped, 'gi')
  let matchIdx = 0

  return (
    <>
      {paragraphs.map((p, pi) => {
        const parts = p.split(regex)
        return (
          <p key={pi} className="locator-p">
            {parts.map((part, i) => {
              if (part.toLowerCase() === keyword.toLowerCase()) {
                const idx = matchIdx++
                return (
                  <mark
                    key={i}
                    className="locator-mark"
                    ref={(el) => { markRefs.current[idx] = el }}
                    data-match={idx}
                  >
                    {part}
                  </mark>
                )
              }
              return part
            })}
          </p>
        )
      })}
    </>
  )
}

// ── Picker Panel (bottom sheet) ─────────────────────────
function PickerPanel({ index, pickerLevel, pickerSeriesId, pickerBooks, onClose, onSelectSeries, onSelectBook, onBack }: {
  index: IndexData; pickerLevel: PickerLevel; pickerSeriesId: number; pickerBooks: PickerBook[]
  onClose: () => void; onSelectSeries: (id: number) => void; onSelectBook: (b: PickerBook) => void; onBack: () => void
}) {
  const seriesLabels: Record<number, string> = { 1: '早期著作 1922–1934', 2: '中期著作 1935–1942', 3: '晚期著作 1943–1952' }

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="picker-handle" />
        <div className="picker-header">
          {pickerLevel !== 'series' && (
            <button className="btn-back" onClick={onBack}>←</button>
          )}
          <h2>{pickerLevel === 'series' ? '选择书卷' : pickerLevel === 'books' ? index.series.find((s) => s.id === pickerSeriesId)?.label : '选择章节'}</h2>
          <button className="picker-close" onClick={onClose}>✕</button>
        </div>
        <div className="picker-body">
          {pickerLevel === 'series' && index.series.map((s) => (
            <button key={s.id} className="picker-series-card" onClick={() => onSelectSeries(s.id)}>
              <div className="picker-series-title">{s.label}</div>
              <div className="picker-series-desc">{seriesLabels[s.id] || ''}</div>
              <div className="picker-series-count">{s.books.length} 册</div>
            </button>
          ))}
          {pickerLevel === 'books' && pickerBooks.map((b) => (
            <button key={b.bookIdx} className="picker-book-item" onClick={() => onSelectBook(b)}>
              <span className="picker-book-title">{b.title}</span>
              <span className="picker-book-count">{b.chapterCount} 章</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
