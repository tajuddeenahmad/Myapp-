import { useEffect, useMemo, useRef, useState } from 'react'
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
  where,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../lib/firebase'

function Home() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const [likedPosts, setLikedPosts] = useState({})
  const [comments, setComments] = useState({})
  const [commentText, setCommentText] = useState({})
  const [openComments, setOpenComments] = useState({})

  const [following, setFollowing] = useState({})
  const [followingLoaded, setFollowingLoaded] = useState(false)

  const [activeTab, setActiveTab] = useState('forYou')

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')

  const [liveOpen, setLiveOpen] = useState(false)

  const videoRefs = useRef({})

  /*
   * ============================
   * LOAD POSTS
   * ============================
   */
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

  /*
   * ============================
   * LOAD CURRENT USER FOLLOWING
   * ============================
   */
  useEffect(() => {
    let unsubscribeFollowing = null

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (unsubscribeFollowing) {
          unsubscribeFollowing()
          unsubscribeFollowing = null
        }

        if (!user) {
          setFollowing({})
          setFollowingLoaded(true)
          return
        }

        setFollowingLoaded(false)

        const followsQuery = query(
          collection(db, 'follows'),
          where('userUid', '==', user.uid)
        )

        unsubscribeFollowing = onSnapshot(
          followsQuery,
          (snapshot) => {
            const followingMap = {}

            snapshot.docs.forEach((item) => {
              const data = item.data()

              if (data.ownerUid) {
                followingMap[data.ownerUid] = true
              }
            })

            setFollowing(followingMap)
            setFollowingLoaded(true)
          },
          (error) => {
            console.error(
              'Following error:',
              error
            )
            setFollowingLoaded(true)
          }
        )
      }
    )

    return () => {
      if (unsubscribeFollowing) {
        unsubscribeFollowing()
      }

      unsubscribeAuth()
    }
  }, [])

  /*
   * ============================
   * FOLLOW / UNFOLLOW
   * ============================
   */
  const handleFollow = async (ownerUid) => {
    const user = auth.currentUser

    if (!user) {
      alert('Da farko ka yi Login.')
      return
    }

    if (!ownerUid || ownerUid === user.uid) {
      return
    }

    try {
      const followId = `${user.uid}_${ownerUid}`
      const followRef = doc(db, 'follows', followId)

      const alreadyFollowing =
        following[ownerUid] === true

      if (alreadyFollowing) {
        await deleteDoc(followRef)

        setFollowing((prev) => {
          const next = { ...prev }
          delete next[ownerUid]
          return next
        })
      } else {
        await setDoc(followRef, {
          userUid: user.uid,
          ownerUid: ownerUid,
          createdAt: serverTimestamp(),
        })

        setFollowing((prev) => ({
          ...prev,
          [ownerUid]: true,
        }))
      }
    } catch (error) {
      console.error('Follow error:', error)
      alert(`❌ Follow error: ${error.message}`)
    }
  }

  /*
   * ============================
   * LIKE / UNLIKE
   * ============================
   */
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
                likes: increment(-1),
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
          postId,
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

  /*
   * ============================
   * VIEW
   * ============================
   */
  const handleView = async (postId) => {
    try {
      const postRef = doc(db, 'posts', postId)

      const postSnap = await getDoc(postRef)

      if (!postSnap.exists()) {
        return
      }

      const postData = postSnap.data()

      await updateDoc(postRef, {
        views: increment(1),
      })

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

  /*
   * ============================
   * VIDEO PLAY / PAUSE
   * ============================
   */
  const toggleVideo = (postId) => {
    const video = videoRefs.current[postId]

    if (!video) {
      return
    }

    if (video.paused) {
      video.play().catch((error) => {
        console.error(
          'Video play error:',
          error
        )
      })
    } else {
      video.pause()
    }
  }

  /*
   * ============================
   * AUTO PLAY WHEN VIDEO IS VISIBLE
   * ============================
   */
  useEffect(() => {
    if (!posts.length) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target

          if (entry.isIntersecting) {
            video.muted = true

            video
              .play()
              .catch(() => {})
          } else {
            video.pause()
          }
        })
      },
      {
        threshold: 0.65,
      }
    )

    Object.values(videoRefs.current).forEach(
      (video) => {
        if (video) {
          observer.observe(video)
        }
      }
    )

    return () => {
      observer.disconnect()
    }
  }, [posts, activeTab])

  /*
   * ============================
   * COMMENTS OPEN / CLOSE
   * ============================
   */
  const toggleComments = (postId) => {
    setOpenComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }))
  }

  /*
   * ============================
   * LOAD COMMENTS
   * ============================
   */
  useEffect(() => {
    const unsubscribers = []

    posts.forEach((post) => {
      const commentsQuery = query(
        collection(
          db,
          'posts',
          post.id,
          'comments'
        ),
        orderBy('createdAt', 'asc')
      )

      const unsubscribe = onSnapshot(
        commentsQuery,
        (snapshot) => {
          const commentList =
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }))

          setComments((prev) => ({
            ...prev,
            [post.id]: commentList,
          }))
        },
        (error) => {
          console.error(
            'Comments error:',
            error
          )
        }
      )

      unsubscribers.push(unsubscribe)
    })

    return () => {
      unsubscribers.forEach((unsubscribe) =>
        unsubscribe()
      )
    }
  }, [posts])

  /*
   * ============================
   * SEND COMMENT
   * ============================
   */
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
        collection(
          db,
          'posts',
          postId,
          'comments'
        ),
        {
          uid: user.uid,
          email: user.email || 'User',
          text,
          createdAt: serverTimestamp(),
        }
      )

      await updateDoc(
        doc(db, 'posts', postId),
        {
          comments: increment(1),
        }
      )

      setCommentText((prev) => ({
        ...prev,
        [postId]: '',
      }))
    } catch (error) {
      console.error(
        'COMMENT ERROR:',
        error
      )

      alert(
        `❌ Comment bai tafi ba: ${error.message}`
      )
    }
  }

  /*
   * ============================
   * HELPERS
   * ============================
   */
  const getOwnerUid = (post) => {
    return (
      post.uid ||
      post.ownerUid ||
      post.userId ||
      null
    )
  }

  const getUsername = (post) => {
    return (
      post.username ||
      post.email?.split('@')[0] ||
      'User'
    )
  }

  /*
   * ============================
   * SEARCH
   * ============================
   */
  const searchResults = useMemo(() => {
    const text = searchText
      .trim()
      .toLowerCase()

    if (!text) {
      return []
    }

    return posts.filter((post) => {
      const username =
        getUsername(post).toLowerCase()

      const caption =
        (post.caption || '').toLowerCase()

      return (
        username.includes(text) ||
        caption.includes(text)
      )
    })
  }, [posts, searchText])

  /*
   * ============================
   * FOR YOU / FOLLOWING
   * ============================
   */
  const displayedPosts = useMemo(() => {
    if (activeTab === 'following') {
      if (!followingLoaded) {
        return []
      }

      return posts.filter((post) => {
        const ownerUid = getOwnerUid(post)

        return (
          ownerUid &&
          following[ownerUid] === true
        )
      })
    }

    return posts
  }, [
    posts,
    activeTab,
    following,
    followingLoaded,
  ])

  /*
   * ============================
   * LOADING
   * ============================
   */
  if (loading) {
    return (
      <div className="video-feed">
        <h2>Loading videos...</h2>
      </div>
    )
  }

  /*
   * ============================
   * SEARCH SCREEN
   * ============================
   */
  if (searchOpen) {
    return (
      <div
        className="video-feed"
        style={{
          minHeight: '100vh',
          paddingBottom: '90px',
        }}
      >
        <header
          className="profile-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false)
              setSearchText('')
            }}
            style={{
              fontSize: '22px',
              border: 'none',
              background: 'transparent',
            }}
          >
            ←
          </button>

          <input
            autoFocus
            type="search"
            placeholder="Search TajVid..."
            value={searchText}
            onChange={(e) =>
              setSearchText(e.target.value)
            }
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '22px',
              border: '1px solid #ddd',
              outline: 'none',
            }}
          />
        </header>

        {searchText.trim() === '' ? (
          <div
            style={{
              textAlign: 'center',
              marginTop: '50px',
            }}
          >
            <h3>🔍 Search TajVid</h3>
            <p>
              Search for creators or videos
            </p>
          </div>
        ) : searchResults.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              marginTop: '50px',
            }}
          >
            <h3>No results</h3>
            <p>
              Ba a sami abin da kake nema ba.
            </p>
          </div>
        ) : (
          searchResults.map((post) => (
            <div
              className="video-card"
              key={post.id}
            >
              <h3>
                @{getUsername(post)}
              </h3>

              <p>
                {post.caption ||
                  'Babu caption'}
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false)
                  setSearchText('')
                  setActiveTab('forYou')
                }}
              >
                ▶️ Watch
              </button>
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

  /*
   * ============================
   * MAIN HOME
   * ============================
   */
  return (
    <div
      className="video-feed"
      style={{
        minHeight: '100vh',
        paddingBottom: '90px',
      }}
    >
      {/* HEADER */}
      <header
        className="profile-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <h2 style={{ margin: 0 }}>
          🎬 TajVid
        </h2>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '22px',
              cursor: 'pointer',
            }}
            aria-label="Search"
          >
            🔍
          </button>

          <button
            type="button"
            onClick={() => setLiveOpen(true)}
            style={{
              border: 'none',
              background: 'transparent',
              fontWeight: '700',
              color: '#e60000',
              cursor: 'pointer',
            }}
          >
            🔴 LIVE
          </button>

          <Link to="/profile">
            👤
          </Link>
        </div>
      </header>

      {/* FOR YOU / FOLLOWING */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '35px',
          padding: '15px 10px',
          borderBottom: '1px solid #ddd',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#fff',
        }}
      >
        <button
          type="button"
          onClick={() =>
            setActiveTab('forYou')
          }
          style={{
            border: 'none',
            background: 'transparent',
            fontWeight:
              activeTab === 'forYou'
                ? '800'
                : '500',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          For You
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab('following')
          }
          style={{
            border: 'none',
            background: 'transparent',
            fontWeight:
              activeTab === 'following'
                ? '800'
                : '500',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          Following
        </button>
      </div>

      {/* LIVE */}
      {liveOpen && (
        <div
          style={{
            margin: '12px',
            padding: '20px',
            borderRadius: '14px',
            background: '#fff',
            border: '1px solid #ddd',
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => setLiveOpen(false)}
            style={{
              float: 'right',
              border: 'none',
              background: 'transparent',
              fontSize: '20px',
            }}
          >
            ✕
          </button>

          <h2>🔴 TajVid LIVE</h2>

          <p>
            Live streaming zai kasance a nan.
          </p>

          <button
            type="button"
            onClick={() =>
              alert(
                '🔴 Live feature zai kasance nan gaba.'
              )
            }
          >
            Go LIVE
          </button>
        </div>
      )}

      {/* FOLLOWING EMPTY */}
      {activeTab === 'following' &&
        followingLoaded &&
        displayedPosts.length === 0 && (
          <div
            className="video-card"
            style={{
              textAlign: 'center',
              marginTop: '20px',
            }}
          >
            <h2>Babu videos tukuna</h2>

            <p>
              Ka fara follow creators domin
              ganin videos ɗinsu a Following.
            </p>

            <button
              type="button"
              onClick={() =>
                setActiveTab('forYou')
              }
            >
              Browse For You
            </button>
          </div>
        )}

      {/* POSTS */}
      {displayedPosts.map((post) => {
        const ownerUid = getOwnerUid(post)
        const username = getUsername(post)

        const isOwner =
          auth.currentUser?.uid === ownerUid

        const isFollowing =
          ownerUid &&
          following[ownerUid] === true

        return (
          <div
            className="video-card"
            key={post.id}
          >
            {/* TIKTOK STYLE VIDEO */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                overflow: 'hidden',
                background: '#000',
                borderRadius: '10px',
              }}
            >
              <video
                ref={(element) => {
                  if (element) {
                    videoRefs.current[
                      post.id
                    ] = element
                  }
                }}
                className="real-video"
                src={
                  post.videoUrl ||
                  '/videos/video1.mp4'
                }
                autoPlay
                muted
                playsInline
                preload="metadata"
                controls={false}
                onClick={() =>
                  toggleVideo(post.id)
                }
                onPlay={() =>
                  handleView(post.id)
                }
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  background: '#000',
                  cursor: 'pointer',
                }}
              />
            </div>

            <div className="video-info">
              {/* CREATOR */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#ddd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  👤

                  {/* FOLLOW + */}
                  {!isOwner &&
                    ownerUid &&
                    !isFollowing && (
                      <button
                        type="button"
                        onClick={() =>
                          handleFollow(
                            ownerUid
                          )
                        }
                        style={{
                          position: 'absolute',
                          bottom: '-5px',
                          right: '-5px',
                          width: '21px',
                          height: '21px',
                          borderRadius: '50%',
                          border: '2px solid #fff',
                          background: '#ff1744',
                          color: '#fff',
                          fontSize: '15px',
                          fontWeight: '900',
                          lineHeight: '15px',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                        aria-label="Follow"
                      >
                        +
                      </button>
                    )}
                </div>

                <h3 style={{ margin: 0 }}>
                  @{username}
                </h3>
              </div>

              {/* CAPTION */}
              <p>
                {post.caption ||
                  'Babu caption'}
              </p>

              {/* STATS */}
              <small>
                ❤️ {post.likes || 0} Likes
                {' • '}
                👁️ {post.views || 0} Views
                {' • '}
                💬 {post.comments || 0}{' '}
                Comments
              </small>

              {/* ACTIONS */}
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

              {/* COMMENTS */}
              {openComments[post.id] && (
                <div
                  className="comments-section"
                  style={{
                    marginTop: '15px',
                  }}
                >
                  <h4>💬 Comments</h4>

                  <div className="comment-list">
                    {(
                      comments[post.id] || []
                    ).map((comment) => (
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
                          @
                          {comment.email
                            ?.split('@')[0] ||
                            'User'}
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
                        commentText[
                          post.id
                        ] || ''
                      }
                      onChange={(e) =>
                        setCommentText(
                          (prev) => ({
                            ...prev,
                            [post.id]:
                              e.target.value,
                          })
                        )
                      }
                      style={{
                        flex: 1,
                        padding: '10px',
                      }}
                    />

                    <button
                      onClick={() =>
                        handleComment(
                          post.id
                        )
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
        )
      })}

      {/* POST BUTTON */}
      <div
        style={{
          position: 'fixed',
          right: '20px',
          bottom: '75px',
          zIndex: 20,
        }}
      >
        <Link
          to="/post"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '55px',
            height: '55px',
            borderRadius: '50%',
            background: '#000',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '25px',
          }}
        >
          +
        </Link>
      </div>

      {/* BOTTOM NAV */}
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
