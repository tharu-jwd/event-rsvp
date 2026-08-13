import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import CapacityBar from '../../components/CapacityBar';
import RsvpPanel from '../../components/RsvpPanel';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';

export default function EventDetail() {
  const router = useRouter();
  const { slug } = router.query;
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!slug) return;
    api
      .get(`/api/events/${slug}`)
      .then((data) => setEvent(data.event))
      .catch(() => setError('This event could not be found.'));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Head>
        <title>{event?.title || 'Event RSVP'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {error && (
        <div className="max-w-md mx-auto py-20 px-4 text-center">
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      )}

      {!error && !event && (
        <div className="max-w-md mx-auto py-20 px-4 text-center text-gray-300 text-sm">Loading…</div>
      )}

      {!error && event && (
        <main className="py-12 px-4">
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-8 text-white">
                <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest mb-3">
                  {event.status === 'cancelled' ? 'Cancelled event' : 'Event'}
                </p>
                <h1 className="text-2xl font-bold mb-5">{event.title}</h1>
                <div className="space-y-1 text-sm text-emerald-100">
                  <p>{formatDateTime(event.startsAt)}</p>
                  <p>{event.location}</p>
                  {event.organizer && <p>Hosted by {event.organizer.name}</p>}
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                {event.description && (
                  <p className="text-gray-500 text-sm leading-relaxed">{event.description}</p>
                )}
                <CapacityBar attending={event.attendingCount} capacity={event.capacity} />
              </div>
            </div>

            <RsvpPanel event={event} onRsvpChange={load} />
          </div>
        </main>
      )}
    </>
  );
}
