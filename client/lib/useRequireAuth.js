import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

// Route guard for organizer-only pages. Purely a UX redirect — the API
// enforces the real authorization check server-side regardless of what this
// does, since frontend visibility is never a substitute for that.
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  return { user, loading };
}
