import { useEffect, useMemo, useRef, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../lib/firebase'

export default function Profile() {
  const navigate = useNavigate()
  const { uid: profileUid } = useParams()

  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])

  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [likes, setLikes] = useState(0)

  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  const [showEdit, setShowEdit] = useState(false)
  const [showBioEdit, setShowBioEdit] = useState(false)

  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')

  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleProfilePhoto(event) {
    const file = event.target.files?.[0]

    if (!file || !currentUser || !isOwnProfile) {
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select an image.')
      return
    }

    try {
      setUploadingPhoto(true)
      setError('')
      setMessage('')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'myapp_videos')

      const response = await fetch(
        'https://api.cloudinary.com/v1_1/kpbkojvd/image/upload',
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!response.ok) {
        throw new Error('Image upload failed.')
      }

      const data = await response.json()

      await updateDoc(
        doc(db, 'users', currentUser.uid),
        {
          photoURL: data.secure_url,
          photoUpdatedAt: serverTimestamp(),
        }
      )

      setProfile((prev) => ({
        ...(prev || {}),
        photoURL: data.secure_url,
      }))

      setMessage('Profile photo updated successfully.')
    } catch (error) {
      console.error(
        'Profile photo upload error:',
        error
      )

      setError(
        'Unable to upload profile photo. Please try again.'
      )
    } finally {
      setUploadingPhoto(false)
      event.target.value = ''
    }
  }


  const viewedUid = profileUid || currentUser?.uid

  const isOwnProfile =
    !!currentUser && currentUser.uid === viewedUid

  const isPublicProfile =
    !!profileUid && !isOwnProfile

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (viewedUid) {
      loadProfile()
    } else {
      setLoading(false)
    }
  }, [viewedUid])

  useEffect(() => {
    let cancelled = false

    async function loadFollowStatus() {
      if (
        !currentUser ||
        !viewedUid ||
        currentUser.uid === viewedUid
      ) {
        if (!cancelled) {
          setIsFollowing(false)
        }
        return
      }

      try {
        const followId =
          `${currentUser.uid}_${viewedUid}`

        const followRef = doc(
          db,
          'follows',
          followId
        )

        const followSnap =
          await getDoc(followRef)

        if (!cancelled) {
          setIsFollowing(
            followSnap.exists()
          )
        }
      } catch (err) {
        console.error(
          'Follow status error:',
          err
        )

        if (!cancelled) {
          setIsFollowing(false)
        }
      }
    }

    loadFollowStatus()

    return () => {
      cancelled = true
    }
  }, [currentUser, viewedUid])

  async function loadProfile(showRefresh = false) {
    if (!viewedUid) {
      setLoading(false)
      return
    }

    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError('')
      setMessage('')

      // -----------------------------------------
      // PROFILE
      // -----------------------------------------
      const userRef = doc(db, 'users', viewedUid)
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        setProfile({
          uid: viewedUid,
          username: 'User',
          email: '',
          bio: '',
        })
      } else {
        const data = userSnap.data()

        setProfile({
          uid: viewedUid,
          ...data,
        })

        setEditUsername(data.username || '')
        setEditBio(data.bio || '')
      }

      // -----------------------------------------
      // FOLLOWERS
      // -----------------------------------------
      let followersCount = 0

      try {
        const followersQuery = query(
          collection(db, 'follows'),
          where('followingUid', '==', viewedUid)
        )

        const followersSnap = await getDocs(followersQuery)
        followersCount = followersSnap.size
      } catch (err) {
        console.log('Followers query error:', err)
      }

      // -----------------------------------------
      // FOLLOWING
      // -----------------------------------------
      let followingCount = 0

      try {
        const followingQuery = query(
          collection(db, 'follows'),
          where('followerUid', '==', viewedUid)
        )

        const followingSnap = await getDocs(followingQuery)
        followingCount = followingSnap.size
      } catch (err) {
        console.log('Following query error:', err)
      }

      // -----------------------------------------
      // USER VIDEOS
      // -----------------------------------------
      let userPosts = []

      try {
        const postsQuery = query(
          collection(db, 'posts'),
          where('uid', '==', viewedUid)
        )

        const postsSnap = await getDocs(postsQuery)

        userPosts = postsSnap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      } catch (err) {
        console.log('Posts query error:', err)
      }

      // -----------------------------------------
      // TOTAL LIKES
      // -----------------------------------------
      let totalLikes = 0

      userPosts.forEach((post) => {
        totalLikes += Number(post.likes || 0)
      })

      // Also verify likes collection when available.
      try {
        const userPostIds = new Set(
          userPosts.map((post) => post.id)
        )

        if (userPostIds.size > 0) {
          const likesSnap = await getDocs(
            collection(db, 'likes')
          )

          let receivedLikes = 0

          likesSnap.forEach((likeDoc) => {
            const likeData = likeDoc.data()

            if (userPostIds.has(likeData.postId)) {
              receivedLikes += 1
            }
          })

          if (receivedLikes > totalLikes) {
            totalLikes = receivedLikes
          }
        }
      } catch (err) {
        console.log('Likes query error:', err)
      }

      setFollowers(followersCount)
      setFollowing(followingCount)
      setLikes(totalLikes)

      userPosts.sort((a, b) => {
        const aTime =
          a.createdAt?.seconds ||
          a.createdAt?.toMillis?.() ||
          0

        const bTime =
          b.createdAt?.seconds ||
          b.createdAt?.toMillis?.() ||
          0

        return bTime - aTime
      })

      setPosts(userPosts)
    } catch (err) {
      console.error('Profile loading error:', err)

      setError(
        err?.message ||
          'Unable to load profile. Please check your internet connection.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // -----------------------------------------
  // FOLLOW / UNFOLLOW
  // -----------------------------------------
  async function handleFollow() {
    if (!currentUser) {
      setMessage('Please login first to follow this user.')
      return
    }

    if (currentUser.uid === viewedUid) {
      return
    }

    if (followLoading) return

    try {
      setFollowLoading(true)
      setError('')
      setMessage('')

      const followId =
        `${currentUser.uid}_${viewedUid}`

      const followRef = doc(
        db,
        'follows',
        followId
      )

      const targetRef = doc(
        db,
        'users',
        viewedUid
      )

      const currentUserRef = doc(
        db,
        'users',
        currentUser.uid
      )

      const targetSnap = await getDoc(targetRef)
      const currentUserSnap =
        await getDoc(currentUserRef)

      const targetData = targetSnap.exists()
        ? targetSnap.data()
        : {}

      const currentUserData =
        currentUserSnap.exists()
          ? currentUserSnap.data()
          : {}

      if (isFollowing) {
        await deleteDoc(followRef)

        setIsFollowing(false)

        setFollowers((prev) =>
          Math.max(0, prev - 1)
        )

        if (targetSnap.exists()) {
          await updateDoc(targetRef, {
            followers: Math.max(
              0,
              Number(targetData.followers || 0) - 1
            ),
          })
        }

        if (currentUserSnap.exists()) {
          await updateDoc(currentUserRef, {
            following: Math.max(
              0,
              Number(currentUserData.following || 0) - 1
            ),
          })
        }

        setMessage('Unfollowed successfully.')
      } else {
        await setDoc(followRef, {
          followerUid: currentUser.uid,
          followingUid: viewedUid,
          createdAt: serverTimestamp(),
        })

        setIsFollowing(true)

        setFollowers((prev) => prev + 1)

        if (targetSnap.exists()) {
          await updateDoc(targetRef, {
            followers:
              Number(targetData.followers || 0) + 1,
          })
        }

        if (currentUserSnap.exists()) {
          await updateDoc(currentUserRef, {
            following:
              Number(currentUserData.following || 0) + 1,
          })
        }

        setMessage('Following successfully.')
      }
    } catch (err) {
      console.error('Follow error:', err)

      setError(
        err?.message ||
          'Unable to update follow status.'
      )
    } finally {
      setFollowLoading(false)
    }
  }

  // -----------------------------------------
  // SAVE PROFILE
  // -----------------------------------------
  async function handleSaveProfile() {
    if (!currentUser) return

    const username = editUsername.trim()
    const bio = editBio.trim()

    if (username.length < 3) {
      setError(
        'Username must be at least 3 characters.'
      )
      return
    }

    if (username.length > 30) {
      setError(
        'Username cannot be longer than 30 characters.'
      )
      return
    }

    if (bio.length > 160) {
      setError(
        'Bio cannot be longer than 160 characters.'
      )
      return
    }

    try {
      setSavingProfile(true)
      setError('')
      setMessage('')

      const userRef = doc(
        db,
        'users',
        currentUser.uid
      )

      await setDoc(
        userRef,
        {
          username,
          bio,
          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        }
      )

      setProfile((prev) => ({
        ...prev,
        username,
        bio,
      }))

      setShowEdit(false)
      setShowBioEdit(false)

      setMessage(
        'Profile updated successfully.'
      )
    } catch (err) {
      console.error(
        'Profile update error:',
        err
      )

      setError(
        err?.message ||
          'Unable to update your profile.'
      )
    } finally {
      setSavingProfile(false)
    }
  }

  function formatNumber(number) {
    const value = Number(number || 0)

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }

    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }

    return value.toString()
  }

  const displayName = useMemo(() => {
    if (profile?.username) {
      return profile.username
    }

    if (profile?.email) {
      return profile.email.split('@')[0]
    }

    return 'User'
  }, [profile])

  if (!currentUser && !profileUid) {
    return (
      <div style={styles.page}>
        <div style={styles.centerBox}>
          <h2 style={styles.title}>
            Login Required
          </h2>

          <p style={styles.text}>
            Please login to view your profile.
          </p>

          <Link
            to="/login"
            style={styles.primaryButton}
          >
            Login
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.centerBox}>
          <div style={styles.spinner}>
            ⟳
          </div>

          <p style={styles.text}>
            Loading profile...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button
          onClick={() => navigate(-1)}
          style={styles.headerButton}
        >
          ←
        </button>

        <div style={styles.headerTitle}>
          {isPublicProfile
            ? 'Profile'
            : 'My Profile'}
        </div>

        <button
          onClick={() => loadProfile(true)}
          disabled={refreshing}
          style={styles.headerButton}
        >
          {refreshing ? '⟳' : '↻'}
        </button>
      </header>

      <main style={styles.content}>
        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {message && (
          <div style={styles.messageBox}>
            {message}
          </div>
        )}

        <section style={styles.profileCard}>
          <div
            style={{
              ...styles.avatar,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt="Profile"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              displayName
                .charAt(0)
                .toUpperCase()
            )}

            {isOwnProfile && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    photoInputRef.current?.click()
                  }
                  disabled={uploadingPhoto}
                  style={{
                    position: 'absolute',
                    right: '4px',
                    bottom: '4px',
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    border: '2px solid #fff',
                    background: '#6c4cff',
                    color: '#fff',
                    fontSize: '16px',
                    cursor: 'pointer',
                  }}
                >
                  {uploadingPhoto ? '…' : '📷'}
                </button>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhoto}
                  style={{ display: 'none' }}
                />
              </>
            )}
          </div>

          <h1 style={styles.username}>
            @{displayName}
          </h1>

          {!isPublicProfile &&
            profile?.email && (
              <p style={styles.email}>
                {profile.email}
              </p>
            )}

          <div style={styles.bioArea}>
            <p style={styles.bio}>
              {profile?.bio?.trim()
                ? profile.bio
                : 'No bio yet.'}
            </p>

            {isOwnProfile && (
              <button
                onClick={() => {
                  setEditBio(
                    profile?.bio || ''
                  )

                  setShowBioEdit(true)
                  setError('')
                  setMessage('')
                }}
                style={styles.smallEditButton}
              >
                Edit Bio
              </button>
            )}
          </div>

          {/* PROFILE STATS */}
          <div style={styles.stats}>
            <div style={styles.stat}>
              <strong
                style={styles.statNumber}
              >
                {formatNumber(posts.length)}
              </strong>

              <span
                style={styles.statLabel}
              >
                Videos
              </span>
            </div>

            <div style={styles.stat}>
              <strong
                style={styles.statNumber}
              >
                {formatNumber(likes)}
              </strong>

              <span
                style={styles.statLabel}
              >
                Likes
              </span>
            </div>

            <div style={styles.stat}>
              <strong
                style={styles.statNumber}
              >
                {formatNumber(followers)}
              </strong>

              <span
                style={styles.statLabel}
              >
                Followers
              </span>
            </div>

            <div style={styles.stat}>
              <strong
                style={styles.statNumber}
              >
                {formatNumber(following)}
              </strong>

              <span
                style={styles.statLabel}
              >
                Following
              </span>
            </div>
          </div>

          <div style={styles.actions}>
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => {
                    setEditUsername(
                      profile?.username || ''
                    )

                    setEditBio(
                      profile?.bio || ''
                    )

                    setShowEdit(true)
                    setError('')
                    setMessage('')
                  }}
                  style={styles.primaryButton}
                >
                  Edit Profile
                </button>

                <button
                  onClick={() =>
                    navigate('/settings')
                  }
                  style={styles.secondaryButton}
                >
                  Settings
                </button>
              </>
            ) : (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                style={{
                  ...styles.primaryButton,
                  ...(isFollowing
                    ? styles.followingButton
                    : {}),
                }}
              >
                {followLoading
                  ? 'Please wait...'
                  : isFollowing
                  ? 'Following'
                  : 'Follow'}
              </button>
            )}
          </div>
        </section>

        {/* USER VIDEOS */}
        <section style={styles.postsSection}>
          <h2 style={styles.sectionTitle}>
            {isPublicProfile
              ? `${displayName}'s Videos`
              : 'My Videos'}
          </h2>

          {posts.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>
                🎬
              </div>

              <h3 style={styles.emptyTitle}>
                No videos yet
              </h3>

              <p style={styles.emptyText}>
                {isOwnProfile
                  ? 'Your posted videos will appear here.'
                  : 'This user has not posted any videos yet.'}
              </p>
            </div>
          ) : (
            <div style={styles.videoGrid}>
              {posts.map((post) => {
                const videoUrl =
                  post.videoUrl ||
                  post.video ||
                  post.url

                const thumbnail =
                  post.thumbnail ||
                  post.thumbnailUrl ||
                  post.cover

                return (
                  <div
                    key={post.id}
                    style={styles.videoCard}
                  >
                    {videoUrl ? (
                      <video
                        src={videoUrl}
                        poster={
                          thumbnail ||
                          undefined
                        }
                        controls
                        playsInline
                        preload="metadata"
                        style={styles.video}
                      />
                    ) : thumbnail ? (
                      <img
                        src={thumbnail}
                        alt="Video"
                        style={styles.video}
                      />
                    ) : (
                      <div
                        style={styles.noVideo}
                      >
                        No preview
                      </div>
                    )}

                    <div
                      style={styles.videoInfo}
                    >
                      <span>
                        ❤️{' '}
                        {formatNumber(
                          post.likes || 0
                        )}
                      </span>

                      <span>
                        👁️{' '}
                        {formatNumber(
                          post.views ||
                            post.viewCount ||
                            0
                        )}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* EDIT PROFILE */}
      {showEdit && (
        <div
          style={styles.modalOverlay}
        >
          <div style={styles.modal}>
            <div
              style={styles.modalHeader}
            >
              <h2
                style={styles.modalTitle}
              >
                Edit Profile
              </h2>

              <button
                onClick={() =>
                  setShowEdit(false)
                }
                style={styles.closeButton}
              >
                ×
              </button>
            </div>

            <label style={styles.label}>
              Username
            </label>

            <input
              value={editUsername}
              onChange={(e) =>
                setEditUsername(
                  e.target.value
                )
              }
              maxLength={30}
              placeholder="Enter username"
              style={styles.input}
            />

            <label style={styles.label}>
              Bio
            </label>

            <textarea
              value={editBio}
              onChange={(e) =>
                setEditBio(
                  e.target.value
                )
              }
              maxLength={160}
              placeholder="Tell people about yourself..."
              rows={5}
              style={styles.textarea}
            />

            <div
              style={styles.characterCount}
            >
              {editBio.length}/160
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              style={styles.saveButton}
            >
              {savingProfile
                ? 'Saving...'
                : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* EDIT BIO */}
      {showBioEdit &&
        !showEdit && (
          <div
            style={
              styles.modalOverlay
            }
          >
            <div style={styles.modal}>
              <div
                style={
                  styles.modalHeader
                }
              >
                <h2
                  style={
                    styles.modalTitle
                  }
                >
                  Edit Bio
                </h2>

                <button
                  onClick={() =>
                    setShowBioEdit(false)
                  }
                  style={
                    styles.closeButton
                  }
                >
                  ×
                </button>
              </div>

              <textarea
                value={editBio}
                onChange={(e) =>
                  setEditBio(
                    e.target.value
                  )
                }
                maxLength={160}
                placeholder="Write something about yourself..."
                rows={6}
                style={styles.textarea}
              />

              <div
                style={
                  styles.characterCount
                }
              >
                {editBio.length}/160
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                style={
                  styles.saveButton
                }
              >
                {savingProfile
                  ? 'Saving...'
                  : 'Save Bio'}
              </button>
            </div>
          </div>
        )}
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    height: '100vh',
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    background: '#050505',
    color: '#fff',
    fontFamily: 'Arial, Helvetica, sans-serif',
    boxSizing: 'border-box',
  },

  header: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    height: '64px',
    minHeight: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    background: '#080808',
    borderBottom: '1px solid #222',
    boxSizing: 'border-box',
  },

  headerTitle: {
    fontSize: '20px',
    fontWeight: '700',
  },

  headerButton: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    border: '1px solid #333',
    background: '#151515',
    color: '#fff',
    fontSize: '23px',
    cursor: 'pointer',
    flexShrink: 0,
  },

  content: {
    width: '100%',
    maxWidth: '700px',
    margin: '0 auto',
    padding: '20px 14px 120px',
    boxSizing: 'border-box',
  },

  centerBox: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    textAlign: 'center',
    boxSizing: 'border-box',
  },

  spinner: {
    fontSize: '40px',
    marginBottom: '10px',
  },

  title: {
    fontSize: '24px',
    margin: '0 0 10px',
  },

  text: {
    color: '#aaa',
    lineHeight: 1.6,
  },

  profileCard: {
    background: '#111',
    border: '1px solid #242424',
    borderRadius: '18px',
    padding: '24px 16px',
    textAlign: 'center',
  },

  avatar: {
    width: '90px',
    height: '90px',
    margin: '0 auto 14px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#252525',
    border: '2px solid #444',
    color: '#fff',
    fontSize: '36px',
    fontWeight: '700',
  },

  username: {
    margin: 0,
    fontSize: '25px',
    fontWeight: '700',
  },

  email: {
    margin: '6px 0 0',
    color: '#888',
    fontSize: '14px',
  },

  bioArea: {
    margin: '18px auto 0',
    maxWidth: '520px',
  },

  bio: {
    margin: 0,
    color: '#ddd',
    fontSize: '15px',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },

  smallEditButton: {
    marginTop: '10px',
    padding: '7px 13px',
    borderRadius: '8px',
    border: '1px solid #333',
    background: '#181818',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
  },

  stats: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(4, minmax(0, 1fr))',
    gap: '12px',
    marginTop: '25px',
  },

  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 0,
  },

  statNumber: {
    fontSize: '19px',
    fontWeight: '700',
  },

  statLabel: {
    marginTop: '4px',
    color: '#999',
    fontSize: '12px',
    textAlign: 'center',
  },

  actions: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '24px',
  },

  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '150px',
    padding: '12px 22px',
    border: 'none',
    borderRadius: '10px',
    background: '#fff',
    color: '#000',
    fontSize: '15px',
    fontWeight: '700',
    textDecoration: 'none',
    cursor: 'pointer',
  },

  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '150px',
    padding: '12px 22px',
    border: '1px solid #444',
    borderRadius: '10px',
    background: '#202020',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
  },

  followingButton: {
    background: '#252525',
    color: '#fff',
    border: '1px solid #444',
  },

  errorBox: {
    marginBottom: '12px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#351010',
    border: '1px solid #6b2424',
    color: '#ffb0b0',
    fontSize: '14px',
    lineHeight: 1.5,
  },

  messageBox: {
    marginBottom: '12px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#102d19',
    border: '1px solid #245c34',
    color: '#a9efba',
    fontSize: '14px',
  },

  postsSection: {
    marginTop: '24px',
    paddingBottom: '20px',
  },

  sectionTitle: {
    margin: '0 0 14px',
    fontSize: '20px',
  },

  videoGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(2, minmax(0, 1fr))',
    gap: '10px',
  },

  videoCard: {
    overflow: 'hidden',
    borderRadius: '12px',
    background: '#111',
    border: '1px solid #242424',
  },

  video: {
    width: '100%',
    aspectRatio: '9 / 14',
    display: 'block',
    objectFit: 'cover',
    background: '#000',
  },

  noVideo: {
    width: '100%',
    aspectRatio: '9 / 14',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#777',
    background: '#080808',
  },

  videoInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '9px',
    color: '#aaa',
    fontSize: '12px',
  },

  empty: {
    padding: '45px 20px',
    textAlign: 'center',
    borderRadius: '15px',
    background: '#101010',
    border: '1px solid #222',
    marginBottom: '30px',
  },

  emptyIcon: {
    fontSize: '42px',
    marginBottom: '10px',
  },

  emptyTitle: {
    margin: '0 0 8px',
    fontSize: '18px',
  },

  emptyText: {
    margin: 0,
    color: '#888',
    fontSize: '14px',
    lineHeight: 1.5,
  },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '18px',
    background: 'rgba(0,0,0,0.78)',
    boxSizing: 'border-box',
  },

  modal: {
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    padding: '20px',
    borderRadius: '18px',
    background: '#121212',
    border: '1px solid #2b2b2b',
    boxSizing: 'border-box',
  },

  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },

  modalTitle: {
    margin: 0,
    fontSize: '21px',
  },

  closeButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '1px solid #333',
    background: '#1b1b1b',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
  },

  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#ddd',
    fontSize: '14px',
    fontWeight: '600',
  },

  input: {
    width: '100%',
    padding: '13px',
    marginBottom: '18px',
    borderRadius: '10px',
    border: '1px solid #333',
    outline: 'none',
    background: '#080808',
    color: '#fff',
    fontSize: '15px',
    boxSizing: 'border-box',
  },

  textarea: {
    width: '100%',
    padding: '13px',
    borderRadius: '10px',
    border: '1px solid #333',
    outline: 'none',
    resize: 'vertical',
    background: '#080808',
    color: '#fff',
    fontSize: '15px',
    lineHeight: 1.5,
    boxSizing: 'border-box',
  },

  characterCount: {
    marginTop: '6px',
    marginBottom: '18px',
    textAlign: 'right',
    color: '#777',
    fontSize: '12px',
  },

  saveButton: {
    width: '100%',
    padding: '13px',
    border: 'none',
    borderRadius: '10px',
    background: '#fff',
    color: '#000',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
  },
}
