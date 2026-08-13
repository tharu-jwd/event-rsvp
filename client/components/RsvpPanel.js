import { useState, useEffect } from 'react';
import { api, ApiError } from '../lib/api';
import { useIdentity } from '../lib/useIdentity';
import { isPast } from '../lib/format';

export default function RsvpPanel({ event, onRsvpChange }) {
  const [identity, setIdentity] = useIdentity();
  const [rsvp, setRsvp] = useState(null);
  const [checking, setChecking] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!identity?.email) {
      setChecking(false);
      return;
    }
    setName(identity.name);
    setEmail(identity.email);
    api
      .get(`/api/events/${event.slug}/rsvp?email=${encodeURIComponent(identity.email)}`)
      .then((data) => setRsvp(data.rsvp))
      .catch(() => setRsvp(null))
      .finally(() => setChecking(false));
  }, [identity, event.slug]);

  const cancelled = event.status === 'cancelled';
  const started = isPast(event.startsAt);
  const closed = cancelled || started;

  async function submit(status) {
    setError('');
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.post(`/api/events/${event.slug}/rsvp`, {
        name: name.trim(),
        email: email.trim(),
        status,
      });
      setRsvp(data.rsvp);
      setIdentity({ name: name.trim(), email: email.trim() });
      setEditing(false);
      onRsvpChange?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRsvp() {
    setSubmitting(true);
    setError('');
    try {
      await api.delete(`/api/events/${event.slug}/rsvp`, { email });
      setRsvp(null);
      onRsvpChange?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return <div className="bg-white rounded-2xl shadow-sm p-6 text-sm text-gray-300">Loading…</div>;
  }

  if (cancelled) {
    return (
      <div className="bg-red-50 rounded-2xl p-6 text-center">
        <p className="text-sm font-semibold text-red-700">This event has been cancelled.</p>
      </div>
    );
  }

  if (started) {
    return (
      <div className="bg-gray-100 rounded-2xl p-6 text-center">
        <p className="text-sm font-semibold text-gray-600">
          RSVPs are closed — this event has already started.
        </p>
      </div>
    );
  }

  if (rsvp && !editing) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        {rsvp.status === 'attending' ? (
          <>
            <p className="text-sm font-semibold text-emerald-700 mb-1">You&apos;re in! ✓</p>
            <p className="text-gray-400 text-sm mb-4">RSVPed as {rsvp.name} ({rsvp.email})</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-700 mb-1">You&apos;re marked as not attending.</p>
            <p className="text-gray-400 text-sm mb-4">{rsvp.name} ({rsvp.email})</p>
          </>
        )}
        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
        <div className="flex gap-2">
          {rsvp.status === 'not_attending' && (
            <button
              onClick={() => submit('attending')}
              disabled={submitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {submitting ? 'Updating…' : "I'll be there after all"}
            </button>
          )}
          {rsvp.status === 'attending' && (
            <button
              onClick={() => submit('not_attending')}
              disabled={submitting}
              className="flex-1 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-600 font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Can&apos;t make it anymore
            </button>
          )}
          <button
            onClick={cancelRsvp}
            disabled={submitting}
            className="text-xs text-gray-400 hover:text-red-500 px-3 transition-colors"
          >
            Remove RSVP
          </button>
        </div>
      </div>
    );
  }

  const full = event.attendingCount >= event.capacity;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Reserve your spot</h2>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Name</label>
          <input
            type="text"
            required
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Email</label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}
        {full && !error && (
          <p className="text-amber-600 text-xs">
            This event is at capacity — you can still join the not-attending list, or check back if a spot frees up.
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => submit('attending')}
            disabled={submitting || full}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {submitting ? 'Submitting…' : full ? 'Event full' : "I'll be there"}
          </button>
          <button
            onClick={() => submit('not_attending')}
            disabled={submitting}
            className="flex-1 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-600 font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            Can&apos;t make it
          </button>
        </div>
        {editing && (
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
