import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { api, ApiError } from '../../lib/api';

export default function NewEvent() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    startsAt: '',
    capacity: 50,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading || !user) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const data = await api.post('/api/events', {
        ...form,
        capacity: Number(form.capacity),
      });
      router.push(`/dashboard/${data.event.slug}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>New event</title>
      </Head>
      <div className="max-w-lg mx-auto py-12 px-4">
        <h1 className="text-xl font-bold text-gray-900 mb-6">New event</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
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
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {submitting ? 'Creating…' : 'Create event'}
          </button>
        </form>
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
