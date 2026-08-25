import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collectionGroup,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../lib/firebase'

function Admin() {
  const [user, setUser] = useState(null)
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  async function loadWithdrawals() {
    try {
      setLoading(true)
      setMessage('')

      const withdrawalsQuery = query(
        collectionGroup(db, 'transactions'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(withdrawalsQuery)

      const list = snapshot.docs.map((item) => ({
        id: item.id,
        path: item.ref.path,
        ...item.data(),
      }))

      setWithdrawals(list)
    } catch (error) {
      console.error('Admin withdrawals error:', error)

      setMessage(
        `❌ An samu matsala: ${error.message}`
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser)

        if (!currentUser) {
          setLoading(false)
          return
        }

        loadWithdrawals()
      }
    )

    return () => unsubscribe()
  }, [])

  async function updateStatus(withdrawal, status) {
    if (!withdrawal.path) return

    setUpdatingId(withdrawal.id)
    setMessage('')

    try {
      const transactionRef = doc(
        db,
        withdrawal.path
      )

      await updateDoc(transactionRef, {
        status,
        processedAt: new Date(),
      })

      setWithdrawals((current) =>
        current.filter(
          (item) => item.id !== withdrawal.id
        )
      )

      setMessage(
        status === 'paid'
          ? '✅ An sanya withdrawal ɗin a matsayin Paid.'
          : '❌ An sanya withdrawal ɗin a matsayin Failed.'
      )
    } catch (error) {
      console.error(
        'Update withdrawal error:',
        error
      )

      setMessage(
        `❌ An kasa sabunta withdrawal: ${error.message}`
      )
    } finally {
      setUpdatingId(null)
    }
  }

  if (!user) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>🔐 Admin Login Required</h2>

        <p>Da farko ka yi Login.</p>

        <Link to="/login">
          Login
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Loading Withdrawals...</h2>
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
        to="/"
        style={{
          color: '#fff',
          textDecoration: 'none',
        }}
      >
        ← Home
      </Link>

      <h1 style={{ marginTop: '20px' }}>
        🛠️ Admin Withdrawal
      </h1>

      {message && (
        <div
          style={{
            background: '#222',
            padding: '15px',
            borderRadius: '10px',
            marginTop: '15px',
          }}
        >
          {message}
        </div>
      )}

      {withdrawals.length === 0 ? (
        <div
          style={{
            background: '#222',
            padding: '25px',
            borderRadius: '15px',
            marginTop: '20px',
          }}
        >
          <h2>✅ Babu Pending Withdrawal</h2>
          <p>
            A yanzu babu withdrawal request da ke jiran dubawa.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          {withdrawals.map((withdrawal) => (
            <div
              key={withdrawal.id}
              style={{
                background: '#222',
                padding: '20px',
                borderRadius: '15px',
                marginBottom: '15px',
              }}
            >
              <h2>
                ₦
                {Number(
                  withdrawal.amount || 0
                ).toFixed(2)}
              </h2>

              <p>
                👤 UID: {withdrawal.uid || 'Unknown'}
              </p>

              <p>
                🏦 Bank: {withdrawal.bank || 'Unknown'}
              </p>

              <p>
                👤 Account Name:{' '}
                {withdrawal.accountName || 'Unknown'}
              </p>

              <p>
                💳 Account Number:{' '}
                {withdrawal.accountNumber || 'Unknown'}
              </p>

              <p>
                🟡 Status: {withdrawal.status || 'pending'}
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '15px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={() =>
                    updateStatus(
                      withdrawal,
                      'paid'
                    )
                  }
                  disabled={
                    updatingId === withdrawal.id
                  }
                  style={{
                    padding: '12px 18px',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  {updatingId === withdrawal.id
                    ? '⏳'
                    : '✅ Mark Paid'}
                </button>

                <button
                  onClick={() =>
                    updateStatus(
                      withdrawal,
                      'failed'
                    )
                  }
                  disabled={
                    updatingId === withdrawal.id
                  }
                  style={{
                    padding: '12px 18px',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  {updatingId === withdrawal.id
                    ? '⏳'
                    : '❌ Mark Failed'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={loadWithdrawals}
        style={{
          marginTop: '10px',
          padding: '12px 18px',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        🔄 Refresh
      </button>
    </div>
  )
}

export default Admin
