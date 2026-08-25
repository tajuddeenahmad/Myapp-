import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import {
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

function Withdraw() {
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)

  const [amount, setAmount] = useState('')
  const [bank, setBank] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

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

            setBalance(
              Number(data.walletBalance || 0)
            )
          }
        } catch (error) {
          console.error(
            'Wallet balance error:',
            error
          )

          setMessage(
            '❌ An samu matsala wajen karanta Wallet.'
          )
        } finally {
          setLoading(false)
        }
      }
    )

    return () => unsubscribe()
  }, [])

  async function handleWithdraw(event) {
    event.preventDefault()

    if (!user) {
      setMessage('❌ Da farko ka yi Login.')
      return
    }

    const requestedAmount = Number(amount)

    if (
      !requestedAmount ||
      requestedAmount <= 0
    ) {
      setMessage(
        '❌ Shigar da adadin kuɗin da ya dace.'
      )
      return
    }

    if (requestedAmount > balance) {
      setMessage(
        '❌ Ba ka da isasshen kuɗi a Wallet.'
      )
      return
    }

    if (
      !bank ||
      !accountName.trim() ||
      accountNumber.length !== 10
    ) {
      setMessage(
        '❌ Cika bayanan banki gaba ɗaya. Account number ya zama lambobi 10.'
      )
      return
    }

    setSubmitting(true)
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

      const userData = userSnap.data()

      const currentBalance = Number(
        userData.walletBalance || 0
      )

      if (requestedAmount > currentBalance) {
        throw new Error(
          'Ba ka da isasshen kuɗi a Wallet.'
        )
      }

      const transactionsRef = collection(
        db,
        'users',
        user.uid,
        'transactions'
      )

      await addDoc(transactionsRef, {
        uid: user.uid,
        amount: requestedAmount,
        bank,
        accountName: accountName.trim(),
        accountNumber,
        status: 'pending',
        createdAt: serverTimestamp(),
      })

      await updateDoc(userRef, {
        walletBalance:
          currentBalance - requestedAmount,
      })

      setBalance(
        currentBalance - requestedAmount
      )

      setAmount('')
      setBank('')
      setAccountName('')
      setAccountNumber('')

      setMessage(
        '✅ An karɓi withdrawal request ɗinka. Za a duba shi kafin biyan kuɗi.'
      )
    } catch (error) {
      console.error(
        'Withdrawal error:',
        error
      )

      setMessage(
        `❌ Withdrawal bai yi ba: ${error.message}`
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="withdraw-page">
        <h2>Ba ka shiga account ba</h2>
        <Link to="/login">Login</Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="withdraw-page">
        <h2>Loading Wallet...</h2>
      </div>
    )
  }

  return (
    <div className="withdraw-page">

      <header className="withdraw-header">
        <Link to="/wallet">
          ← Wallet
        </Link>

        <h2>💸 Withdraw</h2>
      </header>

      <main className="withdraw-content">

        <div className="withdraw-balance">
          <p>Available Balance</p>

          <h1>
            ₦{balance.toFixed(2)}
          </h1>
        </div>

        <form
          className="withdraw-form"
          onSubmit={handleWithdraw}
        >

          <label>
            Adadin da kake son cirewa
          </label>

          <input
            type="number"
            placeholder="Misali: 500"
            min="1"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            required
          />

          <label>Bank</label>

          <select
            value={bank}
            onChange={(e) =>
              setBank(e.target.value)
            }
            required
          >
            <option value="">
              Zaɓi banki
            </option>

            <option value="Access Bank">
              Access Bank
            </option>

            <option value="GTBank">
              GTBank
            </option>

            <option value="First Bank">
              First Bank
            </option>

            <option value="UBA">
              UBA
            </option>

            <option value="Zenith Bank">
              Zenith Bank
            </option>

            <option value="Opay">
              Opay
            </option>

            <option value="PalmPay">
              PalmPay
            </option>
          </select>

          <label>Account Name</label>

          <input
            type="text"
            placeholder="Sunan account"
            value={accountName}
            onChange={(e) =>
              setAccountName(e.target.value)
            }
            required
          />

          <label>Account Number</label>

          <input
            type="text"
            inputMode="numeric"
            maxLength="10"
            placeholder="XXXXXXXXXX"
            value={accountNumber}
            onChange={(e) =>
              setAccountNumber(
                e.target.value.replace(/\D/g, '')
              )
            }
            required
          />

          <button
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? '⏳ Sending...'
              : '💸 Request Withdrawal'}
          </button>

        </form>

        {message && (
          <div className="withdraw-message">
            {message}
          </div>
        )}

      </main>

    </div>
  )
}

export default Withdraw
