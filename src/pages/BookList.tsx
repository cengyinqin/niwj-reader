import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { fetchIndex, SeriesMeta, BookMeta } from '../hooks/useBook'

export default function BookList() {
  const { seriesId } = useParams<{ seriesId: string }>()
  const navigate = useNavigate()
  const [series, setSeries] = useState<SeriesMeta | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sid = parseInt(seriesId || '1', 10)
    fetchIndex()
      .then((index) => {
        const s = index.series.find((x) => x.id === sid)
        if (s) setSeries(s)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [seriesId])

  if (loading) return <div className="loading">加载中...</div>
  if (!series) {
    return (
      <div className="empty-state">
        <p>未找到该系列</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-header">
        <button className="btn-back" onClick={() => navigate('/')} aria-label="返回">
          ←
        </button>
        <h1>{series.label}</h1>
      </div>
      <div className="app-content">
        <div className="list-container">
          <div className="section-title">
            {series.books.length} 册
          </div>
          {series.books.map((book: BookMeta, bi: number) => (
            <Link
              key={bi}
              to={`/book/${series.id}/${bi}`}
              className="card"
            >
              <div className="card-title">{book.title}</div>
              <div className="card-meta">{book.chapterCount} 章</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
