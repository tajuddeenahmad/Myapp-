import { useEffect, useMemo, useState } from 'react'
import { collection, collectionGroup, doc, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { db, auth } from '../lib/firebase'

const money = (value = 0) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const number = (value = 0) =>
  new Intl.NumberFormat('en-NG').format(Number(value) || 0)

const dateText = (value) => {
  if (!value) return '—'

  try {
    const date = value?.toDate ? value.toDate() : new Date(value)

    if (Number.isNaN(date.getTime())) return '—'

    return date.toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

const statusClass = (status = '') => {
  const value = String(status).toLowerCase()

  if (value === 'completed' || value === 'paid') return 'success'
  if (value === 'failed' || value === 'cancelled') return 'danger'
  if (value === 'processing') return 'processing'

  return 'pending'
}

export default function Admin() {
  const [user, setUser] = useState(null)
  const [adminUser, setAdminUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  const [users, setUsers] = useState([])
  const [payments, setPayments] = useState([])
  const [posts, setPosts] = useState([])
  const [transactions, setTransactions] = useState([])

  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      setLoading(true)
      setError('')

      if (!currentUser) {
        setAuthorized(false)
        setAdminUser(null)
        setLoading(false)
        return
      }

      try {
        const adminRef = doc(db, 'users', currentUser.uid)
        const adminSnap = await getDoc(adminRef)

        if (!adminSnap.exists()) {
          setAuthorized(false)
          setAdminUser(null)
          setLoading(false)
          return
        }

        const adminData = adminSnap.data()

        if (adminData.role !== 'admin') {
          setAuthorized(false)
          setAdminUser(adminData)
          setLoading(false)
          return
        }

        setAuthorized(true)
        setAdminUser(adminData)
        setLoading(false)
      } catch (err) {
        console.error(err)
        setError('Unable to verify admin access.')
        setAuthorized(false)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!authorized) return undefined

    const unsubscribers = []

    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'))

    unsubscribers.push(
      onSnapshot(
        usersQuery,
        (snapshot) => {
          setUsers(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }))
          )
        },
        (err) => {
          console.error('Users:', err)
          setError('Some user data could not be loaded.')
        }
      )
    )

    const postsQuery = query(collection(db, 'posts'))

    unsubscribers.push(
      onSnapshot(
        postsQuery,
        (snapshot) => {
          setPosts(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }))
          )
        },
        (err) => {
          console.error('Posts:', err)
        }
      )
    )

    const paymentQuery = query(
      collectionGroup(db, 'transactions'),
      orderBy('createdAt', 'desc')
    )

    unsubscribers.push(
      onSnapshot(
        paymentQuery,
        (snapshot) => {
          setTransactions(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }))
          )
        },
        (err) => {
          console.error('Transactions:', err)
          setError(
            'Transaction history could not be loaded. Check your Firestore index/rules.'
          )
        }
      )
    )

    const withdrawalQuery = query(
      collection(db, 'withdrawals'),
      orderBy('createdAt', 'desc')
    )

    unsubscribers.push(
      onSnapshot(
        withdrawalQuery,
        (snapshot) => {
          setPayments(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }))
          )
        },
        (err) => {
          console.error('Withdrawals:', err)
        }
      )
    )

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [authorized])

  const stats = useMemo(() => {
    const totalRevenue = users.reduce(
      (sum, item) =>
        sum +
        Number(
          item.totalRevenue ??
            item.adRevenue ??
            item.ownerRevenue ??
            0
        ),
      0
    )

    const ownerBalance = Number(
      adminUser?.ownerBalance ??
        adminUser?.walletBalance ??
        0
    )

    const totalPaid = users.reduce(
      (sum, item) => sum + Number(item.totalPaid ?? 0),
      0
    )

    const pendingPayments = transactions.filter((item) => {
      const status = String(item.status || '').toLowerCase()
      return (
        item.type === 'withdrawal' &&
        ['pending', 'processing'].includes(status)
      )
    })

    const pendingAmount = pendingPayments.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    )

    const completedPayments = transactions.filter((item) => {
      const status = String(item.status || '').toLowerCase()
      return (
        item.type === 'withdrawal' &&
        ['completed', 'paid'].includes(status)
      )
    })

    const completedAmount = completedPayments.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    )

    const totalViews = posts.reduce(
      (sum, item) => sum + Number(item.views || 0),
      0
    )

    const adImpressions = Number(
      adminUser?.adImpressions ??
        adminUser?.totalAdImpressions ??
        0
    )

    const estimatedAdMobRevenue = Number(
      adminUser?.estimatedAdMobRevenue ??
        adminUser?.adMobRevenue ??
        0
    )

    return {
      totalRevenue,
      ownerBalance,
      totalPaid,
      pendingAmount,
      completedAmount,
      totalViews,
      adImpressions,
      estimatedAdMobRevenue,
      pendingCount: pendingPayments.length,
    }
  }, [users, posts, transactions, adminUser])

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0
        const bTime = b.createdAt?.toMillis?.() || 0
        return bTime - aTime
      })
      .slice(0, 10)
  }, [transactions])

  const pendingRequests = useMemo(() => {
    return transactions
      .filter((item) => {
        const status = String(item.status || '').toLowerCase()

        return (
          item.type === 'withdrawal' &&
          ['pending', 'processing'].includes(status)
        )
      })
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0
        const bTime = b.createdAt?.toMillis?.() || 0
        return bTime - aTime
      })
  }, [transactions])

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.loader} />
        <p>Loading Admin Dashboard...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={styles.center}>
        <h2>Login Required</h2>
        <p>Please login with your TajVid account.</p>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div style={styles.center}>
        <div style={styles.lock}>🔒</div>
        <h2>Admin Access Only</h2>
        <p>This page is only available to the TajVid owner/admin.</p>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>TAJVID OWNER PANEL</p>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <p style={styles.subtitle}>
            Manage revenue, users, creator payments and platform activity.
          </p>
        </div>

        <div style={styles.adminBadge}>
          <span>●</span> Admin
        </div>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.notice}>
        <strong>Payment security:</strong>
        <span>
          User payments are not marked as completed from this dashboard.
          Real bank payouts will be confirmed by the secure backend/Flutterwave
          integration.
        </span>
      </div>

      <section style={styles.grid}>
        <StatCard
          icon="💰"
          title="Total Revenue"
          value={money(stats.totalRevenue)}
          text="Recorded platform revenue"
        />

        <StatCard
          icon="🏦"
          title="Owner Balance"
          value={money(stats.ownerBalance)}
          text="Current owner balance"
        />

        <StatCard
          icon="💸"
          title="Total Paid"
          value={money(stats.totalPaid)}
          text="Creator/user payments"
        />

        <StatCard
          icon="⏳"
          title="Pending Payments"
          value={money(stats.pendingAmount)}
          text={`${stats.pendingCount} pending request(s)`}
        />

        <StatCard
          icon="📈"
          title="Available to Pay"
          value={money(
            Math.max(
              stats.ownerBalance - stats.pendingAmount,
              0
            )
          )}
          text="Owner balance after pending requests"
        />

        <StatCard
          icon="👥"
          title="Users"
          value={number(users.length)}
          text="Registered TajVid users"
        />

        <StatCard
          icon="▶️"
          title="Video Views"
          value={number(stats.totalViews)}
          text="Total views recorded"
        />

        <StatCard
          icon="📢"
          title="Ad Impressions"
          value={number(stats.adImpressions)}
          text="AdMob data when connected"
        />
      </section>

      <section style={styles.revenueBox}>
        <div>
          <p style={styles.sectionLabel}>AD REVENUE</p>
          <h2 style={styles.sectionTitle}>AdMob Revenue</h2>
          <p style={styles.muted}>
            This value will become live after the secure AdMob/backend
            reporting connection is completed.
          </p>
        </div>

        <div style={styles.bigMoney}>
          {money(stats.estimatedAdMobRevenue)}
        </div>
      </section>

      <section style={styles.twoColumns}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.sectionLabel}>PAYMENTS</p>
              <h2 style={styles.cardTitle}>Pending Requests</h2>
            </div>

            <span style={styles.countBadge}>
              {pendingRequests.length}
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>✓</div>
              <p>No pending payment requests.</p>
            </div>
          ) : (
            <div style={styles.list}>
              {pendingRequests.map((item) => (
                <PaymentRow
                  key={item.id}
                  item={item}
                />
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <p style={styles.sectionLabel}>USERS</p>
              <h2 style={styles.cardTitle}>Creator Accounts</h2>
            </div>

            <span style={styles.countBadge}>
              {users.length}
            </span>
          </div>

          {users.length === 0 ? (
            <div style={styles.empty}>
              <p>No users found.</p>
            </div>
          ) : (
            <div style={styles.list}>
              {users.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  style={styles.userRow}
                >
                  <div style={styles.avatar}>
                    {(item.displayName ||
                      item.name ||
                      item.email ||
                      'U')
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div style={{ flex: 1 }}>
                    <strong style={styles.userName}>
                      {item.displayName ||
                        item.name ||
                        'TajVid User'}
                    </strong>

                    <div style={styles.smallText}>
                      {item.email || item.id}
                    </div>
                  </div>

                  <div style={styles.userBalance}>
                    {money(
                      item.walletBalance ??
                        item.creatorEarnings ??
                        item.earnings ??
                        0
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <p style={styles.sectionLabel}>HISTORY</p>
            <h2 style={styles.cardTitle}>Recent Transactions</h2>
          </div>

          <span style={styles.countBadge}>
            {recentTransactions.length}
          </span>
        </div>

        {recentTransactions.length === 0 ? (
          <div style={styles.empty}>
            <p>No transactions yet.</p>
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>

              <tbody>
                {recentTransactions.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>
                      {item.type || 'Transaction'}
                    </td>

                    <td style={styles.td}>
                      {item.uid || '—'}
                    </td>

                    <td style={styles.td}>
                      {money(item.amount)}
                    </td>

                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.status,
                          ...statusStyles[statusClass(item.status)],
                        }}
                      >
                        {item.status || 'pending'}
                      </span>
                    </td>

                    <td style={styles.td}>
                      {dateText(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={styles.footerCard}>
        <div style={styles.footerIcon}>🔐</div>

        <div>
          <h3 style={styles.footerTitle}>
            Secure Payment Architecture
          </h3>

          <p style={styles.muted}>
            TajVid owner funds stay separate from creator rewards.
            Flutterwave secret keys must remain on the server and never inside
            the Android app or React frontend.
          </p>
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon, title, value, text }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTop}>
        <div style={styles.statIcon}>{icon}</div>
        <span style={styles.statDot}>●</span>
      </div>

      <p style={styles.statTitle}>{title}</p>
      <h2 style={styles.statValue}>{value}</h2>
      <p style={styles.statText}>{text}</p>
    </div>
  )
}

function PaymentRow({ item }) {
  return (
    <div style={styles.paymentRow}>
      <div style={styles.paymentIcon}>₦</div>

      <div style={{ flex: 1 }}>
        <strong style={styles.userName}>
          {item.accountName || 'Payment Request'}
        </strong>

        <div style={styles.smallText}>
          {item.bank || 'Bank'} • {item.accountNumber || '—'}
        </div>

        <div style={styles.smallText}>
          {dateText(item.createdAt)}
        </div>
      </div>

      <div style={styles.paymentRight}>
        <strong>{money(item.amount)}</strong>

        <span
          style={{
            ...styles.status,
            ...statusStyles[statusClass(item.status)],
          }}
        >
          {item.status || 'pending'}
        </span>
      </div>
    </div>
  )
}

const statusStyles = {
  success: {
    background: '#dcfce7',
    color: '#166534',
  },
  danger: {
    background: '#fee2e2',
    color: '#991b1b',
  },
  processing: {
    background: '#dbeafe',
    color: '#1d4ed8',
  },
  pending: {
    background: '#fef3c7',
    color: '#92400e',
  },
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '24px',
    background: '#f5f7fb',
    color: '#111827',
    boxSizing: 'border-box',
  },

  header: {
    maxWidth: '1200px',
    margin: '0 auto 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
  },

  eyebrow: {
    margin: 0,
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '1.5px',
    color: '#2563eb',
  },

  title: {
    margin: '6px 0',
    fontSize: '30px',
    fontWeight: 800,
  },

  subtitle: {
    margin: 0,
    color: '#6b7280',
    fontSize: '14px',
  },

  adminBadge: {
    padding: '9px 14px',
    borderRadius: '999px',
    background: '#111827',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },

  error: {
    maxWidth: '1200px',
    margin: '0 auto 16px',
    padding: '12px 14px',
    borderRadius: '12px',
    background: '#fee2e2',
    color: '#991b1b',
    fontSize: '13px',
  },

  notice: {
    maxWidth: '1200px',
    margin: '0 auto 20px',
    padding: '14px 16px',
    borderRadius: '14px',
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    color: '#9a3412',
    fontSize: '13px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  grid: {
    maxWidth: '1200px',
    margin: '0 auto 22px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
  },

  statCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '18px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
  },

  statTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#eff6ff',
    fontSize: '20px',
  },

  statDot: {
    color: '#22c55e',
    fontSize: '9px',
  },

  statTitle: {
    margin: '15px 0 4px',
    color: '#6b7280',
    fontSize: '13px',
  },

  statValue: {
    margin: 0,
    fontSize: '23px',
    fontWeight: 800,
  },

  statText: {
    margin: '5px 0 0',
    color: '#9ca3af',
    fontSize: '11px',
  },

  revenueBox: {
    maxWidth: '1200px',
    margin: '0 auto 22px',
    padding: '22px',
    borderRadius: '18px',
    background: '#111827',
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
  },

  sectionLabel: {
    margin: 0,
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '1.2px',
    color: '#6b7280',
  },

  sectionTitle: {
    margin: '5px 0',
    fontSize: '20px',
  },

  bigMoney: {
    fontSize: '30px',
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },

  twoColumns: {
    maxWidth: '1200px',
    margin: '0 auto 22px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '18px',
  },

  card: {
    maxWidth: '1200px',
    margin: '0 auto 22px',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '18px',
    boxSizing: 'border-box',
    boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },

  cardTitle: {
    margin: '4px 0 0',
    fontSize: '19px',
  },

  countBadge: {
    minWidth: '28px',
    height: '28px',
    padding: '0 8px',
    borderRadius: '999px',
    background: '#eff6ff',
    color: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 800,
    boxSizing: 'border-box',
  },

  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  paymentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
    padding: '12px',
    borderRadius: '13px',
    background: '#f9fafb',
  },

  paymentIcon: {
    width: '38px',
    height: '38px',
    flexShrink: 0,
    borderRadius: '11px',
    background: '#ecfdf5',
    color: '#15803d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
  },

  paymentRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '5px',
  },

  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
    padding: '11px',
    borderRadius: '13px',
    background: '#f9fafb',
  },

  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: '#e0e7ff',
    color: '#3730a3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
  },

  userName: {
    fontSize: '13px',
    display: 'block',
  },

  smallText: {
    marginTop: '3px',
    color: '#9ca3af',
    fontSize: '10px',
    wordBreak: 'break-word',
  },

  userBalance: {
    fontWeight: 800,
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },

  status: {
    display: 'inline-flex',
    padding: '4px 8px',
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'capitalize',
  },

  tableWrap: {
    width: '100%',
    overflowX: 'auto',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '650px',
  },

  th: {
    textAlign: 'left',
    padding: '11px',
    borderBottom: '1px solid #e5e7eb',
    color: '#6b7280',
    fontSize: '11px',
    textTransform: 'uppercase',
  },

  td: {
    padding: '12px 11px',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '12px',
  },

  empty: {
    padding: '30px 10px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '13px',
  },

  emptyIcon: {
    width: '42px',
    height: '42px',
    margin: '0 auto 8px',
    borderRadius: '50%',
    background: '#dcfce7',
    color: '#15803d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
  },

  footerCard: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '18px',
    borderRadius: '18px',
    background: '#fff',
    border: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
  },

  footerIcon: {
    fontSize: '24px',
  },

  footerTitle: {
    margin: '0 0 5px',
    fontSize: '15px',
  },

  muted: {
    margin: 0,
    color: '#9ca3af',
    fontSize: '12px',
    lineHeight: 1.6,
  },

  center: {
    minHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '30px',
    color: '#374151',
  },

  lock: {
    fontSize: '45px',
    marginBottom: '10px',
  },

  loader: {
    width: '35px',
    height: '35px',
    borderRadius: '50%',
    border: '4px solid #e5e7eb',
    borderTopColor: '#2563eb',
    animation: 'spin 1s linear infinite',
    marginBottom: '12px',
  },
}
