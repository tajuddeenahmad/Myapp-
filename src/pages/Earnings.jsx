import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export default function Earnings() {
  const [user, setUser] = useState(null)
  const [earnings, setEarnings] = useState({
    totalViews: 0,
    creatorEarnings: 0,
    walletBalance: 0,
    totalPaid: 0,
    pendingWithdrawal: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)

      if (!currentUser) {
        setEarnings({
          totalViews: 0,
          creatorEarnings: 0,
          walletBalance: 0,
          totalPaid: 0,
          pendingWithdrawal: 0,
        })
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      const userRef = doc(db, 'users', currentUser.uid)

      const unsubscribeUser = onSnapshot(
        userRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            setEarnings({
              totalViews: 0,
              creatorEarnings: 0,
              walletBalance: 0,
              totalPaid: 0,
              pendingWithdrawal: 0,
            })
            setLoading(false)
            return
          }

          const data = snapshot.data()

          setEarnings({
            totalViews: Number(data.totalViews || 0),
            creatorEarnings: Number(
              data.creatorEarnings ?? data.earnings ?? 0
            ),
            walletBalance: Number(data.walletBalance || 0),
            totalPaid: Number(data.totalPaid || 0),
            pendingWithdrawal: Number(data.pendingWithdrawal || 0),
          })

          setLoading(false)
        },
        (snapshotError) => {
          console.error('Earnings listener error:', snapshotError)
          setError('Unable to load your earnings right now.')
          setLoading(false)
        }
      )

      return unsubscribeUser
    })

    return () => unsubscribeAuth()
  }, [])

  const formatNaira = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount || 0)
  }

  const formatNumber = (number) => {
    return new Intl.NumberFormat('en-NG').format(number || 0)
  }

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>Earnings</h1>
            <p style={styles.subtitle}>
              Track your creator earnings and payments.
            </p>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Login required</h2>
            <p style={styles.description}>
              Please log in to view your earnings.
            </p>

            <Link to="/login" style={styles.primaryButton}>
              Log In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>Earnings</h1>
            <p style={styles.subtitle}>
              Track your creator earnings and payments.
            </p>
          </div>

          <div style={styles.loadingCard}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Loading earnings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Earnings</h1>
          <p style={styles.subtitle}>
            Track your creator earnings and payments.
          </p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {/* Main balance */}
        <div style={styles.mainCard}>
          <div>
            <p style={styles.mainLabel}>Available Balance</p>
            <h2 style={styles.mainAmount}>
              {formatNaira(earnings.walletBalance)}
            </h2>
            <p style={styles.mainDescription}>
              This is the amount currently available for withdrawal.
            </p>
          </div>

          <Link to="/withdraw" style={styles.withdrawButton}>
            Withdraw
          </Link>
        </div>

        {/* Earnings statistics */}
        <div style={styles.grid}>
          <div style={styles.statCard}>
            <div style={styles.icon}>💰</div>
            <p style={styles.statLabel}>Creator Earnings</p>
            <h3 style={styles.statValue}>
              {formatNaira(earnings.creatorEarnings)}
            </h3>
            <p style={styles.statHint}>
              Total rewards credited to you.
            </p>
          </div>

          <div style={styles.statCard}>
            <div style={styles.icon}>👁️</div>
            <p style={styles.statLabel}>Total Views</p>
            <h3 style={styles.statValue}>
              {formatNumber(earnings.totalViews)}
            </h3>
            <p style={styles.statHint}>
              Views generated by your content.
            </p>
          </div>

          <div style={styles.statCard}>
            <div style={styles.icon}>✅</div>
            <p style={styles.statLabel}>Total Paid</p>
            <h3 style={styles.statValue}>
              {formatNaira(earnings.totalPaid)}
            </h3>
            <p style={styles.statHint}>
              Payments already sent to you.
            </p>
          </div>

          <div style={styles.statCard}>
            <div style={styles.icon}>⏳</div>
            <p style={styles.statLabel}>Pending Withdrawal</p>
            <h3 style={styles.statValue}>
              {formatNaira(earnings.pendingWithdrawal)}
            </h3>
            <p style={styles.statHint}>
              Withdrawal requests still processing.
            </p>
          </div>
        </div>

        {/* Monetization information */}
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>ℹ️</div>

          <div>
            <h2 style={styles.infoTitle}>How TajVid earnings work</h2>

            <p style={styles.infoText}>
              TajVid does not automatically convert every video view into
              money. Creator rewards are credited by TajVid based on the
              platform's monetization and reward system.
            </p>

            <p style={styles.infoText}>
              Advertising revenue belongs to TajVid first. When TajVid decides
              to reward a creator, the approved amount is added to the
              creator's earnings and becomes available according to the
              platform's payment rules.
            </p>

            <p style={styles.infoNote}>
              Earnings shown here are only amounts actually credited to your
              account. Views alone do not guarantee payment.
            </p>
          </div>
        </div>

        {/* Wallet link */}
        <div style={styles.bottomCard}>
          <div>
            <h2 style={styles.bottomTitle}>View your wallet</h2>
            <p style={styles.bottomText}>
              See your complete payment and withdrawal history.
            </p>
          </div>

          <Link to="/wallet" style={styles.secondaryButton}>
            Open Wallet
          </Link>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f7f8fa',
    padding: '24px 16px 40px',
    boxSizing: 'border-box',
  },

  container: {
    width: '100%',
    maxWidth: '900px',
    margin: '0 auto',
  },

  header: {
    marginBottom: '24px',
  },

  title: {
    margin: 0,
    fontSize: '30px',
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    margin: '7px 0 0',
    fontSize: '15px',
    color: '#6b7280',
  },

  mainCard: {
    background: '#111827',
    color: '#ffffff',
    borderRadius: '20px',
    padding: '24px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
  },

  mainLabel: {
    margin: 0,
    fontSize: '14px',
    color: '#d1d5db',
  },

  mainAmount: {
    margin: '8px 0 5px',
    fontSize: '32px',
    fontWeight: '800',
  },

  mainDescription: {
    margin: 0,
    fontSize: '13px',
    color: '#9ca3af',
  },

  withdrawButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '0 20px',
    borderRadius: '12px',
    background: '#ffffff',
    color: '#111827',
    textDecoration: 'none',
    fontWeight: '700',
    fontSize: '14px',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '14px',
    marginBottom: '16px',
  },

  statCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '20px',
    boxSizing: 'border-box',
  },

  icon: {
    fontSize: '22px',
    marginBottom: '12px',
  },

  statLabel: {
    margin: 0,
    color: '#6b7280',
    fontSize: '13px',
    fontWeight: '600',
  },

  statValue: {
    margin: '7px 0',
    color: '#111827',
    fontSize: '22px',
    fontWeight: '800',
  },

  statHint: {
    margin: 0,
    color: '#9ca3af',
    fontSize: '12px',
    lineHeight: 1.5,
  },

  infoCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '20px',
    marginBottom: '16px',
  },

  infoIcon: {
    fontSize: '22px',
    flexShrink: 0,
  },

  infoTitle: {
    margin: '0 0 8px',
    fontSize: '17px',
    color: '#111827',
  },

  infoText: {
    margin: '0 0 10px',
    fontSize: '13px',
    lineHeight: 1.6,
    color: '#4b5563',
  },

  infoNote: {
    margin: 0,
    fontSize: '13px',
    lineHeight: 1.6,
    color: '#111827',
    fontWeight: '600',
  },

  bottomCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },

  bottomTitle: {
    margin: 0,
    fontSize: '17px',
    color: '#111827',
  },

  bottomText: {
    margin: '5px 0 0',
    fontSize: '13px',
    color: '#6b7280',
  },

  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '42px',
    padding: '0 18px',
    borderRadius: '11px',
    background: '#f3f4f6',
    color: '#111827',
    textDecoration: 'none',
    fontWeight: '700',
    fontSize: '14px',
  },

  loadingCard: {
    minHeight: '220px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },

  spinner: {
    width: '30px',
    height: '30px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #111827',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  loadingText: {
    marginTop: '12px',
    color: '#6b7280',
    fontSize: '14px',
  },

  errorBox: {
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '12px 14px',
    marginBottom: '16px',
    fontSize: '14px',
  },

  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '24px',
  },

  cardTitle: {
    margin: '0 0 8px',
    color: '#111827',
  },

  description: {
    margin: '0 0 18px',
    color: '#6b7280',
    fontSize: '14px',
  },

  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '0 20px',
    borderRadius: '12px',
    background: '#111827',
    color: '#ffffff',
    textDecoration: 'none',
    fontWeight: '700',
  },
}
