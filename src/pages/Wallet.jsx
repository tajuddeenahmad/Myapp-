import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export default function Wallet() {
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let unsubscribeUserDoc = null
    let unsubscribeTransactions = null

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)

      if (!currentUser) {
        setBalance(0)
        setTransactions([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      const userRef = doc(db, 'users', currentUser.uid)

      unsubscribeUserDoc = onSnapshot(
        userRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            setBalance(0)
          } else {
            const data = snapshot.data()
            setBalance(Number(data.walletBalance || 0))
          }
        },
        (err) => {
          console.error('Wallet balance error:', err)
          setError('Unable to load your wallet balance.')
        }
      )

      const transactionsRef = collection(
        db,
        'users',
        currentUser.uid,
        'transactions'
      )

      const transactionsQuery = query(
        transactionsRef,
        orderBy('createdAt', 'desc')
      )

      unsubscribeTransactions = onSnapshot(
        transactionsQuery,
        (snapshot) => {
          const items = snapshot.docs.map((transactionDoc) => ({
            id: transactionDoc.id,
            ...transactionDoc.data(),
          }))

          setTransactions(items)
          setLoading(false)
        },
        (err) => {
          console.error('Transactions error:', err)

          // If the collection is empty or the index is not ready,
          // keep the wallet usable.
          setTransactions([])
          setError('Unable to load transaction history right now.')
          setLoading(false)
        }
      )
    })

    return () => {
      unsubscribeAuth()

      if (unsubscribeUserDoc) {
        unsubscribeUserDoc()
      }

      if (unsubscribeTransactions) {
        unsubscribeTransactions()
      }
    }
  }, [])

  const formatNaira = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(Number(amount || 0))
  }

  const formatDate = (value) => {
    if (!value) return 'Date unavailable'

    try {
      if (typeof value?.toDate === 'function') {
        return value.toDate().toLocaleString('en-NG', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      }

      const date = new Date(value)

      if (Number.isNaN(date.getTime())) {
        return 'Date unavailable'
      }

      return date.toLocaleString('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    } catch {
      return 'Date unavailable'
    }
  }

  const getTransactionType = (transaction) => {
    const type = String(transaction.type || '').toLowerCase()

    if (
      type === 'credit' ||
      type === 'earning' ||
      type === 'payment'
    ) {
      return 'Credit'
    }

    if (
      type === 'refund' ||
      type === 'refund_credit'
    ) {
      return 'Refund'
    }

    if (
      type === 'withdrawal' ||
      type === 'withdraw'
    ) {
      return 'Withdrawal'
    }

    return transaction.amount > 0 ? 'Credit' : 'Transaction'
  }

  const getStatus = (transaction) => {
    return String(transaction.status || 'completed').toLowerCase()
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending'

      case 'processing':
        return 'Processing'

      case 'paid':
      case 'completed':
        return 'Completed'

      case 'failed':
        return 'Failed'

      case 'cancelled':
        return 'Cancelled'

      default:
        return 'Completed'
    }
  }

  const isOutgoing = (transaction) => {
    const type = String(transaction.type || '').toLowerCase()

    return (
      type === 'withdrawal' ||
      type === 'withdraw'
    )
  }

  const getDescription = (transaction) => {
    if (transaction.description) {
      return transaction.description
    }

    const type = getTransactionType(transaction)

    if (type === 'Credit') {
      return 'Creator payment'
    }

    if (type === 'Refund') {
      return 'Refund'
    }

    if (type === 'Withdrawal') {
      return 'Withdrawal request'
    }

    return 'Wallet transaction'
  }

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>Wallet</h1>
            <p style={styles.subtitle}>
              Manage your TajVid balance and payments.
            </p>
          </div>

          <div style={styles.emptyCard}>
            <div style={styles.emptyIcon}>🔐</div>

            <h2 style={styles.emptyTitle}>
              Login required
            </h2>

            <p style={styles.emptyText}>
              Please log in to access your wallet.
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
            <h1 style={styles.title}>Wallet</h1>
            <p style={styles.subtitle}>
              Manage your TajVid balance and payments.
            </p>
          </div>

          <div style={styles.loadingCard}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>
              Loading wallet...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Wallet</h1>
          <p style={styles.subtitle}>
            Manage your TajVid balance and payments.
          </p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {/* Balance Card */}
        <div style={styles.balanceCard}>
          <div>
            <p style={styles.balanceLabel}>
              Available Balance
            </p>

            <h2 style={styles.balanceAmount}>
              {formatNaira(balance)}
            </h2>

            <p style={styles.balanceHint}>
              Available for withdrawal or future payments.
            </p>
          </div>

          <div style={styles.walletIcon}>
            💳
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <Link
            to="/withdraw"
            style={styles.withdrawButton}
          >
            Withdraw
          </Link>

          <Link
            to="/earnings"
            style={styles.earningsButton}
          >
            View Earnings
          </Link>
        </div>

        {/* Transaction Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Transaction History
              </h2>

              <p style={styles.sectionSubtitle}>
                Your wallet activity and payments.
              </p>
            </div>

            <span style={styles.transactionCount}>
              {transactions.length}
            </span>
          </div>

          {transactions.length === 0 ? (
            <div style={styles.emptyTransactions}>
              <div style={styles.emptyIcon}>
                💰
              </div>

              <h3 style={styles.emptyTitle}>
                No transactions yet
              </h3>

              <p style={styles.emptyText}>
                Your creator payments and withdrawals
                will appear here.
              </p>
            </div>
          ) : (
            <div style={styles.transactionList}>
              {transactions.map((transaction) => {
                const type = getTransactionType(transaction)
                const status = getStatus(transaction)
                const outgoing = isOutgoing(transaction)
                const amount = Math.abs(
                  Number(transaction.amount || 0)
                )

                return (
                  <div
                    key={transaction.id}
                    style={styles.transactionCard}
                  >
                    <div
                      style={{
                        ...styles.transactionIcon,
                        ...(outgoing
                          ? styles.withdrawalIcon
                          : styles.creditIcon),
                      }}
                    >
                      {outgoing ? '↗' : '↙'}
                    </div>

                    <div style={styles.transactionInfo}>
                      <div style={styles.transactionTop}>
                        <h3 style={styles.transactionTitle}>
                          {getDescription(transaction)}
                        </h3>

                        <span
                          style={{
                            ...styles.amount,
                            ...(outgoing
                              ? styles.outgoingAmount
                              : styles.incomingAmount),
                          }}
                        >
                          {outgoing ? '-' : '+'}
                          {formatNaira(amount)}
                        </span>
                      </div>

                      <div style={styles.transactionBottom}>
                        <span style={styles.transactionType}>
                          {type}
                        </span>

                        <span style={styles.dot}>
                          •
                        </span>

                        <span style={styles.date}>
                          {formatDate(transaction.createdAt)}
                        </span>

                        <span
                          style={{
                            ...styles.status,
                            ...getStatusStyle(status),
                          }}
                        >
                          {getStatusLabel(status)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Information */}
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>
            ℹ️
          </div>

          <div>
            <h3 style={styles.infoTitle}>
              About your wallet
            </h3>

            <p style={styles.infoText}>
              Your wallet balance represents funds that
              have actually been credited to your TajVid
              account.
            </p>

            <p style={styles.infoText}>
              Video views do not automatically create
              wallet funds. Creator payments are credited
              according to TajVid's monetization and reward
              system.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function getStatusStyle(status) {
  switch (status) {
    case 'pending':
      return {
        background: '#fff7ed',
        color: '#c2410c',
      }

    case 'processing':
      return {
        background: '#eff6ff',
        color: '#1d4ed8',
      }

    case 'failed':
      return {
        background: '#fef2f2',
        color: '#b91c1c',
      }

    case 'cancelled':
      return {
        background: '#f3f4f6',
        color: '#4b5563',
      }

    case 'paid':
    case 'completed':
    default:
      return {
        background: '#ecfdf5',
        color: '#047857',
      }
  }
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

  balanceCard: {
    background: '#111827',
    color: '#ffffff',
    borderRadius: '20px',
    padding: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '14px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  },

  balanceLabel: {
    margin: 0,
    color: '#d1d5db',
    fontSize: '14px',
  },

  balanceAmount: {
    margin: '7px 0',
    fontSize: '32px',
    fontWeight: '800',
  },

  balanceHint: {
    margin: 0,
    color: '#9ca3af',
    fontSize: '13px',
  },

  walletIcon: {
    width: '54px',
    height: '54px',
    borderRadius: '16px',
    background: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '25px',
    flexShrink: 0,
  },

  actions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '24px',
  },

  withdrawButton: {
    minHeight: '46px',
    borderRadius: '12px',
    background: '#111827',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    fontWeight: '700',
    fontSize: '14px',
  },

  earningsButton: {
    minHeight: '46px',
    borderRadius: '12px',
    background: '#ffffff',
    color: '#111827',
    border: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    fontWeight: '700',
    fontSize: '14px',
  },

  section: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '20px',
    marginBottom: '16px',
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '18px',
  },

  sectionTitle: {
    margin: 0,
    color: '#111827',
    fontSize: '18px',
  },

  sectionSubtitle: {
    margin: '5px 0 0',
    color: '#6b7280',
    fontSize: '13px',
  },

  transactionCount: {
    minWidth: '30px',
    height: '30px',
    padding: '0 8px',
    borderRadius: '15px',
    background: '#f3f4f6',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
  },

  transactionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  transactionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px',
    border: '1px solid #f0f0f0',
    borderRadius: '14px',
    background: '#ffffff',
  },

  transactionIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: '800',
    flexShrink: 0,
  },

  creditIcon: {
    background: '#ecfdf5',
    color: '#047857',
  },

  withdrawalIcon: {
    background: '#fff7ed',
    color: '#c2410c',
  },

  transactionInfo: {
    flex: 1,
    minWidth: 0,
  },

  transactionTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },

  transactionTitle: {
    margin: 0,
    color: '#111827',
    fontSize: '14px',
    fontWeight: '700',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  amount: {
    fontSize: '14px',
    fontWeight: '800',
    whiteSpace: 'nowrap',
  },

  incomingAmount: {
    color: '#047857',
  },

  outgoingAmount: {
    color: '#c2410c',
  },

  transactionBottom: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    flexWrap: 'wrap',
    marginTop: '6px',
  },

  transactionType: {
    color: '#6b7280',
    fontSize: '11px',
    fontWeight: '600',
  },

  dot: {
    color: '#d1d5db',
    fontSize: '11px',
  },

  date: {
    color: '#9ca3af',
    fontSize: '11px',
  },

  status: {
    marginLeft: 'auto',
    padding: '4px 8px',
    borderRadius: '7px',
    fontSize: '10px',
    fontWeight: '700',
  },

  infoCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '20px',
  },

  infoIcon: {
    fontSize: '21px',
    flexShrink: 0,
  },

  infoTitle: {
    margin: '0 0 8px',
    color: '#111827',
    fontSize: '16px',
  },

  infoText: {
    margin: '0 0 8px',
    color: '#6b7280',
    fontSize: '13px',
    lineHeight: 1.6,
  },

  errorBox: {
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '12px 14px',
    marginBottom: '16px',
    fontSize: '13px',
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

  emptyCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '35px 20px',
    textAlign: 'center',
  },

  emptyTransactions: {
    padding: '35px 15px',
    textAlign: 'center',
    borderRadius: '14px',
    background: '#fafafa',
  },

  emptyIcon: {
    fontSize: '30px',
    marginBottom: '10px',
  },

  emptyTitle: {
    margin: '0 0 7px',
    color: '#111827',
    fontSize: '17px',
  },

  emptyText: {
    margin: '0 0 18px',
    color: '#6b7280',
    fontSize: '13px',
    lineHeight: 1.5,
  },

  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '0 20px',
    borderRadius: '11px',
    background: '#111827',
    color: '#ffffff',
    textDecoration: 'none',
    fontWeight: '700',
    fontSize: '14px',
  },
}
