import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import {
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const EARNINGS_PER_1000_VIEWS = 1

function Earnings() {
  const [user, setUser] = useState(null)
  const [views, setViews] = useState(0)
  const [earnings, setEarnings] = useState(0)
  const [wallet, setWallet] = useState(0)
  const [loading, setLoading] = useState(true)
  const [transferring, setTransferring] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser)

        if (!currentUser) {
          setLoading(false)
          return
        }

        try {
          const userRef = doc(
            db,
            'users',
            currentUser.uid
          )

          const userSnap = await getDoc(userRef)

          if (userSnap.exists()) {
            const data = userSnap.data()

            const totalViews = Number(
              data.totalViews || 0
            )

            const savedEarnings = Number(
              data.earnings || 0
            )

            const walletBalance = Number(
              data.walletBalance || 0
            )

            setViews(totalViews)
            setEarnings(savedEarnings)
            setWallet(walletBalance)
          }
        } catch (error) {
          console.error('Earnings error:', error)
          setMessage(
            `❌ Error: ${error.message}`
          )
        } finally {
          setLoading(false)
        }
      }
    )

    return () => unsubscribe()
  }, [])

  async function calculateEarnings() {
    if (!user) return

    setMessage('')

    try {
      const userRef = doc(
        db,
        'users',
        user.uid
      )

      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        throw new Error('User profile bai samu ba.')
      }

      const data = userSnap.data()

      const totalViews = Number(
        data.totalViews || 0
      )

      const newEarnings =
        Math.floor(totalViews / 1000) *
        EARNINGS_PER_1000_VIEWS

      await updateDoc(userRef, {
        earnings: newEarnings,
      })

      setViews(totalViews)
      setEarnings(newEarnings)

      setMessage(
        `✅ An ƙididdige earnings: ₦${newEarnings.toFixed(2)}`
      )
    } catch (error) {
      console.error('Calculate earnings error:', error)

      setMessage(
        `❌ An samu matsala: ${error.message}`
      )
    }
  }

  async function transferToWallet() {
    if (!user) return

    if (earnings <= 0) {
      setMessage(
        '❌ Babu earnings da za a tura.'
      )
      return
    }

    setTransferring(true)
    setMessage('')

    try {
      const userRef = doc(
        db,
        'users',
        user.uid
      )

      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        throw new Error(
          'User profile bai samu ba.'
        )
      }

      const data = userSnap.data()

      const currentWallet = Number(
        data.walletBalance || 0
      )

      const currentEarnings = Number(
        data.earnings || 0
      )

      const newWallet =
        currentWallet + currentEarnings

      await updateDoc(userRef, {
        walletBalance: newWallet,
        earnings: 0,
      })

      setWallet(newWallet)
      setEarnings(0)

      setMessage(
        '✅ An tura earnings zuwa Wallet!'
      )
    } catch (error) {
      console.error('Transfer error:', error)

      setMessage(
        `❌ Transfer bai yi ba: ${error.message}`
      )
    } finally {
      setTransferring(false)
    }
  }

  if (!user) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Ba ka shiga account ba</h2>
        <Link to="/login">Login</Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Loading Earnings...</h2>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#111',
        color: '#fff',
        padding: '20px',
        fontFamily: 'Arial',
      }}
    >
      <Link
        to="/profile"
        style={{ color: '#fff' }}
      >
        ← Profile
      </Link>

      <h1>📊 Creator Earnings</h1>

      <div
        style={{
          background: '#222',
          padding: '25px',
          borderRadius: '15px',
          marginTop: '20px',
        }}
      >
        <p>👁️ Total Views</p>
        <h2>{views}</h2>
      </div>

      <div
        style={{
          background: '#222',
          padding: '25px',
          borderRadius: '15px',
          marginTop: '15px',
        }}
      >
        <p>💰 Estimated Earnings</p>

        <h2>
          ₦{earnings.toFixed(2)}
        </h2>

        <small>
          Demo rate: ₦1 / 1,000 views
        </small>
      </div>

      <div
        style={{
          background: '#222',
          padding: '25px',
          borderRadius: '15px',
          marginTop: '15px',
        }}
      >
        <p>💳 Wallet Balance</p>

        <h2>
          ₦{wallet.toFixed(2)}
        </h2>
      </div>

      <button
        onClick={calculateEarnings}
        style={{
          marginTop: '25px',
          padding: '14px 20px',
          border: 'none',
          borderRadius: '25px',
          fontWeight: 'bold',
          fontSize: '16px',
        }}
      >
        🧮 Calculate Earnings
      </button>

      <br />

      <button
        onClick={transferToWallet}
        disabled={
          transferring || earnings <= 0
        }
        style={{
          marginTop: '15px',
          padding: '14px 20px',
          border: 'none',
          borderRadius: '25px',
          fontWeight: 'bold',
          fontSize: '16px',
        }}
      >
        {transferring
          ? '⏳ Transferring...'
          : '💰 Transfer to Wallet'}
      </button>

      {message && (
        <p style={{ marginTop: '20px' }}>
          {message}
        </p>
      )}

      <br />

      <Link
        to="/wallet"
        style={{ color: '#fff' }}
      >
        Duba Wallet →
      </Link>
    </div>
  )
}

export default Earnings
