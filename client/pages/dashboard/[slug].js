import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { api, ApiError } from '../../lib/api';
import { formatDateTime, toDatetimeLocalValue } from '../../lib/format';
import CapacityBar from '../../components/CapacityBar';

export default function ManageEvent() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const { slug } = router.query;

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!slug || !user) return;
    api
      .get(`/api/events/${slug}`)
      .then((data) => {
        setEvent(data.event);
        setForm({
          title: data.event.title,
          description: data.event.description,
          location: data.event.location,
          startsAt: toDatetimeLocalValue(data.event.startsAt),
          capacity: data.event.capacity,
        });
      })
      .catch(() => setNotFound(true));
    api
      .get(`/api/events/${slug}/attendees`)
      .then((data) => setAttendees(data.attendees))
      .catch(() => setAttendees([]));
  }, [slug, user]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !user) return null;
  if (notFound) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center text-gray-400 text-sm">
        Event not found, or you don&apos;t have access to it.
      </div>
    );
  }
  if (!event) return null;

  const isOwner = event.organizer?.id === user.id;
  if (!isOwner) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center text-gray-400 text-sm">
        You don&apos;t have permission to manage this event.
      </div>
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = await api.patch(`/api/events/${slug}`, {
        ...form,
        capacity: Number(form.capacity),
      });
      setEvent(data.event);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelEvent() {
    if (!confirm('Cancel this event? Attendees will see it as cancelled.')) return;
    await api.delete(`/api/events/${slug}`);
    load();
  }

  const attending = attendees?.filter((a) => a.status === 'attending') || [];
  const notAttending = attendees?.filter((a) => a.status === 'not_attending') || [];

  return (
    <>
      <Head>
        <title>{event.title} — manage</title>
      </Head>
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{event.title}</h1>
              <p className="text-gray-400 text-sm mt-0.5">
                {formatDateTime(event.startsAt)} · {event.location}
              </p>
            </div>
            {event.status === 'cancelled' ? (
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                Cancelled
              </span>
            ) : (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditing((v) => !v)}
                  className="text-xs border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {editing ? 'Close' : 'Edit'}
                </button>
                <button
                  onClick={handleCancelEvent}
                  className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 transition-colors"
                >
                  Cancel event
                </button>
              </div>
            )}
          </div>

          <div className="max-w-sm mb-1">
            <CapacityBar attending={event.attendingCount} capacity={event.capacity} />
          </div>
          <p className="text-xs text-gray-400">
            {attending.length} attending · {notAttending.length} declined
          </p>

          {editing && (
            <form onSubmit={handleSave} className="mt-6 pt-6 border-t border-gray-100 space-y-3">
              <Field label="Title">
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="Description">
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="Location">
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="Starts at">
                <input
                  type="datetime-local"
                  required
                  value={form.startsAt}
                  onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="Capacity">
                <input
                  type="number"
                  min="1"
                  required
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  className={inputClass}
                />
              </Field>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Attendees</h2>
          </div>
          {!attendees && <div className="p-8 text-center text-gray-300 text-sm">Loading…</div>}
          {attendees && attendees.length === 0 && (
            <div className="p-12 text-center text-gray-300 text-sm">No RSVPs yet.</div>
          )}
          {attendees && attendees.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-6 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a, i) => (
                  <tr key={a.id} className={i !== attendees.length - 1 ? 'border-b border-gray-50' : ''}>
                    <td className="px-6 py-3.5 font-medium text-gray-900">{a.name}</td>
                    <td className="px-6 py-3.5 text-gray-500">{a.email}</td>
                    <td className="px-6 py-3.5">
                      {a.status === 'attending' ? (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                          Attending
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          Not attending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
