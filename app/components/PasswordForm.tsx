'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

type PasswordFormProps = {
  endpoint: '/api/auth/login' | '/api/auth/admin-login';
  fieldLabel: string;
  submitLabel: string;
  onSuccess: () => void;
};

export default function PasswordForm({ endpoint, fieldLabel, submitLabel, onSuccess }: PasswordFormProps) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setIsError(false);
    setMessage('');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setPassword('');
        onSuccess();
        return;
      }

      const data = await response.json().catch(() => null) as { message?: string } | null;
      setIsError(true);
      setMessage(data?.message ?? 'That password did not work. Please try again.');
    } catch {
      setIsError(true);
      setMessage('Could not reach the server. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="gate-form" onSubmit={(event) => void handleSubmit(event)}>
      <label htmlFor="access-password">{fieldLabel}</label>
      <div className="form-row">
        <input
          id="access-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? 'Checking…' : submitLabel}
        </button>
      </div>
      <p
        className={isError ? 'form-message form-message--error' : 'form-message'}
        role={isError ? 'alert' : 'status'}
        aria-live="polite"
      >
        {message}
      </p>
    </form>
  );
}
