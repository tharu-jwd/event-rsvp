import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { api } from '../../lib/api';
import { formatDateTime, isPast } from '../../lib/format';
import CapacityBar from '../../components/CapacityBar';

export default function Dashboard() {
  const { user, loading } = useRequireAuth();
  const [events, setEvents] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.get('/api/events/mine').then((data) => setEvents(data.events));
  }, [user]);

  if (loading || !user) return null;

  return (
    <>
      <Head>
        <title>Dashboard</title>
      </Head>
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Your events</h1>
            <p className="text-gray-400 text-sm">Signed in as {user.name}</p>
          </div>
          <Link
            href="/dashboard/new"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            New event
          </Link>
        </div>

        {!events && <p className="text-gray-300 text-sm">Loading…</p>}

        {events && events.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center text-gray-300 text-sm">
            You haven&apos;t created any events yet.
          </div>
        )}

        {events && events.length > 0 && (
          <div className="space-y-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/dashboard/${event.slug}`}
                className="block bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">{event.title}</h2>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {formatDateTime(event.startsAt)} · {event.location}
                    </p>
                  </div>
                  {event.status === 'cancelled' && (
                    <span className="shrink-0 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      Cancelled
                    </span>
                  )}
                  {event.status === 'published' && isPast(event.startsAt) && (
                    <span className="shrink-0 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      Past
                    </span>
                  )}
                </div>
                <div className="max-w-xs">
                  <CapacityBar attending={event.attendingCount} capacity={event.capacity} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
