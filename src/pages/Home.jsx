import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  increment,
  getDoc,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

function Home() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState({})
  const [comments, setComments] = useState({})
  const [commentText, setCommentText] = useState({})
  const [openComments, setOpenComments] = useState({})

  // LOAD VIDEOS
  useEffect(() => {
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const postList = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))

        setPosts(postList)
        setLoading(false)
      },
      (error) => {
        console.error('Posts error:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  // LIKE / UNLIKE
  const handleLike = async (postId) => {
    const user = auth.currentUser

    if (!user) {
      alert('Da farko ka yi Login.')
      return
    }

    try {
      const likeId = `${postId}_${user.uid}`
      const likeRef = doc(db, 'likes', likeId)
      const postRef = doc(db, 'posts', postId)

      const likeSnapshot = await getDoc(likeRef)

      if (likeSnapshot.exists()) {
        await deleteDoc(likeRef)

        await updateDoc(postRef, {
          likes: increment(-1),
        })
const postSnap = await getDoc(postRef)

if (postSnap.exists()) {
  const postData = postSnap.data()

  if (postData.uid) {
    const creatorRef = doc(
      db,
      'users',
      postData.uid
    )

    await setDoc(
      creatorRef,
      {
        likes: increment(1),
      },
      { merge: true }
    )
  }
}
        setLikedPosts((prev) => ({
          ...prev,
          [postId]: false,
        }))
      } else {
        await setDoc(likeRef, {
          postId: postId,
          uid: user.uid,
          createdAt: serverTimestamp(),
        })

        await updateDoc(postRef, {
          likes: increment(1),
        })
const postSnap = await getDoc(postRef)

if (postSnap.exists()) {
  const postData = postSnap.data()

  if (postData.uid) {
    const creatorRef = doc(
      db,
      'users',
      postData.uid
    )

    await setDoc(
      creatorRef,
      {
        likes: increment(1),
      },
      { merge: true }
    )
  }
}
        setLikedPosts((prev) => ({
          ...prev,
          [postId]: true,
        }))
      }
    } catch (error) {
      console.error('Like error:', error)
      alert(`❌ Like error: ${error.message}`)
    }
  }

  // VIEW
  const handleView = async (postId) => {
  try {
    const postRef = doc(db, 'posts', postId)

    const postSnap = await getDoc(postRef)

    if (!postSnap.exists()) {
      return
    }

    const postData = postSnap.data()

    // Increase post views
    await updateDoc(postRef, {
      views: increment(1),
    })

    // Increase creator total views
    if (postData.uid) {
      const creatorRef = doc(
        db,
        'users',
        postData.uid
      )

      await setDoc(
        creatorRef,
        {
          totalViews: increment(1),
        },
        { merge: true }
      )
    }
  } catch (error) {
    console.error('View error:', error)
  }
}

  // OPEN / CLOSE COMMENTS
  const toggleComments = (postId) => {
    setOpenComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }))
  }

  // LOAD COMMENTS
  useEffect(() => {
    const unsubscribers = []

    posts.forEach((post) => {
      const commentsQuery = query(
        collection(db, 'posts', post.id, 'comments'),
        orderBy('createdAt', 'asc')
      )

      const unsubscribe = onSnapshot(
        commentsQuery,
        (snapshot) => {
          const commentList = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))

          setComments((prev) => ({
            ...prev,
            [post.id]: commentList,
          }))
        },
        (error) => {
          console.error('Comments error:', error)
        }
      )

      unsubscribers.push(unsubscribe)
    })

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [posts])

  // SEND COMMENT
  const handleComment = async (postId) => {
    const user = auth.currentUser
    const text = commentText[postId]?.trim()

    if (!user) {
      alert('Da farko ka yi Login.')
      return
    }

    if (!text) {
      alert('Rubuta comment tukuna.')
      return
    }

    try {
      await addDoc(
        collection(db, 'posts', postId, 'comments'),
        {
          uid: user.uid,
          email: user.email || 'User',
          text: text,
          createdAt: serverTimestamp(),
        }
      )

      await updateDoc(doc(db, 'posts', postId), {
        comments: increment(1),
      })

      setCommentText((prev) => ({
        ...prev,
        [postId]: '',
      }))

      alert('✅ An tura comment!')
    } catch (error) {
      console.error('COMMENT ERROR:', error)

      alert(
        `❌ Comment bai tafi ba: ${error.message}`
      )
    }
  }

  if (loading) {
    return (
      <div className="video-feed">
        <h2>Loading videos...</h2>
      </div>
    )
  }

  return (
    <div className="video-feed">

      <header className="profile-header">
        <h2>🎬 TajVid</h2>

        <Link to="/profile">
          👤 Profile
        </Link>
      </header>

      {posts.length === 0 ? (
        <div className="video-card">
          <h2>Babu post tukuna</h2>

          <Link to="/post">
            ➕ Post Video
          </Link>
        </div>
      ) : (
        posts.map((post) => (
          <div className="video-card" key={post.id}>

            <video
              className="real-video"
              src={
                post.videoUrl ||
                '/videos/video1.mp4'
              }
              controls
              playsInline
              onPlay={() =>
                handleView(post.id)
              }
            />

            <div className="video-info">

              <h3>
                @{post.email?.split('@')[0] || 'User'}
              </h3>

              <p>
                {post.caption || 'Babu caption'}
              </p>

              <small>
                ❤️ {post.likes || 0} Likes
                {' • '}
                👁️ {post.views || 0} Views
                {' • '}
                💬 {post.comments || 0} Comments
              </small>

              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >

                <button
                  onClick={() =>
                    handleLike(post.id)
                  }
                  type="button"
                >
                  {likedPosts[post.id]
                    ? '💔 Unlike'
                    : '❤️ Like'}
                </button>

                <button
                  onClick={() =>
                    toggleComments(post.id)
                  }
                  type="button"
                >
                  💬 Comments
                </button>

              </div>

              {openComments[post.id] && (
                <div
                  className="comments-section"
                  style={{
                    marginTop: '15px',
                  }}
                >

                  <h4>💬 Comments</h4>

                  <div className="comment-list">

                    {(comments[post.id] || [])
                      .map((comment) => (
                        <div
                          className="comment"
                          key={comment.id}
                          style={{
                            padding: '8px',
                            marginBottom: '8px',
                            borderRadius: '8px',
                            background:
                              '#f1f1f1',
                          }}
                        >

                          <strong>
                            @{
                              comment.email
                                ?.split('@')[0] ||
                              'User'
                            }
                          </strong>

                          <p>
                            {comment.text}
                          </p>

                        </div>
                      ))}

                  </div>

                  <div
                    className="comment-form"
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '10px',
                    }}
                  >

                    <input
                      type="text"
                      placeholder="Rubuta comment..."
                      value={
                        commentText[post.id] || ''
                      }
                      onChange={(e) =>
                        setCommentText((prev) => ({
                          ...prev,
                          [post.id]:
                            e.target.value,
                        }))
                      }
                      style={{
                        flex: 1,
                        padding: '10px',
                      }}
                    />

                    <button
                      onClick={() =>
                        handleComment(post.id)
                      }
                      type="button"
                    >
                      Send
                    </button>

                  </div>

                </div>
              )}

            </div>

          </div>
        ))
      )}

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

export default Home
