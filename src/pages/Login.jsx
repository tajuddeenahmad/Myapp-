import { useEffect, useRef, useState } from 'react'
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

import { auth, db } from '../lib/firebase'
import { saveFcmTokenForUser } from '../lib/notifications'

function Login() {
  const navigate = useNavigate()

  const [loginMethod, setLoginMethod] = useState('email')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] =
    useState('')

  const [showPassword, setShowPassword] =
    useState(false)

  const [confirmationResult, setConfirmationResult] =
    useState(null)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const recaptchaVerifier = useRef(null)

  const countries = [
    { name: 'Nigeria', code: '+234' },
    { name: 'Ghana', code: '+233' },
    { name: 'Kenya', code: '+254' },
    { name: 'South Africa', code: '+27' },
    { name: 'United States', code: '+1' },
    { name: 'United Kingdom', code: '+44' },
    { name: 'Canada', code: '+1' },
    { name: 'India', code: '+91' },
  ]

  const [countryCode, setCountryCode] =
    useState('+234')

  useEffect(() => {
    return () => {
      if (recaptchaVerifier.current) {
        try {
          recaptchaVerifier.current.clear()
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }, [])

  async function ensureUserProfile(user) {
    if (!user) return

    const userRef = doc(db, 'users', user.uid)
    const existing = await getDoc(userRef)

    const existingData = existing.exists()
      ? existing.data()
      : {}

    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email || null,
        phoneNumber: user.phoneNumber || null,

        username:
          existingData.username ||
          user.displayName ||
          '',

        role: existingData.role || 'user',

        bio: existingData.bio || '',

        followers:
          existingData.followers || 0,

        following:
          existingData.following || 0,

        likes:
          existingData.likes || 0,

        walletBalance:
          existingData.walletBalance || 0,

        earnings:
          existingData.earnings || 0,

        totalViews:
          existingData.totalViews || 0,

        createdAt:
          existingData.createdAt ||
          serverTimestamp(),

        lastLogin:
          serverTimestamp(),
      },
      {
        merge: true,
      }
    )
  }

  async function finishLogin(user) {
  await ensureUserProfile(user)

  localStorage.setItem(
    'tajvid_user',
    JSON.stringify({
      uid: user.uid,
    })
  )

  await saveFcmTokenForUser(user)

  navigate('/profile', {
    replace: true,
  })
}
  async function handleEmailLogin(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    const cleanEmail = email.trim()

    if (!cleanEmail) {
      setError('Please enter your email address.')
      return
    }

    if (!password) {
      setError('Please enter your password.')
      return
    }

    try {
      setLoading(true)

      const result =
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        )

      await finishLogin(result.user)
    } catch (err) {
      console.error(err)

      if (
        err.code ===
        'auth/invalid-credential'
      ) {
        setError(
          'Incorrect email or password.'
        )
      } else if (
        err.code ===
        'auth/user-not-found'
      ) {
        setError(
          'No account was found with this email.'
        )
      } else if (
        err.code ===
        'auth/wrong-password'
      ) {
        setError(
          'Incorrect password.'
        )
      } else if (
        err.code ===
        'auth/too-many-requests'
      ) {
        setError(
          'Too many attempts. Please try again later.'
        )
      } else {
        setError(
          err.message ||
            'Login failed. Please try again.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    setError('')
    setMessage('')

    const cleanEmail = email.trim()

    if (!cleanEmail) {
      setError(
        'Enter your email address first.'
      )
      return
    }

    try {
      setLoading(true)

      await sendPasswordResetEmail(
        auth,
        cleanEmail
      )

      setMessage(
        'Password reset email sent. Check your Gmail inbox and spam folder.'
      )
    } catch (err) {
      console.error(err)

      if (
        err.code ===
        'auth/user-not-found'
      ) {
        setError(
          'No account was found with this email.'
        )
      } else if (
        err.code ===
        'auth/invalid-email'
      ) {
        setError(
          'Please enter a valid email address.'
        )
      } else {
        setError(
          err.message ||
            'Could not send password reset email.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    setMessage('')

    try {
      setLoading(true)

      const provider =
        new GoogleAuthProvider()

      provider.setCustomParameters({
        prompt: 'select_account',
      })

      const result =
        await signInWithPopup(
          auth,
          provider
        )

      await finishLogin(result.user)
    } catch (err) {
      console.error(err)

      setError(
        err.message ||
          'Google login failed.'
      )
    } finally {
      setLoading(false)
    }
  }

  function setupRecaptcha() {
    if (recaptchaVerifier.current) {
      return recaptchaVerifier.current
    }

    recaptchaVerifier.current =
      new RecaptchaVerifier(
        auth,
        'login-recaptcha',
        {
          size: 'normal',
        }
      )

    return recaptchaVerifier.current
  }

  async function handleSendOTP() {
    setError('')
    setMessage('')

    const cleanPhone =
      phoneNumber.trim()

    if (!cleanPhone) {
      setError(
        'Please enter your phone number.'
      )
      return
    }

    try {
      setLoading(true)

      const verifier =
        setupRecaptcha()

      const fullPhoneNumber =
        `${countryCode}${cleanPhone.replace(/^0+/, '')}`

      const result =
        await signInWithPhoneNumber(
          auth,
          fullPhoneNumber,
          verifier
        )

      setConfirmationResult(result)

      setMessage(
        'Verification code sent to your phone.'
      )
    } catch (err) {
      console.error(err)

      if (recaptchaVerifier.current) {
        try {
          recaptchaVerifier.current.clear()
        } catch {
          // Ignore cleanup errors
        }

        recaptchaVerifier.current = null
      }

      setError(
        err.message ||
          'Could not send verification code.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    if (!confirmationResult) {
      setError(
        'Please request a verification code first.'
      )
      return
    }

    if (!verificationCode.trim()) {
      setError(
        'Please enter the verification code.'
      )
      return
    }

    try {
      setLoading(true)

      const result =
        await confirmationResult.confirm(
          verificationCode.trim()
        )

      await finishLogin(result.user)
    } catch (err) {
      console.error(err)

      setError(
        err.message ||
          'Invalid verification code.'
      )
    } finally {
      setLoading(false)
    }
  }

  function switchMethod(method) {
    setLoginMethod(method)
    setError('')
    setMessage('')
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoCircle}>
          TV
        </div>

        <h1 style={styles.title}>
          Welcome to TajVid
        </h1>

        <p style={styles.subtitle}>
          Login to continue
        </p>

        <div style={styles.tabs}>
          <button
            type="button"
            onClick={() =>
              switchMethod('email')
            }
            style={{
              ...styles.tab,
              ...(loginMethod === 'email'
                ? styles.activeTab
                : {}),
            }}
          >
            Email
          </button>

          <button
            type="button"
            onClick={() =>
              switchMethod('phone')
            }
            style={{
              ...styles.tab,
              ...(loginMethod === 'phone'
                ? styles.activeTab
                : {}),
            }}
          >
            Phone
          </button>
        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {message && (
          <div style={styles.success}>
            {message}
          </div>
        )}

        {loginMethod === 'email' && (
          <form
            onSubmit={handleEmailLogin}
          >
            <label style={styles.label}>
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your email"
              autoComplete="email"
              style={styles.input}
            />

            <label style={styles.label}>
              Password
            </label>

            <div style={styles.passwordBox}>
              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{
                  ...styles.passwordInput,
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                style={
                  styles.eyeButton
                }
              >
                {showPassword
                  ? '🙈'
                  : '👁️'}
              </button>
            </div>

            <button
              type="button"
              onClick={
                handleForgotPassword
              }
              disabled={loading}
              style={
                styles.forgotButton
              }
            >
              Forgot password?
            </button>

            <button
              type="submit"
              disabled={loading}
              style={styles.loginButton}
            >
              {loading
                ? 'Logging in...'
                : 'Login'}
            </button>
          </form>
        )}

        {loginMethod === 'phone' && (
          <form
            onSubmit={
              confirmationResult
                ? handleVerifyOTP
                : (event) => {
                    event.preventDefault()
                    handleSendOTP()
                  }
            }
          >
            <label style={styles.label}>
              Country
            </label>

            <select
              value={countryCode}
              onChange={(event) =>
                setCountryCode(
                  event.target.value
                )
              }
              style={styles.input}
            >
              {countries.map(
                (country) => (
                  <option
                    key={`${country.name}-${country.code}`}
                    value={country.code}
                  >
                    {country.name}{' '}
                    {country.code}
                  </option>
                )
              )}
            </select>

            <label style={styles.label}>
              Phone number
            </label>

            <input
              type="tel"
              value={phoneNumber}
              onChange={(event) =>
                setPhoneNumber(
                  event.target.value
                )
              }
              placeholder="8012345678"
              autoComplete="tel"
              style={styles.input}
            />

            {!confirmationResult ? (
              <button
                type="submit"
                disabled={loading}
                style={styles.loginButton}
              >
                {loading
                  ? 'Sending code...'
                  : 'Send verification code'}
              </button>
            ) : (
              <>
                <label
                  style={styles.label}
                >
                  Verification code
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    verificationCode
                  }
                  onChange={(event) =>
                    setVerificationCode(
                      event.target.value
                    )
                  }
                  placeholder="Enter 6-digit code"
                  style={styles.input}
                />

                <button
                  type="submit"
                  disabled={loading}
                  style={
                    styles.loginButton
                  }
                >
                  {loading
                    ? 'Verifying...'
                    : 'Verify & Login'}
                </button>
              </>
            )}

            <div
              id="login-recaptcha"
              style={
                styles.recaptcha
              }
            />
          </form>
        )}

        <div style={styles.divider}>
          <span>OR</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={styles.googleButton}
        >
          <span style={styles.googleIcon}>
            G
          </span>

          {loading
            ? 'Please wait...'
            : 'Continue with Google'}
        </button>

        <p style={styles.registerText}>
          Don't have an account?
        </p>

        <button
          type="button"
          onClick={() =>
            navigate('/register')
          }
          style={
            styles.registerButton
          }
        >
          Create an account
        </button>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    boxSizing: 'border-box',
    padding: '24px 16px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    background:
      'linear-gradient(135deg, #0f172a, #111827)',
    color: '#ffffff',
  },

  card: {
    width: '100%',
    maxWidth: '430px',
    boxSizing: 'border-box',
    padding: '28px 22px',
    borderRadius: '22px',
    background: '#172033',
    border: '1px solid #263248',
    boxShadow:
      '0 20px 60px rgba(0,0,0,0.35)',
  },

  logoCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    margin: '0 auto 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#2563eb',
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '800',
  },

  title: {
    margin: '0',
    textAlign: 'center',
    fontSize: '26px',
    fontWeight: '800',
  },

  subtitle: {
    margin:
      '8px 0 24px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '15px',
  },

  tabs: {
    display: 'grid',
    gridTemplateColumns:
      '1fr 1fr',
    gap: '8px',
    marginBottom: '20px',
    padding: '5px',
    background: '#0f172a',
    borderRadius: '12px',
  },

  tab: {
    minHeight: '44px',
    border: 'none',
    borderRadius: '9px',
    background: 'transparent',
    color: '#9ca3af',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
  },

  activeTab: {
    background: '#2563eb',
    color: '#ffffff',
  },

  label: {
    display: 'block',
    margin:
      '14px 0 7px',
    color: '#e5e7eb',
    fontSize: '14px',
    fontWeight: '600',
  },

  input: {
    width: '100%',
    minHeight: '48px',
    boxSizing: 'border-box',
    padding: '0 14px',
    borderRadius: '11px',
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#ffffff',
    outline: 'none',
    fontSize: '16px',
  },

  passwordBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },

  passwordInput: {
    width: '100%',
    minHeight: '48px',
    boxSizing: 'border-box',
    padding:
      '0 52px 0 14px',
    borderRadius: '11px',
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#ffffff',
    outline: 'none',
    fontSize: '16px',
  },

  eyeButton: {
    position: 'absolute',
    right: '4px',
    top: '4px',
    width: '44px',
    height: '40px',
    border: 'none',
    borderRadius: '9px',
    background:
      'transparent',
    color: '#ffffff',
    fontSize: '20px',
    cursor: 'pointer',
  },

  forgotButton: {
    display: 'block',
    margin:
      '10px 0 16px auto',
    border: 'none',
    background: 'transparent',
    color: '#60a5fa',
    fontSize: '14px',
    cursor: 'pointer',
  },

  loginButton: {
    width: '100%',
    minHeight: '50px',
    marginTop: '18px',
    border: 'none',
    borderRadius: '12px',
    background: '#2563eb',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '800',
    cursor: 'pointer',
  },

  googleButton: {
    width: '100%',
    minHeight: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    borderRadius: '12px',
    border:
      '1px solid #475569',
    background: '#ffffff',
    color: '#111827',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
  },

  googleIcon: {
    width: '25px',
    height: '25px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '900',
    color: '#4285F4',
  },

  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin:
      '22px 0',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: '700',
  },

  error: {
    marginBottom: '14px',
    padding: '12px',
    borderRadius: '10px',
    background: '#451a1a',
    border:
      '1px solid #7f1d1d',
    color: '#fecaca',
    fontSize: '14px',
    lineHeight: '1.4',
  },

  success: {
    marginBottom: '14px',
    padding: '12px',
    borderRadius: '10px',
    background: '#052e16',
    border:
      '1px solid #166534',
    color: '#bbf7d0',
    fontSize: '14px',
    lineHeight: '1.4',
  },

  recaptcha: {
    marginTop: '16px',
    overflow: 'hidden',
  },

  registerText: {
    margin:
      '22px 0 8px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  },

  registerButton: {
    width: '100%',
    minHeight: '46px',
    borderRadius: '11px',
    border:
      '1px solid #334155',
    background: 'transparent',
    color: '#60a5fa',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
  },
}

export default Login
