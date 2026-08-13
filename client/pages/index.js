import { useState, useEffect } from 'react';
import Head from 'next/head';
import { api } from '../lib/api';
import EventCard from '../components/EventCard';

export default function Home() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/events')
      .then((data) => setEvents(data.events))
      .catch(() => setError('Could not load events. Please try again shortly.'));
  }, []);

  return (
    <>
      <Head>
        <title>Event RSVP</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Upcoming events</h1>
        <p className="text-gray-400 text-sm mb-8">Browse what&apos;s on and reserve your spot.</p>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {!events && !error && <p className="text-gray-300 text-sm">Loading…</p>}

        {events && events.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center text-gray-300 text-sm">
            No upcoming events right now. Check back soon.
          </div>
        )}

        {events && events.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
