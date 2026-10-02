import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const BANKS = [
  'Access Bank',
  'GTBank',
  'First Bank',
  'UBA',
  'Zenith Bank',
  'Moniepoint',
  'OPay',
  'PalmPay',
  'Kuda Bank',
  'Other',
]

export default function Withdraw() {
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)

  const [amount, setAmount] = useState('')
  const [bank, setBank] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (!currentUser) {
        setBalance(0)
        setLoading(false)
        return
      }

      try {
        const userRef = doc(db, 'users', currentUser.uid)
        const snapshot = await getDoc(userRef)

        if (snapshot.exists()) {
          const data = snapshot.data()
          setBalance(Number(data.walletBalance || 0))
        } else {
          setBalance(0)
        }
      } catch (err) {
        console.error('Unable to load wallet:', err)
        setError('Unable to load your wallet balance.')
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const formatNaira = (value) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(Number(value || 0))
  }

  const handleAccountNumberChange = (event) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 10)
    setAccountNumber(value)
  }

  const handleAmountChange = (event) => {
    const value = event.target.value

    if (value === '') {
      setAmount('')
      return
    }

    if (!/^\d*\.?\d{0,2}$/.test(value)) {
      return
    }

    setAmount(value)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setMessage('')
    setError('')

    const numericAmount = Number(amount)

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a valid withdrawal amount.')
      return
    }

    if (numericAmount < 1000) {
      setError('Minimum withdrawal amount is ₦1,000.')
      return
    }

    if (numericAmount > balance) {
      setError('The requested amount is greater than your available balance.')
      return
    }

    if (!bank) {
      setError('Please select your bank.')
      return
    }

    if (!accountName.trim()) {
      setError('Please enter the account name.')
      return
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      setError('Account number must contain exactly 10 digits.')
      return
    }

    if (!user) {
      setError('Please log in again before requesting a withdrawal.')
      return
    }

    setSubmitting(true)

    try {
      /*
       * IMPORTANT:
       * This creates a withdrawal REQUEST only.
       *
       * It does NOT reduce walletBalance.
       * It does NOT mark the request as paid.
       * It does NOT send money to the bank.
       *
       * Real balance reservation and Flutterwave payout
       * will be handled by the secure backend later.
       */

      const withdrawalRef = collection(db, 'users', user.uid, 'transactions')

      await addDoc(withdrawalRef, {
        uid: user.uid,
        type: 'withdrawal',
        amount: numericAmount,
        bank,
        accountName: accountName.trim(),
        accountNumber,
        status: 'pending',
        description: 'Withdrawal request',
        createdAt: serverTimestamp(),
      })

      setAmount('')
      setBank('')
      setAccountName('')
      setAccountNumber('')

      setMessage(
        'Your withdrawal request has been submitted and is pending review.'
      )
    } catch (err) {
      console.error('Withdrawal request error:', err)

      setError(
        'Unable to submit your withdrawal request. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>Withdraw</h1>
            <p style={styles.subtitle}>
              Request a payment from your TajVid wallet.
            </p>
          </div>

          <div style={styles.card}>
            <div style={styles.icon}>🔐</div>

            <h2 style={styles.cardTitle}>
              Login required
            </h2>

            <p style={styles.cardText}>
              Please log in to request a withdrawal.
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
            <h1 style={styles.title}>Withdraw</h1>
          </div>

          <div style={styles.loadingCard}>
            <div style={styles.spinner} />
            <p>Loading wallet...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Withdraw</h1>
          <p style={styles.subtitle}>
            Request a payment from your TajVid wallet.
          </p>
        </div>

        {/* Balance */}
        <div style={styles.balanceCard}>
          <div>
            <p style={styles.balanceLabel}>
              Available Balance
            </p>

            <h2 style={styles.balanceAmount}>
              {formatNaira(balance)}
            </h2>
          </div>

          <div style={styles.balanceIcon}>
            💰
          </div>
        </div>

        {message && (
          <div style={styles.successBox}>
            <strong>Request submitted</strong>
            <p>{message}</p>
          </div>
        )}

        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {/* Form */}
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>
            Withdrawal Details
          </h2>

          <p style={styles.formSubtitle}>
            Minimum withdrawal amount is ₦1,000.
          </p>

          <form onSubmit={handleSubmit}>
            <label style={styles.label}>
              Amount
            </label>

            <div style={styles.inputWrapper}>
              <span style={styles.currency}>
                ₦
              </span>

              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={handleAmountChange}
                placeholder="Enter amount"
                style={styles.amountInput}
                disabled={submitting}
              />
            </div>

            <label style={styles.label}>
              Bank
            </label>

            <select
              value={bank}
              onChange={(event) => setBank(event.target.value)}
              style={styles.input}
              disabled={submitting}
            >
              <option value="">
                Select your bank
              </option>

              {BANKS.map((bankName) => (
                <option
                  key={bankName}
                  value={bankName}
                >
                  {bankName}
                </option>
              ))}
            </select>

            <label style={styles.label}>
              Account Name
            </label>

            <input
              type="text"
              value={accountName}
              onChange={(event) =>
                setAccountName(event.target.value)
              }
              placeholder="Enter account name"
              style={styles.input}
              disabled={submitting}
              autoComplete="name"
            />

            <label style={styles.label}>
              Account Number
            </label>

            <input
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={handleAccountNumberChange}
              placeholder="10-digit account number"
              style={styles.input}
              disabled={submitting}
              maxLength={10}
              autoComplete="off"
            />

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.submitButton,
                ...(submitting
                  ? styles.disabledButton
                  : {}),
              }}
            >
              {submitting
                ? 'Submitting...'
                : 'Request Withdrawal'}
            </button>
          </form>
        </div>

        {/* Important information */}
        <div style={styles.infoCard}>
          <div style={styles.infoIcon}>
            ℹ️
          </div>

          <div>
            <h3 style={styles.infoTitle}>
              Withdrawal process
            </h3>

            <p style={styles.infoText}>
              Your request will first be reviewed by
              TajVid. A pending request does not mean that
              money has already been sent.
            </p>

            <p style={styles.infoText}>
              Bank payments will be processed through the
              secure TajVid payment system after the
              withdrawal system is fully connected.
            </p>

            <p style={styles.warningText}>
              Never send your PIN, CVV, OTP, card number,
              or Flutterwave secret key through this form.
            </p>
          </div>
        </div>

        <div style={styles.footerLinks}>
          <Link to="/wallet" style={styles.link}>
            ← Back to Wallet
          </Link>

          <Link to="/earnings" style={styles.link}>
            View Earnings
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
    maxWidth: '700px',
    margin: '0 auto',
  },

  header: {
    marginBottom: '22px',
  },

  title: {
    margin: 0,
    fontSize: '30px',
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    margin: '7px 0 0',
    color: '#6b7280',
    fontSize: '14px',
  },

  balanceCard: {
    background: '#111827',
    color: '#ffffff',
    borderRadius: '20px',
    padding: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '15px',
    marginBottom: '16px',
  },

  balanceLabel: {
    margin: 0,
    color: '#d1d5db',
    fontSize: '13px',
  },

  balanceAmount: {
    margin: '7px 0 0',
    fontSize: '30px',
    fontWeight: '800',
  },

  balanceIcon: {
    width: '52px',
    height: '52px',
    borderRadius: '15px',
    background: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '23px',
  },

  successBox: {
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    borderRadius: '13px',
    padding: '14px',
    marginBottom: '16px',
    fontSize: '13px',
  },

  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    borderRadius: '13px',
    padding: '14px',
    marginBottom: '16px',
    fontSize: '13px',
  },

  successBoxP: {
    margin: '5px 0 0',
  },

  formCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '20px',
    padding: '22px',
    marginBottom: '16px',
  },

  formTitle: {
    margin: 0,
    color: '#111827',
    fontSize: '19px',
  },

  formSubtitle: {
    margin: '6px 0 22px',
    color: '#6b7280',
    fontSize: '13px',
  },

  label: {
    display: 'block',
    marginBottom: '7px',
    marginTop: '16px',
    color: '#374151',
    fontSize: '13px',
    fontWeight: '700',
  },

  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    overflow: 'hidden',
    background: '#ffffff',
  },

  currency: {
    paddingLeft: '14px',
    color: '#6b7280',
    fontSize: '16px',
    fontWeight: '700',
  },

  amountInput: {
    width: '100%',
    border: 0,
    outline: 'none',
    padding: '13px 12px',
    fontSize: '15px',
    background: 'transparent',
    boxSizing: 'border-box',
  },

  input: {
    width: '100%',
    minHeight: '46px',
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    outline: 'none',
    padding: '0 13px',
    fontSize: '14px',
    background: '#ffffff',
    color: '#111827',
    boxSizing: 'border-box',
  },

  submitButton: {
    width: '100%',
    minHeight: '48px',
    marginTop: '24px',
    border: 0,
    borderRadius: '12px',
    background: '#111827',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '800',
    cursor: 'pointer',
  },

  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },

  infoCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '20px',
    marginBottom: '16px',
  },

  infoIcon: {
    fontSize: '21px',
    flexShrink: 0,
  },

  infoTitle: {
    margin: '0 0 8px',
    fontSize: '16px',
    color: '#111827',
  },

  infoText: {
    margin: '0 0 9px',
    color: '#6b7280',
    fontSize: '13px',
    lineHeight: 1.6,
  },

  warningText: {
    margin: 0,
    color: '#b45309',
    fontSize: '12px',
    lineHeight: 1.5,
    fontWeight: '600',
  },

  footerLinks: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '15px',
    flexWrap: 'wrap',
  },

  link: {
    color: '#111827',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '700',
  },

  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '18px',
    padding: '30px 20px',
    textAlign: 'center',
  },

  icon: {
    fontSize: '32px',
    marginBottom: '10px',
  },

  cardTitle: {
    margin: '0 0 7px',
    color: '#111827',
  },

  cardText: {
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
    borderRadius: '11px',
    background: '#111827',
    color: '#ffffff',
    textDecoration: 'none',
    fontWeight: '700',
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
    color: '#6b7280',
  },

  spinner: {
    width: '30px',
    height: '30px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #111827',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
}
