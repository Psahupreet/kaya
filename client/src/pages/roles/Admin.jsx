import React, { useEffect, useState } from 'react';
import API from '../../utils/api';

export default function AdminPage({ options }) {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username:'', password:'', role:'sqm', name: '', assignedDivision: 'BHOPAL' });
  const [message, setMessage] = useState('');
  const [activeDetails, setActiveDetails] = useState('users'); // users | submissions | samples | reports
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [samples, setSamples] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(()=> {
    fetch();
  }, []);

  const fetch = async () => {
    try {
      const r = await API.get('/admin/overview');
      setOverview(r.data);
      const u = await API.get('/admin/users');
      setUsers(u.data);
    } catch (e) {
      // ignore
    }
  };

  const loadDetails = async (key) => {
    setActiveDetails(key);
    setDetailsError('');

    if (key === 'users') return;

    setDetailsLoading(true);
    try {
      if (key === 'submissions') {
        const r = await API.get('/admin/submissions');
        setSubmissions(r.data);
      } else if (key === 'samples') {
        const r = await API.get('/admin/samples');
        setSamples(r.data);
      } else if (key === 'reports') {
        const r = await API.get('/admin/reports');
        setReports(r.data);
      }
    } catch (e) {
      setDetailsError(e.response?.data?.error || 'Failed to load details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const createUser = async () => {
    try {
      await API.post('/auth/create-user', newUser);
      setMessage('User created');
      setNewUser({ username:'', password:'', role:'sqm', name: '', assignedDivision: 'BHOPAL' });
      fetch();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Admin</h2>
          <p className="mt-1 text-sm text-slate-600">Manage users and view system overview.</p>
        </div>
        <button
          onClick={fetch}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Overview</h3>
          <div className="mt-1 text-xs text-slate-500">Click a tile to view details</div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <button
              type="button"
              onClick={() => loadDetails('users')}
              className={`text-left rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200 ${
                activeDetails === 'users' ? 'ring-blue-300 bg-blue-50/40' : ''
              }`}
            >
              <div className="text-xs text-slate-500">Users</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{overview?.users ?? '—'}</div>
            </button>
            <button
              type="button"
              onClick={() => loadDetails('submissions')}
              className={`text-left rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200 ${
                activeDetails === 'submissions' ? 'ring-blue-300 bg-blue-50/40' : ''
              }`}
            >
              <div className="text-xs text-slate-500">Submissions</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{overview?.submissions ?? '—'}</div>
            </button>
            <button
              type="button"
              onClick={() => loadDetails('samples')}
              className={`text-left rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200 ${
                activeDetails === 'samples' ? 'ring-blue-300 bg-blue-50/40' : ''
              }`}
            >
              <div className="text-xs text-slate-500">Samples</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{overview?.samples ?? '—'}</div>
            </button>
            <button
              type="button"
              onClick={() => loadDetails('reports')}
              className={`text-left rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200 ${
                activeDetails === 'reports' ? 'ring-blue-300 bg-blue-50/40' : ''
              }`}
            >
              <div className="text-xs text-slate-500">Reports</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{overview?.reports ?? '—'}</div>
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">
                Details: {activeDetails.charAt(0).toUpperCase() + activeDetails.slice(1)}
              </div>
              {detailsLoading && <div className="text-xs text-slate-500">Loading…</div>}
            </div>

            {detailsError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {detailsError}
              </div>
            )}

            {activeDetails === 'users' && (
              <div className="mt-3 text-sm text-slate-600">
                Users list is shown on the right panel.
              </div>
            )}

            {activeDetails === 'submissions' && !detailsLoading && (
              <div className="mt-3">
                {submissions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No submissions found.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {submissions.slice(0, 10).map((s) => (
                      <li key={s._id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">{s.seriesNumber}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              SQM: {s.sqmId?.name || s.sqmId?.username || '—'}
                              <span className="mx-2 text-slate-300">|</span>
                              SPB: {s.assignedToSPB?.name || s.assignedToSPB?.username || '—'}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {s.projectName} {s.roadType ? <span className="text-slate-400">—</span> : null}{' '}
                              {s.roadType}
                            </div>
                          </div>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                            {s.status || '—'}
                          </span>
                        </div>
                      </li>
                    ))}
                    {submissions.length > 10 && (
                      <div className="text-xs text-slate-500">Showing first 10 of {submissions.length} submissions.</div>
                    )}
                  </ul>
                )}
              </div>
            )}

            {activeDetails === 'samples' && !detailsLoading && (
              <div className="mt-3">
                {samples.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No samples found.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {samples.slice(0, 10).map((s) => (
                      <li key={s._id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">
                              Series: {s.submission?.seriesNumber || '—'}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              SPB: {s.spbId?.name || s.spbId?.username || '—'}
                              <span className="mx-2 text-slate-300">|</span>
                              Lab: {s.labAssigned?.name || s.labAssigned?.username || '—'}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Thickness: {s.thickness ?? '—'}
                              <span className="mx-2 text-slate-300">|</span>
                              Cores: {s.numberOfCores ?? '—'}
                              <span className="mx-2 text-slate-300">|</span>
                              Strength: {s.strength || '—'}
                              <span className="mx-2 text-slate-300">|</span>
                              Diameter: {s.diameter ?? '—'}
                            </div>
                          </div>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                            {s.status || '—'}
                          </span>
                        </div>
                      </li>
                    ))}
                    {samples.length > 10 && (
                      <div className="text-xs text-slate-500">Showing first 10 of {samples.length} samples.</div>
                    )}
                  </ul>
                )}
              </div>
            )}

            {activeDetails === 'reports' && !detailsLoading && (
              <div className="mt-3">
                {reports.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No reports found.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {reports.slice(0, 10).map((r) => (
                      <li key={r._id} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">
                              Series: {r.sample?.submission?.seriesNumber || '—'}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Lab: {r.labId?.name || r.labId?.username || '—'}
                              <span className="mx-2 text-slate-300">|</span>
                              Created: {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                            </div>
                            {r.remarks ? (
                              <div className="mt-1 text-xs text-slate-600">Remarks: {r.remarks}</div>
                            ) : (
                              <div className="mt-1 text-xs text-slate-500">No remarks.</div>
                            )}
                          </div>
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            Reported
                          </span>
                        </div>
                      </li>
                    ))}
                    {reports.length > 10 && (
                      <div className="text-xs text-slate-500">Showing first 10 of {reports.length} reports.</div>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900">Create User</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="text-xs font-medium text-slate-700">Username</span>
              <input
                placeholder="e.g. john.sqm"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Password</span>
              <input
                type="password"
                placeholder="Set a password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Role</span>
              <select
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({
                    ...newUser,
                    role: e.target.value,
                    assignedDivision: e.target.value === 'sqm' ? (newUser.assignedDivision || 'BHOPAL') : ''
                  })
                }
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="sqm">SQM</option>
                <option value="spb">SPB</option>
                <option value="lab">LAB</option>
                <option value="admin">ADMIN</option>
              </select>
            </label>

            {newUser.role === 'sqm' && (
              <label className="block">
                <span className="text-xs font-medium text-slate-700">Assigned division (SQM)</span>
                <select
                  value={newUser.assignedDivision || ''}
                  onChange={(e) => setNewUser({ ...newUser, assignedDivision: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {(options?.divisions || ['BHOPAL', 'NARMADAPURAM']).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block md:col-span-2 lg:col-span-3">
              <span className="text-xs font-medium text-slate-700">Full name</span>
              <input
                placeholder="e.g. John Kumar"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={createUser}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              Create user
            </button>
            {message && (
              <div className="text-sm text-slate-700">
                <span className="rounded-lg bg-slate-50 px-2 py-1 ring-1 ring-slate-200">{message}</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Users</h3>
            <div className="text-xs text-slate-500">{users.length} total</div>
          </div>

          {users.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              No users found.
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
              {users.map((u) => (
                <li key={u._id} className="bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">{u.name || u.username}</div>
                      <div className="text-sm text-slate-600">{u.username}</div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                      {String(u.role).toUpperCase()}
                      {u.role === 'sqm' && u.assignedDivision ? ` (${u.assignedDivision})` : ''}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}