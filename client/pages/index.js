import { useState, useEffect } from 'react';
import Head from 'next/head';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function Home() {
  const [event, setEvent] = useState(null);
  const [form, setForm] = useState({ name: '', email: '' });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/event`)
      .then((r) => r.json())
      .then(setEvent);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const res = await fetch(`${API}/api/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setStatus('error');
      } else {
        setStatus('success');
        setEvent((prev) => ({ ...prev, count: data.count }));
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  return (
    <>
      <Head>
        <title>{event?.title || 'Event RSVP'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto space-y-4">

          {/* Event card */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-8 text-white">
              <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest mb-3">
                Upcoming Event
              </p>
              <h1 className="text-2xl font-bold mb-5">
                {event?.title || <span className="opacity-40">Loading...</span>}
              </h1>
              <div className="space-y-2 text-sm text-emerald-100">
                <p>{event?.date}</p>
                <p>{event?.time}</p>
                <p>{event?.location}</p>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="text-gray-500 text-sm leading-relaxed">{event?.description}</p>
              <div className="mt-4">
                <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm font-semibold px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  {event?.count ?? '–'} people registered
                </span>
              </div>
            </div>
          </div>

          {/* Registration card */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            {status === 'success' ? (
              <div className="text-center py-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">You&apos;re in!</h2>
                <p className="text-gray-400 text-sm">See you there.</p>
              </div>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Reserve your spot</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Your name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    />
                  </div>

                  {error && <p className="text-red-500 text-xs">{error}</p>}

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                  >
                    {status === 'loading' ? 'Registering...' : 'Register now →'}
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-xs text-gray-300">
            <a href="/admin" className="hover:text-gray-400 transition-colors">Admin</a>
          </p>
        </div>
      </main>
    </>
  );
}
