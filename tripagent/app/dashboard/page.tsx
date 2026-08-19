'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Trip {
  id: number;
  description: string;
  agent_date_finder: number;
  agent_accommodation: number;
  agent_food_shop: number;
  agent_itinerary: number;
}

interface Member {
  name: string;
  initials: string;
  color: string;
}

const MEMBERS: Member[] = [
  { name: 'Alice', initials: 'AL', color: 'bg-pink-400' },
  { name: 'Bob', initials: 'BO', color: 'bg-blue-400' },
  { name: 'Charlie', initials: 'CH', color: 'bg-green-400' },
  { name: 'Diana', initials: 'DI', color: 'bg-yellow-400' },
];

interface DateRange {
  start: string;
  end: string;
  membersAvailable: string[];
  label: string;
  best: boolean;
}

const MOCK_DATE_RESULTS: DateRange[] = [
  {
    start: '2025-02-07',
    end: '2025-02-09',
    membersAvailable: ['Alice', 'Bob', 'Charlie', 'Diana'],
    label: 'February 7 – 9, 2025',
    best: true,
  },
  {
    start: '2025-02-14',
    end: '2025-02-16',
    membersAvailable: ['Alice', 'Bob', 'Charlie'],
    label: 'February 14 – 16, 2025',
    best: false,
  },
];

function Avatar({ member }: { member: Member }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-12 h-12 rounded-full ${member.color} flex items-center justify-center text-white font-bold text-sm`}
      >
        {member.initials}
      </div>
      <span className="text-xs text-gray-500">{member.name}</span>
    </div>
  );
}

type AgentStatus = 'idle' | 'loading' | 'done';

export default function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [trip, setTrip] = useState<Trip | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [dateFinderStatus, setDateFinderStatus] = useState<AgentStatus>('idle');
  const [dateResults, setDateResults] = useState<DateRange[] | null>(null);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      return;
    }
    fetch(`/api/trips?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setNotFound(true);
        else setTrip(data);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  const runDateFinder = () => {
    setDateFinderStatus('loading');
    setDateResults(null);
    setTimeout(() => {
      setDateResults(MOCK_DATE_RESULTS);
      setDateFinderStatus('done');
    }, 2000);
  };

  if (notFound) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Trip not found.</p>
          <button
            onClick={() => router.push('/')}
            className="text-indigo-600 underline"
          >
            Back to home
          </button>
        </div>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </main>
    );
  }

  const activeAgents = [
    trip.agent_date_finder && { key: 'dateFinder', label: '📅 Date Finder', emoji: '📅' },
    trip.agent_accommodation && { key: 'accommodation', label: '🏨 Accommodation Planner', emoji: '🏨' },
    trip.agent_food_shop && { key: 'foodShop', label: '🍽️ Dietary & Food Shop', emoji: '🍽️' },
    trip.agent_itinerary && { key: 'itinerary', label: '🗺️ Itinerary Builder', emoji: '🗺️' },
  ].filter(Boolean) as { key: string; label: string; emoji: string }[];

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-indigo-600 hover:underline"
          >
            ← New Trip
          </button>
          <span className="text-xs text-gray-400">Trip #{trip.id}</span>
        </div>

        {/* Trip Description */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Trip Overview</h1>
          <p className="text-gray-600 text-base leading-relaxed">{trip.description}</p>
        </div>

        {/* Members */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">👥 Interested Members</h2>
          <div className="flex gap-6">
            {MEMBERS.map((m) => (
              <Avatar key={m.name} member={m} />
            ))}
          </div>
        </div>

        {/* Admin Control Panel */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">⚙️ Admin Control Panel</h2>
          {activeAgents.length === 0 ? (
            <p className="text-gray-400 text-sm">No agents were enabled for this trip.</p>
          ) : (
            <div className="space-y-3">
              {activeAgents.map((agent) => (
                <div
                  key={agent.key}
                  className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3"
                >
                  <span className="font-medium text-gray-700">{agent.label}</span>
                  {agent.key === 'dateFinder' ? (
                    <button
                      onClick={runDateFinder}
                      disabled={dateFinderStatus === 'loading'}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                    >
                      {dateFinderStatus === 'loading' ? 'Running…' : 'Go'}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="bg-gray-100 text-gray-400 text-sm font-semibold px-4 py-1.5 rounded-lg cursor-not-allowed"
                    >
                      Go
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date Finder Results */}
        {(dateFinderStatus === 'loading' || dateFinderStatus === 'done') && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📅 Date Finder Results</h2>

            {dateFinderStatus === 'loading' && (
              <div className="flex items-center gap-3 text-gray-500">
                <svg className="animate-spin h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Agent analyzing member availability...</span>
              </div>
            )}

            {dateFinderStatus === 'done' && dateResults && (
              <div className="space-y-4">
                {dateResults.map((range, i) => (
                  <div
                    key={i}
                    className={`border rounded-xl p-4 ${
                      range.best
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold ${range.best ? 'text-indigo-700' : 'text-gray-700'}`}>
                        {range.label}
                      </span>
                      {range.best && (
                        <span className="text-xs bg-indigo-600 text-white rounded-full px-2 py-0.5">
                          Best Option ✨
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {range.membersAvailable.length}/{MEMBERS.length} members available:{' '}
                      <span className="text-gray-700 font-medium">
                        {range.membersAvailable.join(', ')}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
