import { useEffect } from 'react'
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import BookList from './pages/BookList'
import ChapterList from './pages/ChapterList'
import Reader from './pages/Reader'
import Search from './pages/Search'
import Profile from './pages/Profile'
import { useSettings } from './store/settings'
import './styles/app.css'

// ── Global theme sync ──────────────────────────────────
function ThemeSync() {
  const theme = useSettings((s) => s.theme)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  return null
}

// Tab bar: hide on Reader page
function TabBar() {
  const location = useLocation()
  if (location.pathname.startsWith('/reader')) return null

  return (
    <nav className="tab-bar">
      <NavLink to="/" end className="tab-item">
        <span className="tab-icon">📚</span>
        <span className="tab-label">文集</span>
      </NavLink>
      <NavLink to="/search" className="tab-item">
        <span className="tab-icon">🔍</span>
        <span className="tab-label">搜索</span>
      </NavLink>
      <NavLink to="/profile" className="tab-item">
        <span className="tab-icon">👤</span>
        <span className="tab-label">我的</span>
      </NavLink>
    </nav>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ThemeSync />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/series/:seriesId" element={<BookList />} />
        <Route path="/book/:seriesId/:bookIdx" element={<ChapterList />} />
        <Route path="/reader/:seriesId/:bookIdx/:chapterIdx" element={<Reader />} />
        <Route path="/search" element={<Search />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <TabBar />
    </HashRouter>
  )
}
