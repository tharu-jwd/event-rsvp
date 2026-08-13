// A restrained progress bar instead of literal block characters — reads
// better in a browser, same idea as the ASCII sketch in the design notes.
export default function CapacityBar({ attending, capacity }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((attending / capacity) * 100)) : 0;
  const full = attending >= capacity;

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
        <span className={full ? 'font-semibold text-amber-600' : ''}>
          {attending} / {capacity} attending
        </span>
        {full && <span className="font-semibold text-amber-600">Event full</span>}
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${full ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
