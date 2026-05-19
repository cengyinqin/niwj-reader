import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchIndex, IndexData, SeriesMeta } from '../hooks/useBook'
import { useSettings } from '../store/settings'

export default function Home() {
  const [index, setIndex] = useState<IndexData | null>(null)
  const [loading, setLoading] = useState(true)
  const lastRead = useSettings((s) => s.lastRead)

  useEffect(() => {
    fetchIndex()
      .then(setIndex)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!index) {
    return (
      <div className="empty-state">
        <div className="icon">[ ]</div>
        <p>无法加载数据，请检查网络</p>
      </div>
    )
  }

  // Find continue reading info
  let continueInfo: { series: SeriesMeta; bookIdx: number; chapterIdx: number; chapterTitle: string } | null = null
  if (lastRead) {
    const series = index.series.find((s) => s.id === lastRead.seriesId)
    if (series) {
      const book = series.books[lastRead.bookIdx]
      if (book) {
        const chapter = book.chapters[lastRead.chapterIdx]
        if (chapter) {
          continueInfo = { series, bookIdx: lastRead.bookIdx, chapterIdx: lastRead.chapterIdx, chapterTitle: chapter.title }
        }
      }
    }
  }

  const seriesLabels: Record<number, string> = {
    1: '早期著作 · 1922–1934',
    2: '中期著作 · 1935–1942',
    3: '晚期著作 · 1943–1952',
  }

  return (
    <div className="app-shell">
      <div className="app-header">
        <h1>倪柝声文集</h1>
      </div>
      <div className="app-content">
        <div className="list-container">
          {continueInfo && (
            <Link
              to={`/reader/${continueInfo.series.id}/${continueInfo.bookIdx}/${continueInfo.chapterIdx}`}
              className="continue-card"
            >
              <div className="card-title">继续阅读</div>
              <div className="card-subtitle">
                {continueInfo.series.label} · {continueInfo.series.books[continueInfo.bookIdx]?.title}
              </div>
              <div className="card-meta">{continueInfo.chapterTitle}</div>
            </Link>
          )}

          <div className="section-title">文集系列</div>
          {index.series.map((series) => (
            <Link
              key={series.id}
              to={`/series/${series.id}`}
              className="series-hero"
            >
              <div className="series-hero-title">{series.label}</div>
              <div className="series-hero-desc">
                {seriesLabels[series.id] || ''}
              </div>
              <div className="series-hero-count">
                {series.books.length} 册 · {series.books.reduce((s, b) => s + b.chapterCount, 0)} 章
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
