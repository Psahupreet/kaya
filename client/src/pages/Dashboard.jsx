import React, { useEffect, useState } from 'react';
import { useAuth } from '../utils/auth';
import API from '../utils/api';
import SQMPage from './roles/SQM';
import SPBPage from './roles/SPB';
import LabPage from './roles/Lab';
import AdminPage from './roles/Admin';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [options, setOptions] = useState(null);

  useEffect(()=> {
    API.get('/options').then(r => setOptions(r.data)).catch(()=>setOptions(null));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-slate-900">Randomization System</h1>
              <div className="mt-1 text-sm text-slate-600">
                Logged in as{' '}
                <span className="font-medium text-slate-800">{user?.name || user?.username}</span>{' '}
                <span className="text-slate-500">({user?.role})</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="shrink-0 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {user?.role === 'sqm' && <SQMPage options={options} user={user} />}
        {user?.role === 'spb' && <SPBPage options={options} />}
        {user?.role === 'lab' && <LabPage options={options} />}
        {(user?.role === 'admin' || user?.role === 'super_admin') && <AdminPage options={options} user={user} />}
        {!user?.role && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Unable to determine your role.
          </div>
        )}
      </main>
    </div>
  );
}
