'use client';

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
} from 'firebase/auth';
import type { AuthError, ConfirmationResult, UserCredential } from 'firebase/auth';
import { firebaseApp } from '../../lib/firebase';

type FirebaseSignInProps = {
  onSuccess: () => void;
};

function errorMessage(error: AuthError | unknown) {
  const code = (error as AuthError | null)?.code;

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'That email or password was not accepted. Check your details and try again.';
    case 'auth/email-already-in-use':
      return 'That email already has an account. Use Sign in instead.';
    case 'auth/weak-password':
      return 'Please choose a stronger password (at least 6 characters).';
    case 'auth/invalid-verification-code':
      return 'That code was not accepted. Check the message and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'The Google sign-in window was closed before finishing.';
    case 'auth/popup-blocked':
      return 'The browser blocked the sign-in window. Allow popups for this site and try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for sign-in yet. An organizer needs to add it in the Firebase Console.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait before trying again.';
    default:
      return 'Sign-in failed. Please try again later.';
  }
}

export default function FirebaseSignIn({ onSuccess }: FirebaseSignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [pending, setPending] = useState(false);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const completeSignIn = async (idToken: string) => {
    const response = await fetch('/api/auth/firebase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null) as { message?: string } | null;
      setIsError(true);
      setMessage(data?.message ?? 'Sign-in failed. Please try again later.');
      return;
    }

    onSuccess();
  };

  const run = async (action: () => Promise<UserCredential>) => {
    setPending(true);
    setIsError(false);
    setMessage('');

    try {
      const credential = await action();
      const idToken = await credential.user.getIdToken(true);
      await completeSignIn(idToken);
    } catch (err) {
      setIsError(true);
      setMessage(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>, createAccount: boolean) => {
    event.preventDefault();
    const auth = getAuth(firebaseApp);

    void run(() => createAccount
      ? createUserWithEmailAndPassword(auth, email, password)
      : signInWithEmailAndPassword(auth, email, password));
  };

  const handleCreateAccount = () => {
    const auth = getAuth(firebaseApp);

    void run(() => createUserWithEmailAndPassword(auth, email, password));
  };

  const handleGoogle = () => {
    const auth = getAuth(firebaseApp);
    const provider = new GoogleAuthProvider();

    void run(() => signInWithPopup(auth, provider));
  };

  const handleSendCode = () => {
    const auth = getAuth(firebaseApp);

    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'firebase-recaptcha', { size: 'invisible' });
      }

      void signInWithPhoneNumber(auth, phone, recaptchaRef.current)
        .then((result) => {
          setConfirmation(result);
          setIsError(false);
          setMessage('A verification code was sent. Enter it below to finish signing in.');
        })
        .catch((err) => {
          setIsError(true);
          setMessage(errorMessage(err));
        });
    } catch {
      setIsError(true);
      setMessage('Could not start phone verification. Please try again later.');
    }
  };

  const handleVerify = () => {
    if (!confirmation) return;

    setPending(true);
    setIsError(false);
    setMessage('');

    void confirmation.confirm(code)
      .then(async (credential) => {
        const idToken = await credential.user.getIdToken(true);
        await completeSignIn(idToken);
      })
      .catch((err) => {
        setIsError(true);
        setMessage(errorMessage(err));
      })
      .finally(() => setPending(false));
  };

  return (
    <div className="gate-form">
      <p className="helper">
        Community members can also sign in with an email address, a Google account, or a
        phone number.
      </p>

      <form onSubmit={(event) => void handleEmailSubmit(event, false)}>
        <label htmlFor="firebase-email">Email</label>
        <div className="form-row">
          <input
            id="firebase-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <label htmlFor="firebase-password">Password</label>
        <div className="form-row">
          <input
            id="firebase-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <div className="btn-row btn-row--start">
          <button className="btn" type="submit" disabled={pending} aria-busy={pending}>
            {pending ? 'Checking…' : 'Sign in'}
          </button>
          <button className="btn btn-secondary" type="button" disabled={pending} onClick={handleCreateAccount}>
            Create account
          </button>
        </div>
      </form>

      <div className="btn-row btn-row--start">
        <button className="btn btn-secondary" type="button" disabled={pending} onClick={handleGoogle}>
          Sign in with Google
        </button>
      </div>

      <div className="form-row">
        <label htmlFor="firebase-phone" className="sr-only">Phone number including country code</label>
        <input
          id="firebase-phone"
          name="phone"
          type="tel"
          placeholder="+1 303 555 0100"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <button
          className="btn btn-secondary"
          type="button"
          disabled={pending || phone.trim() === ''}
          onClick={handleSendCode}
        >
          Send code
        </button>
      </div>
      {confirmation ? (
        <div className="form-row">
          <label htmlFor="firebase-code" className="sr-only">Verification code</label>
          <input
            id="firebase-code"
            name="code"
            inputMode="numeric"
            placeholder="Verification code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <button
            className="btn"
            type="button"
            disabled={pending || code.trim() === ''}
            onClick={handleVerify}
          >
            Verify
          </button>
        </div>
      ) : null}

      <div id="firebase-recaptcha" />

      <p
        className={isError ? 'form-message form-message--error' : 'form-message'}
        role={isError ? 'alert' : 'status'}
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  );
}
