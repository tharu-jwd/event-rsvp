import { useState, useEffect, useCallback } from 'react';

// Attendees don't have accounts (see docs/adr/0005-attendee-identity-by-email.md),
// so we remember the name/email they last RSVPed with in localStorage. It's
// a convenience, not a credential — it just saves re-typing on the same
// device, and lets the event page greet a returning visitor with their
// existing RSVP status.
const KEY = 'rsvp_identity';

export function useIdentity() {
  const [identity, setIdentityState] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setIdentityState(JSON.parse(saved));
    } catch {
      // ignore malformed/unavailable storage
    }
  }, []);

  const setIdentity = useCallback((next) => {
    setIdentityState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage unavailable (private browsing, quota) — non-fatal
    }
  }, []);

  return [identity, setIdentity];
}
