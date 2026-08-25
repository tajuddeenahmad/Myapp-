import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

function Profile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null)
        return
      }

      setUser(currentUser)

      const userRef = doc(db, 'users', currentUser.uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const data = userSnap.data()
        setProfile(data)
        setUsername(data.username || currentUser.email?.split('@')[0] || 'User')
        setBio(data.bio || '')
      } else {
        setUsername(currentUser.email?.split('@')[0] || 'User')
      }
    })

    return () => unsubscribe()
  }, [])

  async function saveProfile(e) {
    e.preventDefault()

    if (!user) return

    setSaving(true)
    setMessage('')

    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          email: user.email,
          username: username.trim() || 'User',
          bio: bio.trim(),
          followers: profile?.followers ?? 0,
          following: profile?.following ?? 0,
          likes: profile?.likes ?? 0,
        },
        { merge: true }
      )

      setProfile((old) => ({
        ...old,
        username: username.trim() || 'User',
        bio: bio.trim(),
      }))

      setEditing(false)
      setMessage('✅ An ajiye profile ɗinka!')
    } catch (error) {
      console.error(error)
      setMessage('❌ An samu matsala wajen ajiye profile.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="profile-page">
        <h2>Ba ka shiga account ba</h2>
        <Link to="/login">Login</Link>
      </div>
    )
  }

  const displayUsername =
    profile?.username || username || user.email?.split('@')[0] || 'User'

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

        <h2>@{displayUsername}</h2>

        <p>{user.email}</p>

        {profile?.bio && (
          <p>{profile.bio}</p>
        )}

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

        <button
          className="edit-profile"
          onClick={() => {
            setUsername(displayUsername)
            setBio(profile?.bio || '')
            setEditing(true)
          }}
        >
          ✏️ Edit Profile
        </button>

        {message && (
          <p>{message}</p>
        )}

        {editing && (
          <form onSubmit={saveProfile}>

            <h3>✏️ Edit Profile</h3>

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <textarea
              placeholder="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows="4"
            />

            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Profile'}
            </button>

            <button
              type="button"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>

          </form>
        )}

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
