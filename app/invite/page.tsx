'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Invite {
  id: number;
  description: string;
  duration_days: number;
  alreadyMember: boolean;
  username: string | null;
}

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loginUsername, setLoginUsername] = useState('alice');
  const [loginPassword, setLoginPassword] = useState('alice');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invite link is invalid');
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`/api/invites?token=${encodeURIComponent(token)}`).then((response) => response.json()),
      fetch('/api/auth').then((response) => response.json()),
    ])
      .then(([inviteData, session]) => {
        if (inviteData.error) throw new Error(inviteData.error);
        setInvite(inviteData);
        setLoggedIn(Boolean(session.username));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load invite'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setError('');
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginUsername, password: loginPassword }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || 'Login failed');
    else setLoggedIn(true);
    setLoginLoading(false);
  };

  const joinTrip = async () => {
    const response = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Could not join trip');
      return;
    }
    router.push(`/dashboard?id=${data.tripId}`);
  };

  if (loading) return <main className="min-h-screen flex items-center justify-center text-gray-500">Loading invite...</main>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trip invitation</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {invite && !loggedIn && (
          <form onSubmit={handleLogin} className="space-y-4">
            <p className="text-gray-500 mb-6">Please log in before joining this trip.</p>
            <input value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} placeholder="Username" className="w-full border border-gray-200 rounded-xl p-3" autoComplete="username" />
            <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Password" className="w-full border border-gray-200 rounded-xl p-3" autoComplete="current-password" />
            <button disabled={loginLoading} className="w-full bg-indigo-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl">
              {loginLoading ? 'Signing in...' : 'Log in'}
            </button>
            <p className="text-xs text-gray-400">Demo users use their username as their password.</p>
          </form>
        )}
        {invite && loggedIn && (
          <div>
            <p className="text-gray-600 mb-2">You&apos;ve been invited to:</p>
            <p className="font-semibold text-gray-900 mb-1">{invite.description}</p>
            <p className="text-sm text-gray-500 mb-6">{invite.duration_days} day trip</p>
            {invite.alreadyMember ? (
              <div>
                <p className="text-lg font-semibold text-green-700 mb-4">You&apos;re already on this trip!</p>
                <button onClick={() => router.push(`/dashboard?id=${invite.id}`)} className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl">Open trip</button>
              </div>
            ) : (
              <>
                <p className="text-lg font-semibold text-gray-800 mb-4">Do you want to be added to this trip?</p>
                <div className="flex gap-3">
                  <button onClick={joinTrip} className="flex-1 bg-indigo-600 text-white font-semibold py-3 rounded-xl">Yes, add me</button>
                  <button onClick={() => router.push('/')} className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl">No thanks</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}