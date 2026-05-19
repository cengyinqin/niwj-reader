import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import BookList from './pages/BookList'
import ChapterList from './pages/ChapterList'
import Reader from './pages/Reader'
import './styles/app.css'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/series/:seriesId" element={<BookList />} />
        <Route path="/book/:seriesId/:bookIdx" element={<ChapterList />} />
        <Route path="/reader/:seriesId/:bookIdx/:chapterIdx" element={<Reader />} />
      </Routes>
    </HashRouter>
  )
}
