import Link from 'next/link';
import { formatDateTime, isPast } from '../lib/format';
import CapacityBar from './CapacityBar';

export default function EventCard({ event }) {
  const past = isPast(event.startsAt);
  const cancelled = event.status === 'cancelled';

  return (
    <Link
      href={`/events/${event.slug}`}
      className="block bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <h2 className="font-semibold text-gray-900 leading-snug">{event.title}</h2>
        {cancelled && (
          <span className="shrink-0 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
            Cancelled
          </span>
        )}
        {!cancelled && past && (
          <span className="shrink-0 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            Past
          </span>
        )}
      </div>
      <div className="text-sm text-gray-500 space-y-0.5 mb-4">
        <p>{formatDateTime(event.startsAt)}</p>
        <p>{event.location}</p>
      </div>
      <CapacityBar attending={event.attendingCount} capacity={event.capacity} />
    </Link>
  );
}
