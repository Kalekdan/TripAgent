'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AgentToggles {
  dateFinder: boolean;
  accommodation: boolean;
  foodShop: boolean;
  itinerary: boolean;
}

interface Trip {
  id: number;
  description: string;
  created_at: string;
}

const DEMO_MEMBERS = ['alice', 'bob', 'charlie', 'diana'];

interface Session {
  username: string | null;
}

function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-indigo-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </div>
      <span className="text-gray-700 font-medium">{label}</span>
    </label>
  );
}

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginUsername, setLoginUsername] = useState('alice');
  const [loginPassword, setLoginPassword] = useState('alice');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState(3);
  const [agents, setAgents] = useState<AgentToggles>({
    dateFinder: true,
    accommodation: false,
    foodShop: false,
    itinerary: false,
  });
  const [selectedMembers, setSelectedMembers] = useState<string[]>(['alice']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsError, setTripsError] = useState('');

  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data: Session) => {
        setSession(data);
        if (data.username) setSelectedMembers([data.username]);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== 'existing') return;

    fetch('/api/trips')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load existing trips');
        return res.json();
      })
      .then((data: Trip[]) => setTrips(data))
      .catch((err: unknown) => {
        setTripsError(err instanceof Error ? err.message : 'Something went wrong');
      })
      .finally(() => setTripsLoading(false));
  }, [activeTab]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setSession(data);
      setSelectedMembers([data.username]);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setSession({ username: null });
    setTrips([]);
    setActiveTab('new');
  };

  const handleCreate = async () => {
    if (!description.trim()) {
      setError('Please describe your trip before continuing.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          durationDays,
          agentDateFinder: agents.dateFinder,
          agentAccommodation: agents.accommodation,
          agentFoodShop: agents.foodShop,
          agentItinerary: agents.itinerary,
          memberUsernames: selectedMembers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create trip');
      router.push(`/dashboard?id=${data.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setLoading(false);
    }
  };

  if (authLoading) {
    return <main className="min-h-screen flex items-center justify-center text-gray-500">Loading...</main>;
  }

  if (!session?.username) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-16">
        <form onSubmit={handleLogin} className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">✈️ TripAgent</h1>
          <p className="text-gray-500 mb-8">Sign in to view your group trips.</p>
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-600">
              Username
              <input
                value={loginUsername}
                onChange={(event) => setLoginUsername(event.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl p-3 font-normal text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                autoComplete="username"
              />
            </label>
            <label className="block text-sm font-semibold text-gray-600">
              Password
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl p-3 font-normal text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                autoComplete="current-password"
              />
            </label>
          </div>
          {loginError && <p className="text-red-500 text-sm mt-3">{loginError}</p>}
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loginLoading ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-xs text-gray-400 mt-4">Demo users: alice, bob, charlie, or diana. Each password matches the username.</p>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="flex justify-end mb-6">
          <button onClick={handleLogout} className="text-sm text-indigo-600 hover:underline">
            Sign out ({session.username})
          </button>
        </div>
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            ✈️ TripAgent
          </h1>
          <p className="text-lg text-gray-500">
            Plan your perfect group holiday with AI-powered agents
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex border-b border-gray-100 mb-8" role="tablist" aria-label="Trip options">
            <button
              onClick={() => setActiveTab('new')}
              role="tab"
              aria-selected={activeTab === 'new'}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                activeTab === 'new'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              New Trip
            </button>
            <button
              onClick={() => {
                setActiveTab('existing');
                setTripsLoading(true);
                setTripsError('');
              }}
              role="tab"
              aria-selected={activeTab === 'existing'}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                activeTab === 'existing'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Existing Trips
            </button>
          </div>

          {activeTab === 'new' ? (
            <>
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Describe your trip
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="e.g. A weekend ski trip to the Alps for 6 friends in January..."
              className="w-full border border-gray-200 rounded-xl p-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none text-base"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Trip Length
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="30"
                value={durationDays}
                onChange={(event) => setDurationDays(Number(event.target.value))}
                className="w-24 border border-gray-200 rounded-xl p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <span className="text-gray-500">days</span>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
              AI Agents
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ToggleSwitch
                label="📅 Date Finder"
                checked={agents.dateFinder}
                onChange={(v) => setAgents((a) => ({ ...a, dateFinder: v }))}
              />
              <ToggleSwitch
                label="🏨 Accommodation Planner"
                checked={agents.accommodation}
                onChange={(v) => setAgents((a) => ({ ...a, accommodation: v }))}
              />
              <ToggleSwitch
                label="🍽️ Dietary & Food Shop"
                checked={agents.foodShop}
                onChange={(v) => setAgents((a) => ({ ...a, foodShop: v }))}
              />
              <ToggleSwitch
                label="🗺️ Itinerary Builder"
                checked={agents.itinerary}
                onChange={(v) => setAgents((a) => ({ ...a, itinerary: v }))}
              />
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
              Trip Members
            </label>
            <div className="grid grid-cols-2 gap-3">
              {DEMO_MEMBERS.map((member) => (
                <label key={member} className="flex items-center gap-2 text-gray-700 capitalize">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member)}
                    onChange={() => setSelectedMembers((current) => current.includes(member)
                      ? current.filter((entry) => entry !== member)
                      : [...current, member])}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  {member}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors duration-150 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Creating Trip…
              </>
            ) : (
              'Create Trip 🚀'
            )}
          </button>
            </>
          ) : (
            <div role="tabpanel" aria-label="Existing trips">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Your Trips</h2>
              <p className="text-sm text-gray-500 mb-6">Open a saved trip to continue planning.</p>

              {tripsLoading && <p className="text-sm text-gray-500">Loading trips...</p>}
              {tripsError && <p className="text-sm text-red-500">{tripsError}</p>}
              {!tripsLoading && !tripsError && trips.length === 0 && (
                <p className="text-sm text-gray-500">No trips yet. Create your first trip to get started.</p>
              )}
              {!tripsLoading && !tripsError && trips.length > 0 && (
                <div className="space-y-3">
                  {trips.map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => router.push(`/dashboard?id=${trip.id}`)}
                      className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    >
                      <span className="block font-medium text-gray-800">{trip.description}</span>
                      <span className="block text-xs text-gray-400 mt-1">
                        Trip #{trip.id} · {new Date(trip.created_at).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
