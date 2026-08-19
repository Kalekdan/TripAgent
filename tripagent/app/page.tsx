'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AgentToggles {
  dateFinder: boolean;
  accommodation: boolean;
  foodShop: boolean;
  itinerary: boolean;
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
  const [description, setDescription] = useState('');
  const [agents, setAgents] = useState<AgentToggles>({
    dateFinder: true,
    accommodation: false,
    foodShop: false,
    itinerary: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          agentDateFinder: agents.dateFinder,
          agentAccommodation: agents.accommodation,
          agentFoodShop: agents.foodShop,
          agentItinerary: agents.itinerary,
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            ✈️ TripAgent
          </h1>
          <p className="text-lg text-gray-500">
            Plan your perfect group holiday with AI-powered agents
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
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
        </div>
      </div>
    </main>
  );
}
