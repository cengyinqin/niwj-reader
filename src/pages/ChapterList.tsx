import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { fetchIndex, BookMeta, SeriesMeta } from '../hooks/useBook'
import { useSettings } from '../store/settings'
import { IconArrowLeft } from "../components/Icons"

export default function ChapterList() {
  const { seriesId, bookIdx } = useParams<{ seriesId: string; bookIdx: string }>()
  const navigate = useNavigate()
  const [series, setSeries] = useState<SeriesMeta | null>(null)
  const [book, setBook] = useState<BookMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const savedProgress = useSettings((s) => {
    if (seriesId && bookIdx) return s.getProgress(parseInt(seriesId, 10), parseInt(bookIdx, 10))
    return null
  })

  useEffect(() => {
    const sid = parseInt(seriesId || '1', 10)
    const bidx = parseInt(bookIdx || '0', 10)
    fetchIndex()
      .then((index) => {
        const s = index.series.find((x) => x.id === sid)
        if (s) {
          setSeries(s)
          if (s.books[bidx]) setBook(s.books[bidx])
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [seriesId, bookIdx])

  if (loading) return <div className="loading">加载中...</div>
  if (!book || !series) {
    return (
      <div className="empty-state">
        <p>未找到该书</p>
      </div>
    )
  }

  const sid = parseInt(seriesId || '1', 10)
  const bidx = parseInt(bookIdx || '0', 10)

  return (
    <div className="app-shell">
      <div className="app-header">
        <button className="btn-back" onClick={() => navigate(`/series/${sid}`)} aria-label="返回">
          <IconArrowLeft size={18} />
        </button>
        <h1>{book.title}</h1>
      </div>
      <div className="app-content">
        <div className="list-container" style={{ padding: 0 }}>
          <div className="section-title" style={{ padding: '0 16px', marginTop: 12 }}>
            {book.chapterCount} 章
          </div>
          {book.chapters.map((ch, ci) => (
            <Link
              key={ci}
              to={`/reader/${sid}/${bidx}/${ci}`}
              className="chapter-item"
            >
              <span className="chapter-num">
                {savedProgress?.chapterIdx === ci && (
                  <span style={{ color: 'var(--accent)' }}>●</span>
                )}
                {savedProgress?.chapterIdx !== ci && ci + 1}
              </span>
              <span className="chapter-title">{ch.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
