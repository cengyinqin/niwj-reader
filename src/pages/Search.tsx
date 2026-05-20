import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { fetchIndex, fetchBook, IndexData } from '../hooks/useBook'
import { IconFolder, IconSearch, IconX, IconArrowLeft, IconArrowRight, IconArrowUp, IconArrowDown } from '../components/Icons'

// ── Types ──────────────────────────────────────────────
interface SearchEntry {
  s: number; sl: string; b: number; bt: string; c: number; ct: string; t: string
}

type Level = 'L1' | 'L2' | 'L3'

interface L2State { seriesId: number; bookIdx: number; bookTitle: string }
interface L3State { seriesId: number; bookIdx: number; chapterIdx: number; chapterTitle: string }

interface PickerBook { seriesId: number; bookIdx: number; title: string; chapterCount: number }

// ── Highlight helper: split with capturing group ─────────
function splitHighlight(text: string, keyword: string): string[] {
  if (!keyword.trim()) return [text]
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.split(new RegExp(`(${escaped})`, 'gi'))
}

function isMatch(part: string, keyword: string): boolean {
  return part.toLowerCase() === keyword.toLowerCase()
}

// ── Component ──────────────────────────────────────────
export default function Search() {
  const [query, setQuery] = useState('')
  const [searchData, setSearchData] = useState<SearchEntry[] | null>(null)
  const [index, setIndex] = useState<IndexData | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const [level, setLevel] = useState<Level>('L1')
  const [l2, setL2] = useState<L2State | null>(null)
  const [l3, setL3] = useState<L3State | null>(null)

  // L3 state
  const [l3Content, setL3Content] = useState<string>('')
  const [l3Loading, setL3Loading] = useState(false)

  // Picker
  const [showPicker, setShowPicker] = useState(false)
  const [pickerLevel, setPickerLevel] = useState<'series' | 'books'>('series')
  const [pickerSeriesId, setPickerSeriesId] = useState(0)
  const [pickerBooks, setPickerBooks] = useState<PickerBook[]>([])

  // ── Load index ────────────────────────────────────────
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

  const q = query.trim()

  // ── Search results ───────────────────────────────────
  const allResults = useMemo(() => {
    if (!q || !searchData) return []
    const lower = q.toLowerCase()
    const results: SearchEntry[] = []
    for (const e of searchData) {
      if (e.ct.toLowerCase().includes(lower) || e.t.toLowerCase().includes(lower)) {
        results.push(e)
        if (results.length >= 200) break
      }
    }
    return results
  }, [q, searchData])

  // Grouped L1
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

  // L2: search-filtered or browse-all (when no query)
  const l2Results = useMemo(() => {
    if (!l2 || !searchData) return []
    if (q) {
      const lower = q.toLowerCase()
      return searchData.filter((e) => {
        if (e.s !== l2.seriesId || e.b !== l2.bookIdx) return false
        return e.ct.toLowerCase().includes(lower) || e.t.toLowerCase().includes(lower)
      })
    }
    // Browse mode: no query, show all chapters for this book
    return searchData.filter((e) => e.s === l2.seriesId && e.b === l2.bookIdx)
  }, [l2, searchData, q])

  // L2 chapter list (for browse mode from picker, via index.json)
  const l2BrowseChapters = useMemo(() => {
    if (q || !l2 || !index) return null
    const series = index.series.find((s) => s.id === l2.seriesId)
    if (!series) return null
    const book = series.books[l2.bookIdx]
    if (!book) return null
    return book.chapters
  }, [q, l2, index])

  // Books that have search results (for filtering picker)
  const resultBooks = useMemo(() => {
    if (!q || !searchData) return new Set<string>()
    const set = new Set<string>()
    for (const r of allResults) {
      set.add(`${r.s}-${r.b}`)
    }
    return set
  }, [allResults, q, searchData])

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
    if (level === 'L3') {
      if (l2) setLevel('L2')
      else setLevel('L1')
    } else if (level === 'L2') {
      setLevel('L1'); setL2(null)
    }
  }

  // ── Picker: only show books with results ──────────────
  const openPicker = () => {
    if (!index) return
    if (q && resultBooks.size > 0) {
      // Filter: show series with matching books
      setPickerLevel('series')
      setShowPicker(true)
    } else if (!q) {
      // Browse all
      setPickerLevel('series')
      setShowPicker(true)
    } else {
      // Has query but no results — show all anyway
      setPickerLevel('series')
      setShowPicker(true)
    }
  }

  const pickerSelectSeries = (seriesId: number) => {
    if (!index) return
    const s = index.series.find((x) => x.id === seriesId)
    if (!s) return
    setPickerSeriesId(seriesId)
    // Filter books to only those with matches (if query exists)
    let books = s.books.map((b, i) => ({ seriesId, bookIdx: i, title: b.title, chapterCount: b.chapterCount }))
    if (q && resultBooks.size > 0) {
      books = books.filter((b) => resultBooks.has(`${seriesId}-${b.bookIdx}`))
    }
    setPickerBooks(books)
    setPickerLevel('books')
  }

  const pickerSelectBook = (book: PickerBook) => {
    goL2(book.seriesId, book.bookIdx, book.title)
    setShowPicker(false)
  }

  const pickerBack = () => {
    if (pickerLevel === 'books') setPickerLevel('series')
  }

  // ── Render ───────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* Header */}
      {level === 'L1' && (
        <div className="app-header search-header">
          <button className="picker-btn" onClick={openPicker}><IconFolder size={18} /></button>
          <div className="search-input-wrap">
            <span className="search-icon"><IconSearch size={16} /></span>
            <input
              className="search-input"
              type="text"
              placeholder="搜索文集..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={loadSearchData}
              autoFocus
            />
            {query && <button className="search-clear" onClick={() => setQuery('')}><IconX size={14} /></button>}
          </div>
        </div>
      )}

      {(level === 'L2' || level === 'L3') && (
        <div className="app-header">
          <button className="btn-back" onClick={goBack}><IconArrowLeft size={18} /></button>
          <h1>{level === 'L3' ? l3?.chapterTitle : l2?.bookTitle}</h1>
        </div>
      )}

      {/* Content */}
      <div className="app-content">
        {/* === L1 === */}
        {level === 'L1' && (
          <>
            {searchLoading && <div className="loading">加载搜索数据...</div>}

            {!searchData && !searchLoading && (
              <div className="empty-state">
                <div className="icon"><IconSearch size={36} /></div>
                <p>输入关键词搜索章节标题和内容</p>
              </div>
            )}

            {searchData && q && allResults.length === 0 && !searchLoading && (
              <div className="empty-state">
                <div className="icon">?</div>
                <p>未找到「{q}」</p>
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
                          {splitHighlight(e.ct, q).map((p, j) =>
                            isMatch(p, q) ? <mark key={j} className="search-highlight">{p}</mark> : p
                          )}
                        </div>
                        {e.t.toLowerCase().includes(q.toLowerCase()) && <Snippet text={e.t} keyword={q} />}
                      </button>
                    ))}
                    {g.entries.length > 5 && (
                      <button className="search-more-btn" onClick={() => goL2(g.seriesId, g.bookIdx, g.bookTitle)}>
                        查看全部 {g.entries.length} 条 <IconArrowRight size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* === L2 === */}
        {level === 'L2' && l2 && (
          <div className="search-results">
            {/* Search mode */}
            {q && (
              <>
                <div className="search-result-count">{l2Results.length} 条匹配</div>
                {l2Results.map((e, i) => (
                  <button key={i} className="search-result-item" onClick={() => goL3(e.s, e.b, e.c, e.ct)}>
                    <div className="search-chapter-title">
                      {splitHighlight(e.ct, q).map((p, j) =>
                        isMatch(p, q) ? <mark key={j} className="search-highlight">{p}</mark> : p
                      )}
                    </div>
                    {e.t.toLowerCase().includes(q.toLowerCase()) && <Snippet text={e.t} keyword={q} />}
                  </button>
                ))}
              </>
            )}
            {/* Browse mode: all chapters of the book */}
            {!q && l2BrowseChapters && (
              <>
                <div className="search-result-count">{l2BrowseChapters.length} 章</div>
                {l2BrowseChapters.map((ch, ci) => (
                  <button key={ci} className="search-result-item" onClick={() => goL3(l2.seriesId, l2.bookIdx, ci, ch.title)}>
                    <div className="search-chapter-title">{ch.title}</div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* === L3 === */}
        {level === 'L3' && l3 && (
          <TextLocator content={l3Content} keyword={q} loading={l3Loading} />
        )}
      </div>

      {/* Picker */}
      {showPicker && index && (
        <PickerPanel
          index={index}
          pickerLevel={pickerLevel}
          pickerSeriesId={pickerSeriesId}
          pickerBooks={pickerBooks}
          resultBooks={resultBooks}
          hasQuery={!!q}
          onClose={() => setShowPicker(false)}
          onSelectSeries={pickerSelectSeries}
          onSelectBook={pickerSelectBook}
          onBack={pickerBack}
        />
      )}
    </div>
  )
}

// ── Snippet ─────────────────────────────────────────────
function Snippet({ text, keyword }: { text: string; keyword: string }) {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) return null
  const start = Math.max(0, idx - 25)
  const end = Math.min(text.length, idx + keyword.length + 60)
  const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
  return (
    <div className="search-snippet">
      {splitHighlight(snippet, keyword).map((p, i) =>
        isMatch(p, keyword) ? <mark key={i} className="search-highlight">{p}</mark> : p
      )}
    </div>
  )
}

// ── Text Locator (L3) ───────────────────────────────────
function TextLocator({ content, keyword, loading }: { content: string; keyword: string; loading: boolean }) {
  const markRefs = useRef<(HTMLElement | null)[]>([])
  const currentRef = useRef(0)
  const [currentMatch, setCurrentMatch] = useState(0)
  const renderId = useRef(0)

  // Paragraphs + match count
  const { paragraphs, matchCount } = useMemo(() => {
    if (!content) return { paragraphs: [] as string[], matchCount: 0 }
    const lines = content.split('\n').filter(Boolean)
    if (!keyword.trim()) return { paragraphs: lines, matchCount: 0 }
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'gi')
    let count = 0
    for (const line of lines) {
      const m = line.match(regex)
      if (m) count += m.length
    }
    return { paragraphs: lines, matchCount: count }
  }, [content, keyword])

  // On content/keyword change: bump renderId to force HighlightedText remount
  // and reset match tracking. Do NOT clear refs here — let the remount do it.
  useEffect(() => {
    renderId.current++
    currentRef.current = 0
    setCurrentMatch(0)
  }, [content, keyword])

  // Auto-scroll to first match after DOM is painted with new refs
  useEffect(() => {
    if (matchCount === 0) return
    const id = renderId.current
    // Wait for browser to paint: rAF fires before paint, double-rAF fires after
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Guard against stale effect from previous render
        if (id !== renderId.current) return
        const el = markRefs.current[0]
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          flash(el)
        }
      })
    })
  }, [content, keyword, matchCount])

  const scrollToMatch = (index: number) => {
    const el = markRefs.current[index]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      flash(el)
      currentRef.current = index
      setCurrentMatch(index)
    }
  }

  const goNext = () => { scrollToMatch((currentRef.current + 1) % matchCount) }
  const goPrev = () => { scrollToMatch((currentRef.current - 1 + matchCount) % matchCount) }

  if (loading) return <div className="loading">加载中...</div>
  if (!content) return <div className="empty-state"><p>暂无内容</p></div>

  return (
    <div className="locator-container">
      {matchCount > 0 && (
        <div className="locator-bar">
          <button className="locator-nav-btn" onClick={goPrev}><IconArrowUp size={14} /></button>
          <span className="locator-counter">{currentMatch + 1} / {matchCount}</span>
          <button className="locator-nav-btn" onClick={goNext}><IconArrowDown size={14} /> 下一处</button>
        </div>
      )}

      <div className="locator-content">
        {matchCount === 0 && !keyword.trim() && paragraphs.map((p, i) => <p key={i} className="locator-p">{p}</p>)}
        {matchCount === 0 && keyword.trim() && <div className="empty-state"><p>本章未找到「{keyword}」</p></div>}
        {matchCount > 0 && (
          <HighlightedText
            key={renderId.current}
            paragraphs={paragraphs}
            keyword={keyword}
            markRefs={markRefs}
          />
        )}
      </div>

      {matchCount > 1 && (
        <div className="locator-fab">
          <button className="locator-fab-btn" onClick={goPrev}><IconArrowUp size={14} /></button>
          <span className="locator-fab-count">{currentMatch + 1}/{matchCount}</span>
          <button className="locator-fab-btn" onClick={goNext}><IconArrowDown size={14} /></button>
        </div>
      )}
    </div>
  )
}

