import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

function Profile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null)
        return
      }

      setUser(currentUser)

      try {
        const userDoc = await getDoc(
          doc(db, 'users', currentUser.uid)
        )

        if (userDoc.exists()) {
          setProfile(userDoc.data())
        }
      } catch (error) {
        console.error('Profile error:', error)
      }
    })

    return () => unsubscribe()
  }, [])

  if (!user) {
    return (
      <div className="profile-page">
        <h2>Ba ka shiga account ba</h2>
        <Link to="/login">Login</Link>
      </div>
    )
  }

  const username = profile?.username || user.email?.split('@')[0] || 'User'
  const followers = profile?.followers ?? 0
  const following = profile?.following ?? 0
  const likes = profile?.likes ?? 0

  return (
    <div className="profile-page">

      <header className="profile-header">
        <Link to="/">← Gida</Link>
        <h2>Profile</h2>
        <span>⚙️</span>
      </header>

      <main className="profile-content">

        <div className="profile-avatar">
          👤
        </div>

        <h2>@{username}</h2>

        <p>{user.email}</p>

        <div className="profile-stats">

          <div>
            <strong>{followers}</strong>
            <span>Followers</span>
          </div>

          <div>
            <strong>{following}</strong>
            <span>Following</span>
          </div>

          <div>
            <strong>{likes}</strong>
            <span>Likes</span>
          </div>

        </div>

        <button className="edit-profile">
          ✏️ Edit Profile
        </button>

        <div className="profile-menu">

          <Link to="/post">
            ➕ Post Video
          </Link>

          <Link to="/wallet">
            💰 Wallet
          </Link>

          <Link to="/earnings">
            📊 Creator Earnings
          </Link>

        </div>

      </main>

      <nav className="bottom-nav">

        <Link to="/">
          🏠 Home
        </Link>

        <Link to="/profile">
          👤 Profile
        </Link>

      </nav>

    </div>
  )
}

export default Profile
