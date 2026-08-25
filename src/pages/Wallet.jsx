import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

function Wallet() {
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribeUser = null
    let unsubscribeTransactions = null

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser)

        if (!currentUser) {
          setBalance(0)
          setTransactions([])
          setLoading(false)
          return
        }

        const userRef = doc(
          db,
          'users',
          currentUser.uid
        )

        unsubscribeUser = onSnapshot(
          userRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data()

              setBalance(
                Number(data.walletBalance || 0)
              )
            } else {
              setBalance(0)
            }

            setLoading(false)
          },
          (error) => {
            console.error(
              'Wallet balance error:',
              error
            )

            setLoading(false)
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

        unsubscribeTransactions =
          onSnapshot(
            transactionsQuery,
            (snapshot) => {
              const list =
                snapshot.docs.map(
                  (item) => ({
                    id: item.id,
                    ...item.data(),
                  })
                )

              setTransactions(list)
            },
            (error) => {
              console.error(
                'Transactions error:',
                error
              )
            }
          )
      }
    )

    return () => {
      unsubscribeAuth()

      if (unsubscribeUser) {
        unsubscribeUser()
      }

      if (unsubscribeTransactions) {
        unsubscribeTransactions()
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="wallet-page">
        <h2>Loading Wallet...</h2>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="wallet-page">
        <h2>Ba ka shiga account ba</h2>

        <Link to="/login">
          Login
        </Link>
      </div>
    )
  }

  return (
    <div className="wallet-page">

      <header className="wallet-header">

        <Link to="/profile">
          ← Profile
        </Link>

        <h2>💰 Wallet</h2>

      </header>

      <main className="wallet-content">

        <div className="balance-card">

          <p>
            Available Balance
          </p>

          <h1>
            ₦{balance.toFixed(2)}
          </h1>

          <small>
            TajVid Wallet
          </small>

        </div>

        <Link
          to="/withdraw"
          className="withdraw-button"
        >
          💸 Withdraw
        </Link>

        <section className="transactions">

          <h2>
            📜 Transaction History
          </h2>

          {transactions.length === 0 ? (

            <div className="empty-wallet">

              <div>💰</div>

              <p>
                Babu transaction tukuna.
              </p>

            </div>

          ) : (

            transactions.map(
              (transaction) => {

                const status =
                  transaction.status ||
                  'pending'

                return (
                  <div
                    className="transaction-item"
                    key={transaction.id}
                  >

                    <div>

                      <strong>
                        💸 Withdrawal
                      </strong>

                      <p>
                        {transaction.bank ||
                          'Bank'}
                      </p>

                      <small>
                        {transaction.accountName ||
                          ''}
                      </small>

                    </div>

                    <div>

                      <strong>
                        ₦
                        {Number(
                          transaction.amount ||
                            0
                        ).toFixed(2)}
                      </strong>

                      <p className="pending">
                        {status === 'pending'
                          ? '🟡 Pending'
                          : status === 'paid'
                            ? '✅ Paid'
                            : status === 'failed'
                              ? '❌ Failed'
                              : status}
                      </p>

                    </div>

                  </div>
                )
              }
            )

          )}

        </section>

      </main>

      <nav className="bottom-nav">

        <Link to="/">
          🏠 Home
        </Link>

        <Link to="/post">
          ➕ Post
        </Link>

        <Link to="/profile">
          👤 Profile
        </Link>

      </nav>

    </div>
  )
}

export default Wallet
