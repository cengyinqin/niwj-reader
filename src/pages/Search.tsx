import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchIndex, IndexData } from '../hooks/useBook'

interface SearchEntry {
  s: number // seriesId
  sl: string // seriesLabel
  b: number // bookIdx
  bt: string // bookTitle
  c: number // chapterIdx
  ct: string // chapterTitle
  t: string // text snippet
}

interface SearchResult {
  seriesId: number
  seriesLabel: string
  bookIdx: number
  bookTitle: string
  chapterIdx: number
  chapterTitle: string
  // Where the match was found
  matchInTitle: boolean
  matchInContent: boolean
  snippet: string // matched context
}

export default function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [searchData, setSearchData] = useState<SearchEntry[] | null>(null)
  const [index, setIndex] = useState<IndexData | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load search index lazily
  useEffect(() => {
    fetchIndex().then(setIndex)
  }, [])

  const handleFocus = () => {
    if (!searchData) {
      setLoading(true)
      fetch('/data/search-index.json')
        .then((r) => r.json())
        .then(setSearchData)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }

  // Search
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim() || !searchData) return []
    const q = query.trim().toLowerCase()
    const matches: SearchResult[] = []

    for (const entry of searchData) {
      const titleMatch = entry.ct.toLowerCase().includes(q)
      const contentIdx = entry.t.toLowerCase().indexOf(q)

      if (titleMatch || contentIdx !== -1) {
        // Build snippet
        let snippet = ''
        if (contentIdx !== -1) {
          const start = Math.max(0, contentIdx - 30)
          const end = Math.min(entry.t.length, contentIdx + q.length + 80)
          snippet = (start > 0 ? '…' : '') + entry.t.slice(start, end) + (end < entry.t.length ? '…' : '')
        }

        matches.push({
          seriesId: entry.s,
          seriesLabel: entry.sl,
          bookIdx: entry.b,
          bookTitle: entry.bt,
          chapterIdx: entry.c,
          chapterTitle: entry.ct,
          matchInTitle: titleMatch,
          matchInContent: contentIdx !== -1,
          snippet,
        })
      }

      // Limit results
      if (matches.length >= 80) break
    }

    // Sort: title matches first, then content matches
    matches.sort((a, b) => {
      if (a.matchInTitle !== b.matchInTitle) return a.matchInTitle ? -1 : 1
      return 0
    })

    return matches
  }, [query, searchData])

  const handleSelect = (r: SearchResult) => {
    // Navigate with from=search to skip history/progress tracking
    navigate(`/reader/${r.seriesId}/${r.bookIdx}/${r.chapterIdx}?from=search`)
  }

  // Highlight keyword in text
  const highlight = (text: string, keyword: string) => {
    if (!keyword.trim()) return text
    const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((p, i) =>
      p.toLowerCase() === keyword.toLowerCase() ? <mark key={i} className="search-highlight">{p}</mark> : p
    )
  }

  // Group results by series → book
  const grouped = useMemo(() => {
    const map = new Map<string, { seriesId: number; seriesLabel: string; bookIdx: number; bookTitle: string; chapters: SearchResult[] }>()
    for (const r of results) {
      const key = `${r.seriesId}-${r.bookIdx}`
      if (!map.has(key)) {
        map.set(key, { seriesId: r.seriesId, seriesLabel: r.seriesLabel, bookIdx: r.bookIdx, bookTitle: r.bookTitle, chapters: [] })
      }
      map.get(key)!.chapters.push(r)
    }
    return Array.from(map.values())
  }, [results])

  const q = query.trim().toLowerCase()

  return (
    <div className="app-shell">
      {/* Search header */}
      <div className="app-header search-header">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder="搜索文集..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            autoFocus
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="app-content">
        {/* Loading state */}
        {loading && <div className="loading">加载搜索数据...</div>}

        {/* No index loaded yet */}
        {!searchData && !loading && (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <p>点击搜索框开始</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>可搜索章节标题和内容</p>
          </div>
        )}

        {/* No results */}
        {searchData && query.trim() && results.length === 0 && !loading && (
          <div className="empty-state">
            <div className="icon">?</div>
            <p>未找到「{query}」相关结果</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="search-results">
            <div className="search-result-count">
              找到 {results.length} 条结果
            </div>
            {grouped.map((group) => (
              <div key={`${group.seriesId}-${group.bookIdx}`} className="search-group">
                <div className="search-group-header">
                  <span className="search-series">{group.seriesLabel}</span>
                  <span className="search-book-arrow">›</span>
                  <span className="search-book">{group.bookTitle}</span>
                </div>
                {group.chapters.map((r, i) => (
                  <button
                    key={i}
                    className="search-result-item"
                    onClick={() => handleSelect(r)}
                  >
                    <div className="search-chapter-title">
                      {r.matchInTitle ? highlight(r.chapterTitle, q) : r.chapterTitle}
                    </div>
                    {r.matchInContent && r.snippet && (
                      <div className="search-snippet">
                        {highlight(r.snippet, q)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
