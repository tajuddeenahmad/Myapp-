import { useEffect, useRef, useState } from 'react'
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import {
  useNavigate,
  Link,
} from 'react-router-dom'

import { auth, db } from '../lib/firebase'

function Register() {
  const navigate = useNavigate()

  const [registerMethod, setRegisterMethod] =
    useState('email')

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] =
    useState('')

  const [showPassword, setShowPassword] =
    useState(false)

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false)

  const [phoneNumber, setPhoneNumber] =
    useState('')

  const [verificationCode, setVerificationCode] =
    useState('')

  const [countryCode, setCountryCode] =
    useState('+234')

  const [confirmationResult, setConfirmationResult] =
    useState(null)

  const [loading, setLoading] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const [error, setError] =
    useState('')

  const recaptchaVerifier =
    useRef(null)

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

  async function createUserProfile(
    user,
    extraData = {}
  ) {
    if (!user) return

    const userRef =
      doc(db, 'users', user.uid)

    await setDoc(
      userRef,
      {
        uid: user.uid,

        email:
          user.email || null,

        phoneNumber:
          user.phoneNumber ||
          extraData.phoneNumber ||
          null,

        username:
          extraData.username ||
          username.trim() ||
          user.displayName ||
          `user${user.uid.slice(0, 6)}`,

        role: 'user',

        bio: '',

        followers: 0,
        following: 0,
        likes: 0,

        walletBalance: 0,
        earnings: 0,
        totalViews: 0,

        createdAt:
          serverTimestamp(),

        ...extraData,
      },
      {
        merge: true,
      }
    )
  }

  async function finishRegister(user) {
    await createUserProfile(user)

    localStorage.setItem(
      'tajvid_user',
      JSON.stringify({
        uid: user.uid,
      })
    )

    navigate('/profile', {
      replace: true,
    })
  }

  async function handleEmailRegister(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    const cleanUsername =
      username.trim()

    const cleanEmail =
      email.trim().toLowerCase()

    if (!cleanUsername) {
      setError(
        'Please enter a username.'
      )
      return
    }

    if (cleanUsername.length < 3) {
      setError(
        'Username must be at least 3 characters.'
      )
      return
    }

    if (!cleanEmail) {
      setError(
        'Please enter your email address.'
      )
      return
    }

    if (!password) {
      setError(
        'Please enter a password.'
      )
      return
    }

    if (password.length < 6) {
      setError(
        'Password must be at least 6 characters.'
      )
      return
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        'Passwords do not match.'
      )
      return
    }

    try {
      setLoading(true)

      const result =
        await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        )

      await createUserProfile(
        result.user,
        {
          username:
            cleanUsername,
        }
      )

      localStorage.setItem(
        'tajvid_user',
        JSON.stringify({
          uid: result.user.uid,
        })
      )

      setMessage(
        'Account created successfully.'
      )

      setTimeout(() => {
        navigate('/profile', {
          replace: true,
        })
      }, 700)

    } catch (err) {
      console.error(err)
      handleFirebaseError(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleRegister() {
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

      await createUserProfile(
        result.user
      )

      localStorage.setItem(
        'tajvid_user',
        JSON.stringify({
          uid: result.user.uid,
        })
      )

      setMessage(
        'Google account connected successfully.'
      )

      setTimeout(() => {
        navigate('/profile', {
          replace: true,
        })
      }, 700)

    } catch (err) {
      console.error(err)
      handleFirebaseError(err)
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
        'register-recaptcha',
        {
          size: 'normal',

          callback: () => {
            setError('')
          },

          'expired-callback': () => {
            setError(
              'reCAPTCHA expired. Please verify again.'
            )
          },
        }
      )

    return recaptchaVerifier.current
  }

  async function handleSendOTP() {
    setError('')
    setMessage('')

    const cleanUsername =
      username.trim()

    const cleanPhone =
      phoneNumber.trim()

    if (!cleanUsername) {
      setError(
        'Please enter a username.'
      )
      return
    }

    if (cleanUsername.length < 3) {
      setError(
        'Username must be at least 3 characters.'
      )
      return
    }

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
        `${countryCode}${cleanPhone.replace(
          /^0+/,
          ''
        )}`

      const result =
        await signInWithPhoneNumber(
          auth,
          fullPhoneNumber,
          verifier
        )

      setConfirmationResult(
        result
      )

      setMessage(
        'Verification code sent to your phone.'
      )

    } catch (err) {
      console.error(err)

      if (
        recaptchaVerifier.current
      ) {
        try {
          recaptchaVerifier.current.clear()
        } catch {
          // Ignore cleanup errors
        }

        recaptchaVerifier.current =
          null
      }

      handleFirebaseError(err)

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

      await createUserProfile(
        result.user,
        {
          username:
            username.trim(),

          phoneNumber:
            result.user.phoneNumber ||
            null,
        }
      )

      localStorage.setItem(
        'tajvid_user',
        JSON.stringify({
          uid: result.user.uid,
        })
      )

      setMessage(
        'Account created successfully.'
      )

      setTimeout(() => {
        navigate('/profile', {
          replace: true,
        })
      }, 700)

    } catch (err) {
      console.error(err)
      handleFirebaseError(err)
    } finally {
      setLoading(false)
    }
  }

  function handleFirebaseError(err) {
    if (
      err?.code ===
      'auth/email-already-in-use'
    ) {
      setError(
        'This email already has an account. Please Login instead.'
      )
    } else if (
      err?.code ===
      'auth/invalid-email'
    ) {
      setError(
        'Please enter a valid email address.'
      )
    } else if (
      err?.code ===
      'auth/weak-password'
    ) {
      setError(
        'Password must be at least 6 characters.'
      )
    } else if (
      err?.code ===
      'auth/network-request-failed'
    ) {
      setError(
        'Could not connect to Firebase. Check your internet connection.'
      )
    } else if (
      err?.code ===
      'auth/too-many-requests'
    ) {
      setError(
        'Too many attempts. Please try again later.'
      )
    } else if (
      err?.code ===
      'auth/popup-closed-by-user'
    ) {
      setError(
        'Google registration was closed.'
      )
    } else if (
      err?.code ===
      'auth/invalid-phone-number'
    ) {
      setError(
        'The phone number is not valid.'
      )
    } else if (
      err?.code ===
      'auth/quota-exceeded'
    ) {
      setError(
        'Firebase SMS limit has been reached. Please try again later.'
      )
    } else if (
      err?.code ===
      'auth/invalid-verification-code'
    ) {
      setError(
        'The verification code is incorrect.'
      )
    } else if (
      err?.code ===
      'auth/code-expired'
    ) {
      setError(
        'The verification code has expired.'
      )
    } else if (
      err?.code ===
      'auth/operation-not-allowed'
    ) {
      setError(
        'This registration method is not enabled in Firebase.'
      )
    } else {
      setError(
        err?.message ||
        'Registration failed. Please try again.'
      )
    }
  }

  function switchMethod(method) {
    setRegisterMethod(method)

    setError('')
    setMessage('')

    setConfirmationResult(null)
    setVerificationCode('')

    if (method !== 'phone') {
      if (recaptchaVerifier.current) {
        try {
          recaptchaVerifier.current.clear()
        } catch {
          // Ignore cleanup errors
        }

        recaptchaVerifier.current =
          null
      }
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.logoCircle}>
          TV
        </div>

        <h1 style={styles.title}>
          Join TajVid
        </h1>

        <p style={styles.subtitle}>
          Create an account to continue
        </p>

        <div style={styles.tabs}>

          <button
            type="button"
            onClick={() =>
              switchMethod('email')
            }
            style={{
              ...styles.tab,
              ...(registerMethod ===
              'email'
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
              ...(registerMethod ===
              'phone'
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

        <label style={styles.label}>
          Username
        </label>

        <input
          type="text"
          value={username}
          onChange={(event) =>
            setUsername(
              event.target.value
            )
          }
          placeholder="Choose a username"
          autoComplete="username"
          maxLength={30}
          style={styles.input}
        />

        {registerMethod ===
          'email' && (
          <form
            onSubmit={
              handleEmailRegister
            }
          >

            <label style={styles.label}>
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="Enter your email"
              autoComplete="email"
              style={styles.input}
            />

            <label style={styles.label}>
              Password
            </label>

            <div
              style={
                styles.passwordBox
              }
            >
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
                placeholder="Create a password"
                autoComplete="new-password"
                style={
                  styles.passwordInput
                }
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

            <label style={styles.label}>
              Confirm password
            </label>

            <div
              style={
                styles.passwordBox
              }
            >
              <input
                type={
                  showConfirmPassword
                    ? 'text'
                    : 'password'
                }
                value={
                  confirmPassword
                }
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Confirm your password"
                autoComplete="new-password"
                style={
                  styles.passwordInput
                }
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                style={
                  styles.eyeButton
                }
              >
                {showConfirmPassword
                  ? '🙈'
                  : '👁️'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={
                styles.loginButton
              }
            >
              {loading
                ? 'Creating account...'
                : 'Create account'}
            </button>

          </form>
        )}

        {registerMethod ===
          'phone' && (
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
              <>
                <div
                  id="register-recaptcha"
                  style={
                    styles.recaptcha
                  }
                />

                <button
                  type="submit"
                  disabled={loading}
                  style={
                    styles.loginButton
                  }
                >
                  {loading
                    ? 'Sending code...'
                    : 'Send verification code'}
                </button>
              </>
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
                  maxLength={6}
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
                    ? 'Creating account...'
                    : 'Verify & Create account'}
                </button>
              </>
            )}

          </form>
        )}

        <div style={styles.divider}>
          <span
            style={
              styles.dividerLine
            }
          />

          <span>OR</span>

          <span
            style={
              styles.dividerLine
            }
          />
        </div>

        <button
          type="button"
          onClick={
            handleGoogleRegister
          }
          disabled={loading}
          style={
            styles.googleButton
          }
        >
          <span
            style={styles.googleIcon}
          >
            G
          </span>

          {loading
            ? 'Please wait...'
            : 'Continue with Google'}
        </button>

        <p style={styles.registerText}>
          Already have an account?
        </p>

        <button
          type="button"
          onClick={() =>
            navigate('/login')
          }
          style={
            styles.registerButton
          }
        >
          Login to your account
        </button>

        <p
          style={{
            textAlign: 'center',
            marginTop: '16px',
          }}
        >
          <Link
            to="/"
            style={
              styles.homeLink
            }
          >
            ← Back to Home
          </Link>
        </p>

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
    background: 'transparent',
    color: '#ffffff',
    fontSize: '20px',
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
    margin: '22px 0',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: '700',
  },

  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#334155',
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

  homeLink: {
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '13px',
  },
}

export default Register
