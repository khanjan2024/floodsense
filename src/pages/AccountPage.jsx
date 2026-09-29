import { useEffect, useState } from 'react'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext.jsx'
import { db } from '../firebase.js'
import { getFirestoreDocWithTimeout } from '../utils/firestore.js'

function getAuthErrorMessage(error) {
  if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
    return 'Your current password is incorrect.'
  }
  if (error.code === 'auth/email-already-in-use') {
    return 'That email address is already being used by another account.'
  }
  if (error.code === 'auth/invalid-email') {
    return 'Enter a valid email address.'
  }
  if (error.code === 'auth/weak-password') {
    return 'Choose a stronger password with at least 6 characters.'
  }
  if (error.code === 'auth/requires-recent-login') {
    return 'Please log in again, then retry this change.'
  }
  if (error.code === 'auth/network-request-failed') {
    return 'We could not reach the server. Check your connection and try again.'
  }
  return 'We could not save this change. Please try again.'
}

function Feedback({ message }) {
  if (!message) return null

  return (
    <p className={`account-feedback is-${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
      {message.text}
    </p>
  )
}

export default function AccountPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(() => {
    let localSaved = ''
    try {
      localSaved = (user?.uid ? localStorage.getItem(`floodsense-saved-location-${user.uid}`) : '') ||
        localStorage.getItem('floodsense-saved-location') || ''
    } catch {
      localSaved = ''
    }
    return {
      name: user?.displayName ?? '',
      savedLocation: localSaved,
    }
  })
  const [email, setEmail] = useState(user?.email ?? '')
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingEmail, setIsSavingEmail] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [profileMessage, setProfileMessage] = useState(null)
  const [emailMessage, setEmailMessage] = useState(null)
  const [passwordMessage, setPasswordMessage] = useState(null)
  const [newEmail, setNewEmail] = useState('')
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('')
  const [passwordCurrentPassword, setPasswordCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    let isCurrent = true

    async function loadProfile() {
      setIsLoadingData(true)
      setLoadError('')

      try {
        const profileDocument = await getFirestoreDocWithTimeout(doc(db, 'users', user.uid))
        if (!isCurrent) return

        const data = profileDocument.exists() ? profileDocument.data() : {}
        setProfile((prev) => ({
          name: typeof data.name === 'string' && data.name ? data.name : (user?.displayName ?? prev.name),
          savedLocation: typeof data.savedLocation === 'string' ? data.savedLocation : prev.savedLocation,
        }))
        if (typeof data.savedLocation === 'string' && data.savedLocation) {
          try {
            localStorage.setItem(`floodsense-saved-location-${user.uid}`, data.savedLocation)
          } catch {}
        }
        setEmail(user?.email ?? data.email ?? '')
      } catch (err) {
        console.warn('Could not load profile details from Firestore:', err)
        if (isCurrent) {
          if (err?.code === 'permission-denied') {
            setLoadError('Firestore blocked loading your cloud profile details (permission-denied). Please update your Firestore security rules in Firebase Console.')
          } else {
            setLoadError('Cloud Firestore is not yet configured in your Firebase project. Local settings are being used.')
          }
        }
      } finally {
        if (isCurrent) setIsLoadingData(false)
      }
    }

    void loadProfile()

    return () => {
      isCurrent = false
    }
  }, [loadAttempt, user])

  async function saveProfile(event) {
    event.preventDefault()
    setProfileMessage(null)

    if (!profile.name.trim()) {
      setProfileMessage({ type: 'error', text: 'Name cannot be blank.' })
      return
    }

    setIsSavingProfile(true)

    try {
      if (user?.uid) {
        localStorage.setItem(`floodsense-saved-location-${user.uid}`, profile.savedLocation.trim())
      }
      localStorage.setItem('floodsense-saved-location', profile.savedLocation.trim())
    } catch {}

    try {
      if (user) {
        await updateProfile(user, { displayName: profile.name.trim() })
      }
      await setDoc(doc(db, 'users', user.uid), {
        name: profile.name.trim(),
        savedLocation: profile.savedLocation.trim() || null,
      }, { merge: true })
      setProfileMessage({ type: 'success', text: 'Profile details saved.' })
    } catch (saveErr) {
      console.warn('Could not save profile to Firestore:', saveErr)
      setProfileMessage({
        type: 'success',
        text: 'Profile details saved locally on this device! (To sync across devices, enable Firestore in Firebase Console.)',
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function saveEmail(event) {
    event.preventDefault()
    setEmailMessage(null)
    setIsSavingEmail(true)
    const updatedEmail = newEmail.trim()

    try {
      const credential = EmailAuthProvider.credential(email || user.email, emailCurrentPassword)
      await reauthenticateWithCredential(user, credential)
      await updateEmail(user, updatedEmail)
      setEmail(updatedEmail)
      setEmailCurrentPassword('')

      try {
        await setDoc(doc(db, 'users', user.uid), { email: updatedEmail }, { merge: true })
      } catch {
        setEmailMessage({
          type: 'error',
          text: 'Your sign-in email changed, but the profile could not be synced. Please retry later.',
        })
        return
      }

      setNewEmail('')
      setEmailMessage({ type: 'success', text: 'Email address updated.' })
    } catch (error) {
      setEmailMessage({ type: 'error', text: getAuthErrorMessage(error) })
    } finally {
      setIsSavingEmail(false)
    }
  }

  async function savePassword(event) {
    event.preventDefault()
    setPasswordMessage(null)

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'The new passwords do not match.' })
      return
    }

    setIsSavingPassword(true)

    try {
      const credential = EmailAuthProvider.credential(email || user.email, passwordCurrentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
      setPasswordCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage({ type: 'success', text: 'Password updated.' })
    } catch (error) {
      setPasswordMessage({ type: 'error', text: getAuthErrorMessage(error) })
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <main className="account-page">
      <header className="account-header">
        <p className="account-eyebrow">Your profile</p>
        <h1>Account settings</h1>
        <p>Manage your personal details and sign-in credentials.</p>
      </header>

      {isLoadingData && (
        <p className="account-load-message" role="status">
          <span className="loading-spinner" aria-hidden="true" />
          <span>Loading account details...</span>
        </p>
      )}

      {loadError && (
        <div className="account-load-error" role="alert" style={{ marginBottom: '24px' }}>
          <div>
            <p style={{ fontWeight: 600 }}>{loadError}</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.9 }}>
              You can still manage your email and password below.
            </p>
          </div>
          <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Try again</button>
        </div>
      )}

      {!isLoadingData && (
        <div className="account-sections">
          <section className="account-section" aria-labelledby="profile-title">
            <div className="account-section-heading">
              <h2 id="profile-title">Profile</h2>
              <p>Your name and saved flood location.</p>
            </div>
            <form className="account-form" onSubmit={saveProfile}>
              <div className="account-form-grid">
                <label className="account-field">
                  <span>Name</span>
                  <input
                    autoComplete="name"
                    value={profile.name}
                    onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                    required
                  />
                </label>
                <label className="account-field">
                  <span>Saved location</span>
                  <input
                    autoComplete="address-level2"
                    placeholder="City, region, or postcode"
                    value={profile.savedLocation}
                    onChange={(event) => setProfile({ ...profile, savedLocation: event.target.value })}
                  />
                </label>
              </div>
              <Feedback message={profileMessage} />
              <button className="account-save" type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving...' : 'Save profile'}
              </button>
            </form>
          </section>

          <section className="account-section" aria-labelledby="email-title">
            <div className="account-section-heading">
              <h2 id="email-title">Email address</h2>
              <p>Confirm your current password to change your sign-in email.</p>
            </div>
            <form className="account-form" onSubmit={saveEmail}>
              <label className="account-field">
                <span>Current email</span>
                <input type="email" value={email} readOnly />
              </label>
              <label className="account-field">
                <span>New email</span>
                <input
                  autoComplete="email"
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  required
                />
              </label>
              <label className="account-field">
                <span>Current password</span>
                <input
                  autoComplete="current-password"
                  type="password"
                  value={emailCurrentPassword}
                  onChange={(event) => setEmailCurrentPassword(event.target.value)}
                  required
                />
              </label>
              <Feedback message={emailMessage} />
              <button className="account-save" type="submit" disabled={isSavingEmail}>
                {isSavingEmail ? 'Updating...' : 'Update email'}
              </button>
            </form>
          </section>

          <section className="account-section" aria-labelledby="password-title">
            <div className="account-section-heading">
              <h2 id="password-title">Password</h2>
              <p>Confirm your current password before choosing a new one.</p>
            </div>
            <form className="account-form" onSubmit={savePassword}>
              <label className="account-field">
                <span>Current password</span>
                <input
                  autoComplete="current-password"
                  type="password"
                  value={passwordCurrentPassword}
                  onChange={(event) => setPasswordCurrentPassword(event.target.value)}
                  required
                />
              </label>
              <label className="account-field">
                <span>New password</span>
                <input
                  autoComplete="new-password"
                  type="password"
                  minLength={6}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </label>
              <label className="account-field">
                <span>Confirm new password</span>
                <input
                  autoComplete="new-password"
                  type="password"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </label>
              <Feedback message={passwordMessage} />
              <button className="account-save" type="submit" disabled={isSavingPassword}>
                {isSavingPassword ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