// Flash highlight on current match
function flash(el: HTMLElement) {
  el.style.background = '#f0a040'
  el.style.transition = 'background 0.3s'
  setTimeout(() => { el.style.background = '' }, 1500)
}

// ── Highlighted Text ────────────────────────────────────
function HighlightedText({ paragraphs, keyword, markRefs }: {
  paragraphs: string[]; keyword: string;
  markRefs: React.MutableRefObject<(HTMLElement | null)[]>
}) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi') // ← capturing group, key fix
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

// ── Picker Panel ────────────────────────────────────────
function PickerPanel({ index, pickerLevel, pickerSeriesId, pickerBooks, resultBooks, hasQuery, onClose, onSelectSeries, onSelectBook, onBack }: {
  index: IndexData; pickerLevel: string; pickerSeriesId: number; pickerBooks: PickerBook[]
  resultBooks: Set<string>; hasQuery: boolean
  onClose: () => void; onSelectSeries: (id: number) => void; onSelectBook: (b: PickerBook) => void; onBack: () => void
}) {
  const seriesLabels: Record<number, string> = { 1: '早期著作 1922–1934', 2: '中期著作 1935–1942', 3: '晚期著作 1943–1952' }

  // Filter series: only show those with matching books (when query active)
  const visibleSeries = useMemo(() => {
    if (!hasQuery || resultBooks.size === 0) return index.series
    const ids = new Set<number>()
    for (const key of resultBooks) {
      ids.add(parseInt(key.split('-')[0], 10))
    }
    return index.series.filter((s) => ids.has(s.id))
  }, [index, resultBooks, hasQuery])

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="picker-handle" />
        <div className="picker-header">
          {pickerLevel !== 'series' && <button className="btn-back" onClick={onBack}><IconArrowLeft size={18} /></button>}
          <h2>
            {pickerLevel === 'series' ? '选择书卷' : index.series.find((s) => s.id === pickerSeriesId)?.label || ''}
          </h2>
          <button className="picker-close" onClick={onClose}><IconX size={16} /></button>
        </div>
        <div className="picker-body">
          {pickerLevel === 'series' && visibleSeries.map((s) => (
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
          {pickerLevel === 'books' && pickerBooks.length === 0 && (
            <div className="empty-state"><p>无匹配书卷</p></div>
          )}
        </div>
      </div>
    </div>
  )
}
