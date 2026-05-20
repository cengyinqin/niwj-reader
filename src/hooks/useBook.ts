export interface ChapterMeta {
  title: string
  url: string
}

export interface BookMeta {
  title: string
  file: string
  chapterCount: number
  chapters: ChapterMeta[]
}

export interface SeriesMeta {
  id: number
  label: string
  title: string
  books: BookMeta[]
}

export interface IndexData {
  title: string
  source: string
  series: SeriesMeta[]
}

export interface ChapterData {
  title: string
  content: string
  url: string
}

export interface BookData {
  title: string
  url: string
  chapters: ChapterData[]
}

let indexCache: IndexData | null = null

export async function fetchIndex(): Promise<IndexData> {
  if (indexCache) return indexCache
  const resp = await fetch('/data/index.json')
  if (!resp.ok) throw new Error(`Failed to fetch index: ${resp.status}`)
  indexCache = await resp.json()
  return indexCache!
}

// In-memory cache for book content
const bookCache = new Map<string, BookData>()

export async function fetchBook(seriesId: number, bookIdx: number): Promise<BookData> {
  const index = await fetchIndex()
  const series = index.series.find((s) => s.id === seriesId)
  if (!series) throw new Error(`Series ${seriesId} not found`)
  const book = series.books[bookIdx]
  if (!book) throw new Error(`Book ${bookIdx} not found in series ${seriesId}`)

  const cacheKey = `${seriesId}-${bookIdx}`
  if (bookCache.has(cacheKey)) return bookCache.get(cacheKey)!

  const resp = await fetch(`/data/books/${book.file}`)
  if (!resp.ok) throw new Error(`Failed to fetch book: ${resp.status}`)
  const data: BookData = await resp.json()
  bookCache.set(cacheKey, data)
  return data
}

