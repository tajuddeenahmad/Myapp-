import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './App.css'

import { initNotifications } from './lib/notifications'

import Admin from './pages/Admin'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import Post from './pages/Post'
import Profile from './pages/Profile'
import Wallet from './pages/Wallet'
import Earnings from './pages/Earnings'
import Withdraw from './pages/Withdraw'
import Search from './pages/Search'
import Settings from './pages/Settings'

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('tajvid_dark_mode')

    return saved !== null
      ? saved === 'true'
      : true
  })

  useEffect(() => {
    initNotifications()
  }, [])

  useEffect(() => {
    localStorage.setItem(
      'tajvid_dark_mode',
      darkMode
    )

    document.body.classList.toggle(
      'light-mode',
      !darkMode
    )
  }, [darkMode])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/jobs"
          element={<Jobs />}
        />

        <Route
          path="/post"
          element={<Post />}
        />

    <Route path="/profile" element={<Profile />} />
<Route path="/profile/:uid" element={<Profile />} />

        <Route
          path="/wallet"
          element={<Wallet />}
        />

        <Route
          path="/earnings"
          element={<Earnings />}
        />

        <Route
          path="/withdraw"
          element={<Withdraw />}
        />

        <Route
          path="/search"
          element={<Search />}
        />

        <Route
          path="/settings"
          element={
            <Settings
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          }
        />

        <Route
          path="/admin"
          element={<Admin />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
