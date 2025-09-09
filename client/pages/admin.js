import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

const API = process.env.NEXT_PUBLIC_API_URL || '';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Admin() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const fetchRsvps = useCallback(async (pw) => {
    const res = await fetch(`${API}/api/rsvps`, {
      headers: { Authorization: `Bearer ${pw}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.rsvps;
  }, []);

  // Auto-login if password is saved
  useEffect(() => {
    const saved = localStorage.getItem('admin_pw');
    if (saved) {
      fetchRsvps(saved).then((data) => {
        if (data) {
          setRsvps(data);
          setAuthed(true);
        }
      });
    }
  }, [fetchRsvps]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    const data = await fetchRsvps(password);
    if (data) {
      setRsvps(data);
      setAuthed(true);
      localStorage.setItem('admin_pw', password);
    } else {
      setLoginError('Incorrect password');
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    const pw = localStorage.getItem('admin_pw');
    await fetch(`${API}/api/rsvps/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${pw}` },
    });
    setRsvps((prev) => prev.filter((r) => r.id !== id));
  }

  function exportCsv() {
    const header = 'Name,Email,Registered\n';
    const rows = rsvps
      .map((r) => `"${r.name}","${r.email}","${formatDate(r.createdAt)}"`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rsvps.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function logout() {
    localStorage.removeItem('admin_pw');
    setAuthed(false);
    setPassword('');
    setRsvps([]);
  }

  return (
    <>
      <Head>
        <title>Admin – RSVP</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-gray-50">
        {!authed ? (
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm">
              <h1 className="text-base font-semibold text-gray-900 mb-6">Admin login</h1>
              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  {loading ? 'Checking...' : 'Login'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-10 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-lg font-bold text-gray-900">RSVP Admin</h1>
                <p className="text-gray-400 text-sm mt-0.5">
                  {rsvps.length} registration{rsvps.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportCsv}
                  disabled={rsvps.length === 0}
                  className="text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-40 px-4 py-2 rounded-lg transition-colors"
                >
                  Export CSV
                </button>
                <button
                  onClick={logout}
                  className="text-sm text-gray-400 hover:text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Table */}
            {rsvps.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-16 text-center text-gray-300 text-sm">
                No registrations yet.
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                        Name
                      </th>
                      <th className="text-left px-6 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                        Email
                      </th>
                      <th className="text-left px-6 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                        Registered
                      </th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rsvps.map((r, i) => (
                      <tr
                        key={r.id}
                        className={i !== rsvps.length - 1 ? 'border-b border-gray-50' : ''}
                      >
                        <td className="px-6 py-3.5 font-medium text-gray-900">{r.name}</td>
                        <td className="px-6 py-3.5 text-gray-500">{r.email}</td>
                        <td className="px-6 py-3.5 text-gray-400">{formatDate(r.createdAt)}</td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
