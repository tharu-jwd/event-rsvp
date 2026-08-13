import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-gray-900 tracking-tight">
            Event RSVP
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {loading ? null : user ? (
              <>
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 transition-colors">
                  Dashboard
                </Link>
                <span className="text-gray-300">·</span>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-500 hover:text-gray-900 transition-colors">
                  Organizer login
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
