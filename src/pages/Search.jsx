import { useEffect, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../lib/firebase'

function Search() {
  const navigate = useNavigate()

  const [currentUser, setCurrentUser] = useState(null)
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('Top')
  const [followingIds, setFollowingIds] = useState([])
  const [followLoading, setFollowLoading] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)

      if (!user) {
        setFollowingIds([])
        return
      }

      try {
        const followsQuery = query(
          collection(db, 'follows'),
          where('followerUid', '==', user.uid)
        )

        const snapshot = await getDocs(followsQuery)

        setFollowingIds(
          snapshot.docs
            .map((item) => item.data().followingUid)
            .filter(Boolean)
        )
      } catch (error) {
        console.error('Loading following error:', error)
      }
    })

    return () => unsubscribe()
  }, [])

  const handleSearch = async (value = search) => {
    const text = value.trim().toLowerCase()

    if (!text) {
      setUsers([])
      setPosts([])
      return
    }

    setLoading(true)

    try {
      const [usersSnapshot, postsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'posts')),
      ])

      const userResults = usersSnapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .filter((user) => {
          const username = String(
            user.username || ''
          ).toLowerCase()

          const displayName = String(
            user.displayName || user.name || ''
          ).toLowerCase()

          return (
            username.includes(text) ||
            displayName.includes(text)
          )
        })

      const postResults = postsSnapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .filter((post) => {
          const caption = String(
            post.caption || ''
          ).toLowerCase()

          const username = String(
            post.username ||
            post.userName ||
            ''
          ).toLowerCase()

          return (
            caption.includes(text) ||
            username.includes(text)
          )
        })

      setUsers(userResults)
      setPosts(postResults)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(search)
    }, 350)

    return () => clearTimeout(timer)
  }, [search])

  function getUserName(user) {
    return (
      user.username ||
      user.displayName ||
      user.name ||
      'User'
    )
  }

  function getDisplayName(user) {
    return (
      user.displayName ||
      user.name ||
      user.username ||
      'User'
    )
  }

  function getAvatar(user) {
    return (
      user.photoURL ||
      user.avatar ||
      user.profileImage ||
      user.image ||
      ''
    )
  }

  function getVideo(post) {
    return (
      post.videoUrl ||
      post.videoURL ||
      post.video ||
      post.url ||
      ''
    )
  }

  function getThumbnail(post) {
    return (
      post.thumbnailUrl ||
      post.thumbnail ||
      post.coverUrl ||
      post.cover ||
      ''
    )
  }

  function getPostUsername(post) {
    return (
      post.username ||
      post.userName ||
      'User'
    )
  }

  function formatNumber(number) {
    const value = Number(number || 0)

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }

    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }

    return value
  }

  async function handleFollow(userId) {
    if (!currentUser) {
      alert('Please login first to follow users.')
      navigate('/login')
      return
    }

    if (currentUser.uid === userId) {
      return
    }

    const isFollowing = followingIds.includes(userId)

    setFollowLoading(userId)

    try {
      const followId = `${currentUser.uid}_${userId}`

      const followRef = doc(db, 'follows', followId)

      const currentUserRef = doc(
        db,
        'users',
        currentUser.uid
      )

      const targetUserRef = doc(
        db,
        'users',
        userId
      )

      const targetUser = users.find(
        (user) => user.id === userId
      )

      const currentFollowing = Number(
        currentUser.following || 0
      )

      const targetFollowers = Number(
        targetUser?.followers || 0
      )

      if (isFollowing) {
        await deleteDoc(followRef)

        await updateDoc(currentUserRef, {
          following: Math.max(0, currentFollowing - 1),
        })

        await updateDoc(targetUserRef, {
          followers: Math.max(0, targetFollowers - 1),
        })

        setFollowingIds((previous) =>
          previous.filter((id) => id !== userId)
        )
      } else {
        await setDoc(followRef, {
          followerUid: currentUser.uid,
          followingUid: userId,
          createdAt: new Date(),
        })

        await updateDoc(currentUserRef, {
          following: currentFollowing + 1,
        })

        await updateDoc(targetUserRef, {
          followers: targetFollowers + 1,
        })

        setFollowingIds((previous) => [
          ...previous,
          userId,
        ])
      }
    } catch (error) {
      console.error('Follow error:', error)
      alert('Unable to update follow. Please try again.')
    } finally {
      setFollowLoading('')
    }
  }

  return (
    <div className="search-page">

      <div className="search-scroll">

        <div className="search-container">

          {/* SEARCH HEADER */}
          <div className="search-header">

            <div className="search-top">

              <button
                className="back-button"
                onClick={() => navigate(-1)}
                aria-label="Go back"
              >
                🔙
              </button>

              <div className="search-box">

                <span className="search-icon">
                  🔍
                </span>

                <input
                  type="search"
                  placeholder="Search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />

                {search && (
                  <button
                    className="clear-button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}

              </div>

            </div>

          </div>

          {/* EMPTY SEARCH */}
          {!search.trim() && (
            <div className="discover">

              <h2>Discover</h2>

              <div className="discover-grid">

                <div className="discover-card">
                  <span>🔥</span>
                  <strong>Trending</strong>
                  <small>Popular videos</small>
                </div>

                <div className="discover-card">
                  <span>👥</span>
                  <strong>Creators</strong>
                  <small>Find people</small>
                </div>

                <div className="discover-card">
                  <span>🎬</span>
                  <strong>Videos</strong>
                  <small>Watch content</small>
                </div>

                <div className="discover-card">
                  <span>✨</span>
                  <strong>For You</strong>
                  <small>Discover more</small>
                </div>

              </div>

            </div>
          )}

          {/* SEARCHING */}
          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <span>Searching...</span>
            </div>
          )}

          {/* RESULTS */}
          {!loading && search.trim() && (
            <>

              {/* TABS */}
              <div className="tabs">

                <button
                  className={
                    activeTab === 'Top'
                      ? 'active'
                      : ''
                  }
                  onClick={() => setActiveTab('Top')}
                >
                  Top
                </button>

                <button
                  className={
                    activeTab === 'Users'
                      ? 'active'
                      : ''
                  }
                  onClick={() => setActiveTab('Users')}
                >
                  Users
                </button>

                <button
                  className={
                    activeTab === 'Videos'
                      ? 'active'
                      : ''
                  }
                  onClick={() => setActiveTab('Videos')}
                >
                  Videos
                </button>

              </div>

              {/* USERS */}
              {(activeTab === 'Top' ||
                activeTab === 'Users') && (
                <section className="result-section">

                  <div className="section-title">
                    <h3>Users</h3>

                    {users.length > 0 && (
                      <span>
                        {users.length} results
                      </span>
                    )}
                  </div>

                  {users.length === 0 ? (
                    <div className="empty-result">
                      <div>👤</div>
                      <p>No users found</p>
                    </div>
                  ) : (
                    <div className="users-list">

                      {users.map((user) => {
                        const avatar = getAvatar(user)
                        const isFollowing =
                          followingIds.includes(user.id)

                        return (
                          <div
                            className="user-card"
                            key={user.id}
                            onClick={() =>
                              navigate(`/profile/${user.id}`)
                            }
                          >

                            <div className="avatar">

                              {avatar ? (
                                <img
                                  src={avatar}
                                  alt=""
                                />
                              ) : (
                                <span>
                                  {getUserName(user)
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              )}

                            </div>

                            <div className="user-info">

                              <strong>
                                {getDisplayName(user)}
                              </strong>

                              <span>
                                @{getUserName(user)}
                              </span>

                              <small>
                                {formatNumber(
                                  user.followers || 0
                                )}{' '}
                                followers
                              </small>

                            </div>

                            {currentUser?.uid !== user.id && (
                              <button
                                className={
                                  isFollowing
                                    ? 'follow-button following'
                                    : 'follow-button'
                                }
                                disabled={
                                  followLoading === user.id
                                }
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleFollow(user.id)
                                }}
                              >
                                {followLoading === user.id
                                  ? '...'
                                  : isFollowing
                                    ? 'Following'
                                    : 'Follow'}
                              </button>
                            )}

                          </div>
                        )
                      })}

                    </div>
                  )}

                </section>
              )}

              {/* VIDEOS */}
              {(activeTab === 'Top' ||
                activeTab === 'Videos') && (
                <section className="result-section">

                  <div className="section-title">
                    <h3>Videos</h3>

                    {posts.length > 0 && (
                      <span>
                        {posts.length} results
                      </span>
                    )}
                  </div>

                  {posts.length === 0 ? (
                    <div className="empty-result">
                      <div>🎬</div>
                      <p>No videos found</p>
                    </div>
                  ) : (
                    <div className="video-grid">

                      {posts.map((post) => {
                        const video = getVideo(post)
                        const thumbnail = getThumbnail(post)

                        return (
                          <div
                            className="video-card"
                            key={post.id}
                            onClick={() =>
                              navigate(`/home?post=${post.id}`)
                            }
                          >

                            <div className="video-cover">

                              {thumbnail ? (
                                <img
                                  src={thumbnail}
                                  alt=""
                                />
                              ) : video ? (
                                <video
                                  src={video}
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              ) : (
                                <div className="no-video">
                                  🎬
                                </div>
                              )}

                              <div className="video-overlay">
                                <span>▶</span>
                              </div>

                              <div className="views">
                                👁{' '}
                                {formatNumber(
                                  post.views ||
                                  post.viewCount ||
                                  0
                                )}
                              </div>

                            </div>

                            <div className="video-details">

                              <p>
                                {post.caption || 'Video'}
                              </p>

                              <span>
                                @{getPostUsername(post)}
                              </span>

                              <div className="video-stats">

                                <span>
                                  ❤️{' '}
                                  {formatNumber(
                                    post.likes ||
                                    post.likeCount ||
                                    0
                                  )}
                                </span>

                                <span>
                                  💬{' '}
                                  {formatNumber(
                                    post.comments ||
                                    post.commentCount ||
                                    0
                                  )}
                                </span>

                              </div>

                            </div>

                          </div>
                        )
                      })}

                    </div>
                  )}

                </section>
              )}

            </>
          )}

        </div>

      </div>

      <style>{`

        * {
          box-sizing: border-box;
        }

        .search-page {
          width: 100%;
          height: 100vh;
          background: #fff;
          color: #111;
          overflow: hidden;
        }

        .search-scroll {
          width: 100%;
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 90px;
        }

        .search-scroll::-webkit-scrollbar {
          width: 4px;
        }

        .search-scroll::-webkit-scrollbar-thumb {
          background: #aaa;
          border-radius: 20px;
        }

        .search-container {
          width: 100%;
          max-width: 700px;
          margin: auto;
          padding: 14px 14px 50px;
        }

        /* SEARCH HEADER */

        .search-header {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(255, 255, 255, .96);
          backdrop-filter: blur(12px);
          padding: 5px 0 12px;
        }

        .search-top {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .back-button {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          border: none;
          border-radius: 50%;
          background: #f1f1f2;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 21px;
          cursor: pointer;
        }

        .back-button:active {
          transform: scale(.9);
        }

        .search-box {
          width: 100%;
          height: 48px;
          display: flex;
          align-items: center;
          background: #f1f1f2;
          border-radius: 12px;
          padding: 0 13px;
        }

        .search-icon {
          font-size: 19px;
          margin-right: 9px;
        }

        .search-box input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          font-size: 16px;
          color: #111;
        }

        .search-box input::placeholder {
          color: #777;
        }

        .clear-button {
          border: none;
          background: #aaa;
          color: white;
          width: 21px;
          height: 21px;
          border-radius: 50%;
          font-size: 18px;
          line-height: 18px;
          padding: 0;
          cursor: pointer;
        }

        /* DISCOVER */

        .discover {
          padding-top: 20px;
        }

        .discover h2 {
          font-size: 23px;
          margin: 0 0 16px;
        }

        .discover-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .discover-card {
          min-height: 125px;
          border-radius: 15px;
          padding: 18px;
          background: #f5f5f5;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .discover-card span {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .discover-card strong {
          font-size: 16px;
        }

        .discover-card small {
          margin-top: 4px;
          color: #777;
        }

        /* LOADING */

        .loading {
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #666;
        }

        .spinner {
          width: 22px;
          height: 22px;
          border: 3px solid #ddd;
          border-top-color: #111;
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* TABS */

        .tabs {
          display: flex;
          border-bottom: 1px solid #eee;
          margin-top: 8px;
          position: sticky;
          top: 60px;
          z-index: 10;
          background: rgba(255, 255, 255, .97);
          backdrop-filter: blur(10px);
        }

        .tabs button {
          flex: 1;
          border: none;
          background: transparent;
          padding: 15px 5px 13px;
          font-size: 14px;
          font-weight: 600;
          color: #777;
          position: relative;
          cursor: pointer;
        }

        .tabs button.active {
          color: #111;
        }

        .tabs button.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 35%;
          width: 30%;
          height: 2px;
          background: #111;
          border-radius: 5px;
        }

        /* SECTIONS */

        .result-section {
          padding-top: 20px;
        }

        .section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .section-title h3 {
          margin: 0;
          font-size: 18px;
        }

        .section-title span {
          color: #888;
          font-size: 12px;
        }

        /* USERS */

        .users-list {
          display: flex;
          flex-direction: column;
        }

        .user-card {
          display: flex;
          align-items: center;
          padding: 12px 2px;
          gap: 12px;
          cursor: pointer;
        }

        .avatar {
          width: 55px;
          height: 55px;
          flex-shrink: 0;
          border-radius: 50%;
          overflow: hidden;
          background: #ddd;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 21px;
          font-weight: 700;
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-info {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .user-info strong {
          font-size: 15px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-info span {
          color: #777;
          font-size: 13px;
          margin-top: 2px;
        }

        .user-info small {
          color: #999;
          font-size: 12px;
          margin-top: 3px;
        }

        .follow-button {
          border: none;
          background: #111;
          color: white;
          padding: 8px 18px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }

        .follow-button.following {
          background: #f1f1f2;
          color: #111;
          border: 1px solid #ddd;
        }

        .follow-button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        /* VIDEOS */

        .video-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .video-card {
          min-width: 0;
          overflow: hidden;
          background: #fff;
          border-radius: 8px;
          cursor: pointer;
        }

        .video-cover {
          width: 100%;
          aspect-ratio: .72;
          background: #111;
          position: relative;
          overflow: hidden;
        }

        .video-cover img,
        .video-cover video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .no-video {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
        }

        .video-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, .08);
        }

        .video-overlay span {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(0, 0, 0, .55);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-left: 3px;
        }

        .views {
          position: absolute;
          bottom: 7px;
          left: 8px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          text-shadow: 0 1px 3px #000;
        }

        .video-details {
          padding: 7px 3px 12px;
        }

        .video-details p {
          margin: 0;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .video-details > span {
          display: block;
          color: #777;
          font-size: 12px;
          margin-top: 4px;
        }

        .video-stats {
          display: flex;
          gap: 12px;
          margin-top: 5px;
          color: #888;
          font-size: 11px;
        }

        /* EMPTY */

        .empty-result {
          min-height: 130px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #888;
        }

        .empty-result div {
          font-size: 35px;
          margin-bottom: 6px;
        }

        .empty-result p {
          margin: 0;
          font-size: 14px;
        }

        /* MOBILE */

        @media (max-width: 500px) {
          .search-container {
            padding-left: 12px;
            padding-right: 12px;
          }

          .video-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .follow-button {
            padding: 8px 15px;
          }
        }

        @media (min-width: 700px) {
          .video-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .discover-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

      `}</style>

    </div>
  )
}

export default Search
