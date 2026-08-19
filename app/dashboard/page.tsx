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
  is_admin: number;
  duration_days: number;
  availability_locked: number;
  invite_token: string;
}

interface AvailabilityStats {
  provided: number;
  total: number;
}

interface TripMember {
  username: string;
  name: string;
  hasProvided: boolean;
  available: boolean | null;
}

interface DateRange {
  start: string;
  end: string;
  membersAvailable: string[];
  label: string;
  best: boolean;
}

interface TripPlan {
  start_date: string;
  end_date: string;
  label: string;
  locked_by_name: string;
}

const MEMBER_STYLES: Record<string, { initials: string; color: string }> = {
  alice: { initials: 'AL', color: 'bg-pink-400' },
  bob: { initials: 'BO', color: 'bg-blue-400' },
  charlie: { initials: 'CH', color: 'bg-green-400' },
  diana: { initials: 'DI', color: 'bg-yellow-400' },
};

function getMemberStyle(username: string) {
  return MEMBER_STYLES[username] ?? { initials: username.slice(0, 2).toUpperCase(), color: 'bg-gray-400' };
}

function Avatar({ member }: { member: TripMember }) {
  const style = getMemberStyle(member.username);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-12 h-12 rounded-full ${style.color} flex items-center justify-center text-white font-bold text-sm`}>
        {style.initials}
      </div>
      <span className="text-xs text-gray-500">{member.name}</span>
    </div>
  );
}

type AgentStatus = 'idle' | 'loading' | 'done';

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [trip, setTrip] = useState<Trip | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [dateFinderStatus, setDateFinderStatus] = useState<AgentStatus>('idle');
  const [dateResults, setDateResults] = useState<DateRange[] | null>(null);
  const [dateFinderError, setDateFinderError] = useState('');
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [planError, setPlanError] = useState('');
  const [availability, setAvailability] = useState<string[]>([]);
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  const [availabilityStats, setAvailabilityStats] = useState<AvailabilityStats | null>(null);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityLocked, setAvailabilityLocked] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [lockAvailabilityError, setLockAvailabilityError] = useState('');
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      return;
    }
    fetch(`/api/trips?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setNotFound(true);
        else {
          setTrip(data);
          setAvailabilityLocked(Boolean(data.availability_locked));
          return fetch(`/api/trips/${data.id}/availability`)
            .then((response) => response.json())
            .then((availabilityData: { dates: string[]; stats?: AvailabilityStats; members?: TripMember[] }) => {
              setAvailability(availabilityData.dates);
              if (availabilityData.stats) setAvailabilityStats(availabilityData.stats);
              if (availabilityData.members) setTripMembers(availabilityData.members);
            });
        }
      })
      .catch(() => setNotFound(true));

    fetch(`/api/trips/${id}/plan`)
      .then((response) => response.json())
      .then((data: { plan: TripPlan | null }) => setTripPlan(data.plan));
  }, [id]);

  const runDateFinder = async () => {
    setDateFinderStatus('loading');
    setDateResults(null);
    setDateFinderError('');
    try {
      const response = await fetch(`/api/trips/${id}/agents`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Date Finder failed');
      setDateResults(data.results);
      setDateFinderStatus('done');
    } catch (err: unknown) {
      setDateFinderError(err instanceof Error ? err.message : 'Date Finder failed');
      setDateFinderStatus('idle');
    }
  };

  const toggleAvailability = (date: string) => {
    setAvailability((current) => current.includes(date)
      ? current.filter((entry) => entry !== date)
      : [...current, date].sort());
  };

  const saveAvailability = async () => {
    if (!id) return;
    setAvailabilitySaving(true);
    setAvailabilityError('');
    try {
      const response = await fetch(`/api/trips/${id}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: availability }),
      });
      if (!response.ok) throw new Error('Could not save availability');
    } catch (err: unknown) {
      setAvailabilityError(err instanceof Error ? err.message : 'Could not save availability');
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const lockAvailability = async () => {
    if (!id) return;
    setLockAvailabilityError('');
    const response = await fetch(`/api/trips/${id}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked: !availabilityLocked }),
    });
    const data = await response.json();
    if (!response.ok) {
      setLockAvailabilityError(data.error || 'Could not update availability selection lock');
      return;
    }
    setAvailabilityLocked(data.locked);
    if (data.locked) setAvailabilityOpen(false);
  };

  const lockInPlan = async (range: DateRange) => {
    if (!id) return;
    setPlanError('');
    const response = await fetch(`/api/trips/${id}/plan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start: range.start, end: range.end }),
    });
    const data = await response.json();
    if (!response.ok) {
      setPlanError(data.error || 'Could not lock the trip plan');
      return;
    }
    setTripPlan(data.plan);
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/');
  };

  const copyInviteLink = async () => {
    if (!trip) return;
    const inviteLink = `${window.location.origin}/invite?token=${encodeURIComponent(trip.invite_token)}`;
    await navigator.clipboard.writeText(inviteLink);
    setInviteLinkCopied(true);
    window.setTimeout(() => setInviteLinkCopied(false), 2000);
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
  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const firstDay = new Date(calendarYear, calendarMonthIndex, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const calendarDays = Array.from({ length: firstDay + daysInMonth }, (_, index) => (
    index < firstDay ? null : new Date(calendarYear, calendarMonthIndex, index - firstDay + 1)
  ));
  const availableMembers = tripMembers.filter((member) => member.available === true);
  const unavailableMembers = tripMembers.filter((member) => member.available !== true);
  const availabilityNeedsAction = !availabilityLocked && availability.length === 0;

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
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">Trip #{trip.id}</span>
            <button onClick={handleLogout} className="text-sm text-indigo-600 hover:underline">
              Sign out
            </button>
          </div>
        </div>

        {/* Trip Description */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Trip Overview</h1>
          <p className="text-gray-600 text-base leading-relaxed">{trip.description}</p>
          <p className="text-sm text-indigo-600 font-medium mt-3">{trip.duration_days} day trip</p>
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Invite link</p>
            <button
              onClick={copyInviteLink}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              {inviteLinkCopied ? 'Invite link copied' : 'Copy invite link'}
            </button>
          </div>
        </div>

        {tripPlan && (
          <div className="bg-indigo-700 text-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Trip Plan</h2>
            <p className="text-xl font-semibold">{tripPlan.label}</p>
            <p className="text-sm text-indigo-100 mt-2">Locked in by {tripPlan.locked_by_name}</p>
          </div>
        )}

        {tripPlan && (
          <div className="bg-white rounded-2xl shadow p-6">
            {availability.includes(tripPlan.start_date) && (() => {
              const lockedStart = new Date(`${tripPlan.start_date}T00:00:00Z`);
              const lockedDates = Array.from({ length: trip.duration_days }, (_, offset) =>
                formatDate(new Date(lockedStart.getTime() + offset * 86400000))
              );
              const isAvailable = lockedDates.every((date) => availability.includes(date));
              return isAvailable ? (
                <p className="text-lg font-semibold text-green-700">Time to get excited, you&apos;re going to {trip.description}!</p>
              ) : (
                <p className="text-lg font-semibold text-gray-600">Sorry you couldn&apos;t make this one.</p>
              );
            })()}
            {!availability.includes(tripPlan.start_date) && (
              <p className="text-lg font-semibold text-gray-600">Sorry you couldn&apos;t make this one.</p>
            )}
          </div>
        )}

        {/* Trip Members */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">👥 Trip Members</h2>
          {tripPlan ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-green-700 mb-3">Available</h3>
                <div className="flex flex-wrap gap-6">
                  {availableMembers.map((member) => <Avatar key={member.username} member={member} />)}
                  {availableMembers.length === 0 && <p className="text-sm text-gray-400">No members available.</p>}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-3">Not available</h3>
                <div className="flex flex-wrap gap-6">
                  {unavailableMembers.map((member) => <Avatar key={member.username} member={member} />)}
                  {unavailableMembers.length === 0 && <p className="text-sm text-gray-400">Everyone is available.</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-6">
              {tripMembers.map((member) => <Avatar key={member.username} member={member} />)}
            </div>
          )}
          {!tripPlan && <p className="text-xs text-gray-400 mt-4">Availability will be shown once the trip dates are locked in.</p>}
        </div>

        <details
          open={availabilityOpen}
          onToggle={(event) => setAvailabilityOpen(event.currentTarget.open)}
          className={`rounded-2xl shadow p-6 ${availabilityNeedsAction ? 'bg-amber-50 border border-amber-200' : 'bg-white'}`}
        >
          <summary className="cursor-pointer list-none flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">📆 My Availability</h2>
              <p className="text-sm text-gray-500">
                {availabilityLocked
                  ? 'Availability selection is locked. 🔒'
                  : availabilityNeedsAction
                    ? 'Action needed: select the dates you can travel.'
                    : 'Availability saved. You can still update your selection.'}
              </p>
            </div>
            <span className="text-sm text-indigo-600">{availabilityOpen ? 'Hide' : 'Show'}</span>
          </summary>
          <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">📆 My Availability</h2>
              <p className="text-sm text-gray-500">Select the dates you can travel, then save them.</p>
            </div>
            <button
              onClick={saveAvailability}
              disabled={availabilitySaving || Boolean(availabilityLocked)}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              {availabilitySaving ? 'Saving...' : 'Save'}
            </button>
          </div>
          {availabilityError && <p className="text-sm text-red-500 mb-3">{availabilityError}</p>}
          {availabilityLocked && <p className="text-sm text-gray-500 mb-3">The admin has locked availability selection for this trip.</p>}
          <div className="flex items-center justify-between mt-5 mb-3">
            <button
              onClick={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex - 1, 1))}
              className="text-indigo-600 px-2 py-1"
              aria-label="Previous month"
            >
              ←
            </button>
            <span className="font-semibold text-gray-800">
              {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex + 1, 1))}
              className="text-indigo-600 px-2 py-1"
              aria-label="Next month"
            >
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <span key={day} className="py-2 font-semibold text-gray-400">{day}</span>
            ))}
            {calendarDays.map((date, index) => date ? (
              <button
                key={formatDate(date)}
                onClick={() => toggleAvailability(formatDate(date))}
                disabled={Boolean(availabilityLocked)}
                className={`aspect-square rounded-lg text-sm ${
                  availability.includes(formatDate(date))
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-gray-50 text-gray-700 hover:bg-indigo-100'
                }`}
              >
                {date.getDate()}
              </button>
            ) : <span key={`empty-${index}`} />)}
          </div>
          </div>
        </details>

        {/* Admin Control Panel */}
        {trip.is_admin ? <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">⚙️ Admin Control Panel</h2>
          {activeAgents.length === 0 ? (
            <p className="text-gray-400 text-sm">No agents were enabled for this trip.</p>
          ) : (
            <div className="space-y-3">
              {activeAgents.map((agent) => (
                <div
                  key={agent.key}
                  className="border border-gray-100 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-gray-700">{agent.label}</span>
                    <div className="flex flex-col items-end gap-2">
                      {agent.key === 'dateFinder' ? (
                        <div className="flex flex-col items-end gap-2">
                          {availabilityStats && (
                            <span className="text-xs text-gray-500">
                              {availabilityStats.provided}/{availabilityStats.total} users have provided availability
                            </span>
                          )}
                          <button
                            onClick={runDateFinder}
                            disabled={dateFinderStatus === 'loading'}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                          >
                            {dateFinderStatus === 'loading' ? 'Running…' : 'Go'}
                          </button>
                          <button
                            onClick={() => lockAvailability()}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            {availabilityLocked ? 'Unlock availability selection' : 'Lock availability selection'}
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled
                          className="bg-gray-100 text-gray-400 text-sm font-semibold px-4 py-1.5 rounded-lg cursor-not-allowed"
                        >
                          Go
                        </button>
                      )}
                    </div>
                  </div>
                  {agent.key === 'dateFinder' && (dateFinderStatus === 'loading' || dateFinderStatus === 'done' || dateFinderError || planError) && (
                    <details open className="mt-4 border-t border-gray-100 pt-4">
                      <summary className="cursor-pointer text-sm font-semibold text-indigo-700">View date options</summary>
                      <div className="mt-3 space-y-3">
                        {dateFinderStatus === 'loading' && (
                          <div className="flex items-center gap-3 text-gray-500">
                            <svg className="animate-spin h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            <span>Agent analyzing member availability...</span>
                          </div>
                        )}
                        {dateFinderError && <p className="text-sm text-red-500">{dateFinderError}</p>}
                        {planError && <p className="text-sm text-red-500">{planError}</p>}
                        {dateResults?.length === 0 && <p className="text-sm text-gray-500">No {trip.duration_days}-day period has enough member availability yet.</p>}
                        {dateResults?.map((range) => (
                          <div key={range.start} className={`border rounded-xl p-4 ${range.best ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                            <div className="flex items-center justify-between gap-3">
                              <span className={`font-semibold ${range.best ? 'text-indigo-700' : 'text-gray-700'}`}>{range.label}</span>
                              <button onClick={() => lockInPlan(range)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Lock in</button>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                              {range.membersAvailable.length}/{availabilityStats?.total ?? 0} members available: <span className="text-gray-700 font-medium">{range.membersAvailable.join(', ') || 'None'}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                      {lockAvailabilityError && <p className="text-sm text-red-500 mt-2">{lockAvailabilityError}</p>}
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div> : (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Agent Controls</h2>
            <p className="text-sm text-gray-500">Only the trip admin can trigger planning agents.</p>
          </div>
        )}

      </div>
    </main>
  );
}
