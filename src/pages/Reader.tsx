import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { fetchBook, fetchIndex, BookData, ChapterData, BookMeta } from '../hooks/useBook'
import { useSettings, getFontSizePx, Theme, FontSize } from '../store/settings'

export default function Reader() {
  const { seriesId, bookIdx, chapterIdx } = useParams<{
    seriesId: string
    bookIdx: string
    chapterIdx: string
  }>()
  const navigate = useNavigate()

  const sid = parseInt(seriesId || '1', 10)
  const bidx = parseInt(bookIdx || '0', 10)
  const cidx = parseInt(chapterIdx || '0', 10)

  const theme = useSettings((s) => s.theme)
  const fontSize = useSettings((s) => s.fontSize)
  const setTheme = useSettings((s) => s.setTheme)
  const setFontSize = useSettings((s) => s.setFontSize)
  const saveProgress = useSettings((s) => s.saveProgress)

  const [bookData, setBookData] = useState<BookData | null>(null)
  const [bookMeta, setBookMeta] = useState<BookMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chapter, setChapter] = useState<ChapterData | null>(null)
  const [showControls, setShowControls] = useState(false)
  const [scrollPct, setScrollPct] = useState(0)

  const contentRef = useRef<HTMLDivElement>(null)
  const [showScrollbar, setShowScrollbar] = useState(false)
  const scrollbarTimer = useRef<ReturnType<typeof setTimeout>>()
  const [tapHint, setTapHint] = useState<'left' | 'right' | null>(null)
  const tapHintTimer = useRef<ReturnType<typeof setTimeout>>()

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (scrollbarTimer.current) clearTimeout(scrollbarTimer.current)
      if (tapHintTimer.current) clearTimeout(tapHintTimer.current)
    }
  }, [])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Fetch book data
  useEffect(() => {
    setLoading(true)
    setError(null)
    setBookData(null)
    setBookMeta(null)
    Promise.all([
      fetchBook(sid, bidx),
      fetchIndex().then((idx) => {
        const s = idx.series.find((x) => x.id === sid)
        return s?.books[bidx] || null
      }),
    ])
      .then(([data, meta]) => {
        setBookData(data)
        setBookMeta(meta)
        if (!meta) setError('该书不存在')
      })
      .catch((e) => {
        console.error(e)
        setError('加载失败，请检查网络后重试')
      })
      .finally(() => setLoading(false))
  }, [sid, bidx])

  // Set current chapter
  useEffect(() => {
    if (bookData && cidx >= 0 && cidx < bookData.chapters.length) {
      setChapter(bookData.chapters[cidx])
      // Scroll to top when chapter changes
      if (contentRef.current) {
        contentRef.current.scrollTop = 0
      }
      setScrollPct(0)
    }
  }, [bookData, cidx])

  // Save reading progress
  useEffect(() => {
    if (chapter && !loading) {
      saveProgress(sid, bidx, cidx, scrollPct)
    }
  }, [sid, bidx, cidx, scrollPct, chapter, loading, saveProgress])

  // Scroll tracking, dismiss controls, scrollbar visibility
  const handleScroll = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight <= clientHeight) {
      setScrollPct(1)
    } else {
      setScrollPct(Math.min(scrollTop / (scrollHeight - clientHeight), 1))
    }
    // Dismiss controls when scrolling
    if (showControls) setShowControls(false)
    // Show scrollbar briefly
    setShowScrollbar(true)
    if (scrollbarTimer.current) clearTimeout(scrollbarTimer.current)
    scrollbarTimer.current = setTimeout(() => setShowScrollbar(false), 1200)
  }, [showControls])

  // Toggle controls on center tap
  const handleContentClick = useCallback(
    (e: React.MouseEvent) => {
      const el = contentRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const w = rect.width
      const h = rect.height
      // Center zone: middle 40% horizontally, full height
      const cx = w * 0.3
      const cw = w * 0.4
      if (x > cx && x < cx + cw && y > 0 && y < h) {
        setShowControls((v) => !v)
      } else if (x <= cx && !showControls) {
        // Left tap: prev chapter with feedback
        setTapHint('left')
        if (tapHintTimer.current) clearTimeout(tapHintTimer.current)
        tapHintTimer.current = setTimeout(() => setTapHint(null), 300)
        goToChapter(cidx - 1)
      } else if (x >= cx + cw && !showControls) {
        // Right tap: next chapter with feedback
        setTapHint('right')
        if (tapHintTimer.current) clearTimeout(tapHintTimer.current)
        tapHintTimer.current = setTimeout(() => setTapHint(null), 300)
        goToChapter(cidx + 1)
      }
    },
    [cidx, bookData, showControls]
  )

  const goToChapter = (targetIdx: number) => {
    if (!bookData) return
    if (targetIdx < 0 || targetIdx >= bookData.chapters.length) return
    navigate(`/reader/${sid}/${bidx}/${targetIdx}`)
  }

  const cycleFontSize = () => {
    const sizes: FontSize[] = ['small', 'medium', 'large', 'xlarge']
    const idx = sizes.indexOf(fontSize)
    setFontSize(sizes[(idx + 1) % sizes.length])
  }

  if (loading) {
    return (
      <div className="reader-container">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="reader-container">
        <div className="empty-state">
          <div className="icon">!</div>
          <p>{error}</p>
          <button className="btn-back" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>
            返回
          </button>
        </div>
      </div>
    )
  }

  if (!chapter) {
    return (
      <div className="reader-container">
        <div className="empty-state">
          <div className="icon">[ ]</div>
          <p>章节不存在</p>
          <button className="btn-back" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>
            返回
          </button>
        </div>
      </div>
    )
  }

  if (!chapter.content || chapter.content.trim() === '') {
    return (
      <div className="reader-container">
        <div className="empty-state">
          <div className="icon">[ ]</div>
          <p>本章暂无内容</p>
          <button className="btn-back" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>
            返回
          </button>
        </div>
      </div>
    )
  }

  const hasPrev = cidx > 0
  const hasNext = bookData ? cidx < bookData.chapters.length - 1 : false
  const themeLabel: Record<Theme, string> = { light: '白', dark: '暗', sepia: '护' }
  const fontSizeLabel: Record<FontSize, string> = { small: '小', medium: '中', large: '大', xlarge: '特大' }

  // Format chapter content into paragraphs
  const paragraphs = chapter.content
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <div className="reader-container">
      <div
        className={`reader-overlay ${showControls ? 'visible' : ''}`}
        onClick={() => setShowControls(false)}
      >
        {/* Top bar */}
        <div className="reader-top-bar" onClick={(e) => e.stopPropagation()}>
          <button className="btn-back" onClick={() => navigate(`/book/${sid}/${bidx}`)}>
            ←
          </button>
          <span className="reader-book-title">
            {bookMeta?.title || chapter.title}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
            {cidx + 1}/{bookData?.chapters.length || 0}
          </span>
        </div>

        {/* Bottom bar */}
        <div className="reader-bottom-bar" onClick={(e) => e.stopPropagation()}>
          <div className="theme-group">
            {(['light', 'sepia', 'dark'] as Theme[]).map((t) => (
              <button
                key={t}
                className={`theme-btn ${theme === t ? 'active' : ''}`}
                onClick={() => setTheme(t)}
              >
                {themeLabel[t]}
              </button>
            ))}
          </div>
          <button className="reader-control-btn" onClick={cycleFontSize}>
            <span className="font-label">{fontSizeLabel[fontSize]}</span>
          </button>
          <Link
            to={`/book/${sid}/${bidx}`}
            className="reader-control-btn"
            style={{ textDecoration: 'none' }}
          >
            ☰
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="reader-progress" style={{ width: `${scrollPct * 100}%` }} />

      {/* Vertical scrollbar */}
      <div className={`reader-scrollbar ${showScrollbar ? 'visible' : ''}`}>
        <div
          className="reader-scrollbar-thumb"
          style={{ height: `${Math.max(scrollPct * 100, 2)}%` }}
        />
      </div>

      {/* Tap feedback hint */}
      {tapHint && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            [tapHint === 'left' ? 'left' : 'right']: 16,
            transform: 'translateY(-50%)',
            background: 'var(--accent)',
            color: 'var(--accent-text)',
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            zIndex: 5,
            pointerEvents: 'none',
            animation: 'tapPulse 0.3s ease-out',
          }}
        >
          {tapHint === 'left' ? '←' : '→'}
        </div>
      )}

      {/* Content */}
      <div
        ref={contentRef}
        className="reader-content"
        onScroll={handleScroll}
        onClick={handleContentClick}
      >
        <div className="reader-text" style={{ fontSize: getFontSizePx(fontSize) }}>
          <h2>{chapter.title}</h2>
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {/* Chapter navigation */}
        <div className="chapter-nav">
          {hasPrev ? (
            <Link
              to={`/reader/${sid}/${bidx}/${cidx - 1}`}
              className="chapter-nav-btn"
            >
              ← 上一章
            </Link>
          ) : (
            <span />
          )}
          {hasNext ? (
            <Link
              to={`/reader/${sid}/${bidx}/${cidx + 1}`}
              className="chapter-nav-btn"
            >
              下一章 →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  )
}
