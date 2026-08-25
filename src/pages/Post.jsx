import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const CLOUD_NAME = 'kpbkojvd'
const UPLOAD_PRESET = 'myapp_videos'

function Post() {
  const [user, setUser] = useState(null)
  const [video, setVideo] = useState(null)
  const [caption, setCaption] = useState('')
  const [posting, setPosting] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    return onAuthStateChanged(auth, setUser)
  }, [])

  function handleVideoChange(e) {
    const file = e.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('video/')) {
      setMessage('❌ Don Allah zaɓi video kawai.')
      return
    }

    setVideo(file)
    setMessage('')
  }

  async function handlePost(e) {
    e.preventDefault()

    if (!user) {
      setMessage('❌ Da farko ka yi Login.')
      return
    }

    if (!video) {
      setMessage('❌ Zaɓi video tukuna.')
      return
    }

    setPosting(true)
    setMessage('⏳ Ana upload video...')

    try {
      const formData = new FormData()
      formData.append('file', video)
      formData.append('upload_preset', UPLOAD_PRESET)

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const uploadData = await uploadResponse.json()

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error?.message || 'Cloudinary upload failed')
      }

      setMessage('⏳ Ana ajiye post...')

      await addDoc(collection(db, 'posts'), {
        uid: user.uid,
        email: user.email,
        caption: caption.trim(),
        videoName: video.name,
        videoUrl: uploadData.secure_url,
        likes: 0,
        comments: 0,
        views: 0,
        createdAt: serverTimestamp(),
      })

      setMessage('✅ An wallafa video ɗinka!')

      setVideo(null)
      setCaption('')

      setTimeout(() => {
        navigate('/')
      }, 1200)

    } catch (error) {
      console.error(error)
      setMessage(`❌ ${error.message}`)
    } finally {
      setPosting(false)
    }
  }

  if (!user) {
    return (
      <div className="post-page">
        <h2>Ka fara Login</h2>
        <Link to="/login">Login</Link>
      </div>
    )
  }

  return (
    <div className="post-page">

      <header className="profile-header">
        <Link to="/profile">← Profile</Link>
        <h2>Post Video</h2>
        <span>🎬</span>
      </header>

      <main className="profile-content">

        <h2>➕ Ƙara Video</h2>

        <label htmlFor="video-upload">
          <div className="upload-box">
            🎥
            <p>Zaɓi video daga wayarka</p>
          </div>
        </label>

        <input
          id="video-upload"
          type="file"
          accept="video/*"
          onChange={handleVideoChange}
          style={{ display: 'none' }}
        />

        {video && (
          <div>
            <h3>Preview</h3>

            <video
              src={URL.createObjectURL(video)}
              controls
              playsInline
              style={{
                width: '100%',
                maxWidth: '500px',
                borderRadius: '12px',
              }}
            />

            <p>📁 {video.name}</p>
          </div>
        )}

        <form onSubmit={handlePost}>

          <textarea
            placeholder="Rubuta caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows="4"
          />

          <button type="submit" disabled={!video || posting}>
            {posting ? 'Ana upload...' : '🚀 Post Video'}
          </button>

        </form>

        {message && <p>{message}</p>}

      </main>

      <nav className="bottom-nav">
        <Link to="/">🏠 Home</Link>
        <Link to="/profile">👤 Profile</Link>
      </nav>

    </div>
  )
}

export default Post
