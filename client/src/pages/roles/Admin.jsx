import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import ImagePreviewModal from '../../components/ImagePreviewModal';
import { resolveAssetUrl } from '../../utils/assets';

const roleOptions = ['sqm', 'spb', 'lab', 'admin', 'super_admin'];
const statusOptions = ['submitted', 'assigned', 'in-lab', 'reported'];
const sampleStatusOptions = ['assigned', 'in-lab', 'reported'];

function EditableField({ label, value, onChange, type = 'text', disabled = false }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
      />
    </label>
  );
}

export default function AdminPage({ options, user }) {
  const isSuperAdmin = user?.role === 'super_admin';
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [samples, setSamples] = useState([]);
  const [reports, setReports] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'sqm', name: '', assignedDivision: 'BHOPAL' });
  const [message, setMessage] = useState('');
  const [activeDetails, setActiveDetails] = useState('users');
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [editUsers, setEditUsers] = useState({});
  const [editSubmissions, setEditSubmissions] = useState({});
  const [editSamples, setEditSamples] = useState({});
  const [editReports, setEditReports] = useState({});
  const [submissionPhotoFiles, setSubmissionPhotoFiles] = useState({});
  const [photoUploadLoadingId, setPhotoUploadLoadingId] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const normalizeUser = (entry) => ({
    username: entry.username || '',
    name: entry.name || '',
    role: entry.role || 'sqm',
    assignedDivision: entry.assignedDivision || 'BHOPAL',
    password: ''
  });

  const normalizeSubmission = (entry) => ({
    seriesNumber: entry.seriesNumber || '',
    division: entry.division || '',
    district: entry.district || '',
    urbanLocalBody: entry.urbanLocalBody || '',
    projectName: entry.projectName || '',
    roadType: entry.roadType || '',
    status: entry.status || 'submitted',
    sqmId: entry.sqmId?._id || entry.sqmId || '',
    assignedToSPB: entry.assignedToSPB?._id || entry.assignedToSPB || ''
  });

  const normalizeSample = (entry) => ({
    sampleCode: entry.sampleCode || '',
    submission: entry.submission?._id || entry.submission || '',
    spbId: entry.spbId?._id || entry.spbId || '',
    labAssigned: entry.labAssigned?._id || entry.labAssigned || '',
    thickness: entry.thickness || '',
    numberOfCores: entry.numberOfCores ?? '',
    strength: entry.strength || '',
    diameter: entry.diameter || '',
    status: entry.status || 'assigned'
  });

  const normalizeReport = (entry) => ({
    sample: entry.sample?._id || entry.sample || '',
    labId: entry.labId?._id || entry.labId || '',
    reportFile: entry.reportFile || '',
    remarks: entry.remarks || ''
  });

  const fetchData = async () => {
    try {
      const { data } = await API.get('/admin/dashboard');

      setDetailsError('');
      setOverview(data.overview);
      setUsers(data.users);
      setSubmissions(data.submissions);
      setSamples(data.samples);
      setReports(data.reports);
      setEditUsers(Object.fromEntries(data.users.map((entry) => [entry._id, normalizeUser(entry)])));
      setEditSubmissions(Object.fromEntries(data.submissions.map((entry) => [entry._id, normalizeSubmission(entry)])));
      setEditSamples(Object.fromEntries(data.samples.map((entry) => [entry._id, normalizeSample(entry)])));
      setEditReports(Object.fromEntries(data.reports.map((entry) => [entry._id, normalizeReport(entry)])));
    } catch (e) {
      setDetailsError(e.response?.data?.error || 'Failed to load dashboard data');
    }
  };

  const loadDetails = async (key) => {
    setActiveDetails(key);
    setDetailsError('');
    setDetailsLoading(true);
    try {
      await fetchData();
    } finally {
      setDetailsLoading(false);
    }
  };

  const createUser = async () => {
    try {
      await API.post('/auth/create-user', newUser);
      setMessage('User created');
      setNewUser({ username: '', password: '', role: 'sqm', name: '', assignedDivision: 'BHOPAL' });
      await fetchData();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error');
    }
  };

  const saveUser = async (id) => {
    try {
      await API.put(`/admin/users/${id}`, editUsers[id]);
      setMessage('User updated');
      await fetchData();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to update user');
    }
  };

  const deleteUser = async (id) => {
    try {
      await API.delete(`/admin/users/${id}`);
      setMessage('User deleted');
      await fetchData();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const saveSubmission = async (id) => {
    try {
      await API.put(`/admin/submissions/${id}`, editSubmissions[id]);
      setMessage('Submission updated');
      await fetchData();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to update submission');
    }
  };

  const saveSubmissionPhotos = async (id) => {
    const files = submissionPhotoFiles[id] || [];
    if (!files.length) {
      setMessage('Please choose one or more photos first');
      return;
    }

    try {
      setPhotoUploadLoadingId(id);
      const formData = new FormData();
      files.forEach((file) => formData.append('photos', file));

      await API.put(`/admin/submissions/${id}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage('Submission photos updated');
      setSubmissionPhotoFiles((prev) => ({ ...prev, [id]: [] }));
      await fetchData();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to update submission photos');
    } finally {
      setPhotoUploadLoadingId('');
    }
  };

  const deleteSubmission = async (id) => {
    try {
      await API.delete(`/admin/submissions/${id}`);
      setMessage('Submission deleted');
      await fetchData();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to delete submission');
    }
  };

  const saveSample = async (id) => {
    try {
      await API.put(`/admin/samples/${id}`, {
        ...editSamples[id],
        numberOfCores: editSamples[id].numberOfCores === '' ? null : Number(editSamples[id].numberOfCores)
      });
      setMessage('Sample updated');
      await fetchData();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to update sample');
    }
  };

  const deleteSample = async (id) => {
    try {
      await API.delete(`/admin/samples/${id}`);
      setMessage('Sample deleted');
      await fetchData();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to delete sample');
    }
  };

  const saveReport = async (id) => {
    try {
      await API.put(`/admin/reports/${id}`, editReports[id]);
      setMessage('Report updated');
      await fetchData();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to update report');
    }
  };

  const deleteReport = async (id) => {
    try {
      await API.delete(`/admin/reports/${id}`);
      setMessage('Report deleted');
      await fetchData();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to delete report');
    }
  };

  const allUsers = users || [];
  const sqmUsers = allUsers.filter((entry) => entry.role === 'sqm');
  const spbUsers = allUsers.filter((entry) => entry.role === 'spb');
  const labUsers = allUsers.filter((entry) => entry.role === 'lab');

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{isSuperAdmin ? 'Super Admin' : 'Admin'}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {isSuperAdmin ? 'Manage all users, submissions, samples and reports.' : 'View dashboard data and create users.'}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Overview</h3>
          <div className="mt-1 text-xs text-slate-500">Open any section to review or edit records</div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {[
              ['users', overview?.users],
              ['submissions', overview?.submissions],
              ['samples', overview?.samples],
              ['reports', overview?.reports]
            ].map(([key, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => loadDetails(key)}
                className={`text-left rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200 ${
                  activeDetails === key ? 'ring-blue-300 bg-blue-50/40' : ''
                }`}
              >
                <div className="text-xs text-slate-500">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{count ?? '-'}</div>
              </button>
            ))}
          </div>

          {message && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {message}
            </div>
          )}

          {detailsError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {detailsError}
            </div>
          )}

          {detailsLoading && <div className="mt-4 text-xs text-slate-500">Loading...</div>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900">Create User</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <EditableField label="Username" value={newUser.username} onChange={(value) => setNewUser({ ...newUser, username: value })} />
            <EditableField label="Password" type="password" value={newUser.password} onChange={(value) => setNewUser({ ...newUser, password: value })} />
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
                {roleOptions
                  .filter((entry) => isSuperAdmin || entry !== 'super_admin')
                  .map((entry) => (
                    <option key={entry} value={entry}>
                      {entry.toUpperCase()}
                    </option>
                  ))}
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
                  {(options?.divisions || ['BHOPAL', 'NARMADAPURAM']).map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block md:col-span-2 lg:col-span-3">
              <span className="text-xs font-medium text-slate-700">Full name</span>
              <input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="mt-4">
            <button
              onClick={createUser}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              Create user
            </button>
          </div>
        </div>
      </div>

      {activeDetails === 'users' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Users</h3>
            <div className="text-xs text-slate-500">{users.length} total</div>
          </div>
          <div className="mt-4 space-y-4">
            {users.map((entry) => (
              <div key={entry._id} className="rounded-2xl border border-slate-200 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <EditableField
                    label="Username"
                    value={editUsers[entry._id]?.username || ''}
                    onChange={(value) => setEditUsers({ ...editUsers, [entry._id]: { ...editUsers[entry._id], username: value } })}
                    disabled={!isSuperAdmin}
                  />
                  <EditableField
                    label="Name"
                    value={editUsers[entry._id]?.name || ''}
                    onChange={(value) => setEditUsers({ ...editUsers, [entry._id]: { ...editUsers[entry._id], name: value } })}
                    disabled={!isSuperAdmin}
                  />
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700">Role</span>
                    <select
                      value={editUsers[entry._id]?.role || 'sqm'}
                      disabled={!isSuperAdmin}
                      onChange={(e) =>
                        setEditUsers({
                          ...editUsers,
                          [entry._id]: {
                            ...editUsers[entry._id],
                            role: e.target.value,
                            assignedDivision: e.target.value === 'sqm' ? (editUsers[entry._id]?.assignedDivision || 'BHOPAL') : ''
                          }
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                    >
                      {roleOptions
                        .filter((role) => isSuperAdmin || role !== 'super_admin')
                        .map((role) => (
                          <option key={role} value={role}>
                            {role.toUpperCase()}
                          </option>
                        ))}
                    </select>
                  </label>
                  {editUsers[entry._id]?.role === 'sqm' && (
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700">Assigned division</span>
                      <select
                        value={editUsers[entry._id]?.assignedDivision || ''}
                        disabled={!isSuperAdmin}
                        onChange={(e) => setEditUsers({ ...editUsers, [entry._id]: { ...editUsers[entry._id], assignedDivision: e.target.value } })}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                      >
                        {(options?.divisions || ['BHOPAL', 'NARMADAPURAM']).map((division) => (
                          <option key={division} value={division}>
                            {division}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <EditableField
                    label="New password"
                    type="password"
                    value={editUsers[entry._id]?.password || ''}
                    onChange={(value) => setEditUsers({ ...editUsers, [entry._id]: { ...editUsers[entry._id], password: value } })}
                    disabled={!isSuperAdmin}
                  />
                </div>

                {isSuperAdmin && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => saveUser(entry._id)}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Save user
                    </button>
                    <button
                      onClick={() => deleteUser(entry._id)}
                      className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                    >
                      Delete user
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {activeDetails === 'submissions' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Submissions</h3>
            <div className="text-xs text-slate-500">{submissions.length} total</div>
          </div>
          <div className="mt-4 space-y-4">
            {submissions.map((entry) => (
              <div key={entry._id} className="rounded-2xl border border-slate-200 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <EditableField label="Series number" value={editSubmissions[entry._id]?.seriesNumber || ''} onChange={(value) => setEditSubmissions({ ...editSubmissions, [entry._id]: { ...editSubmissions[entry._id], seriesNumber: value } })} disabled={!isSuperAdmin} />
                  <EditableField label="Division" value={editSubmissions[entry._id]?.division || ''} onChange={(value) => setEditSubmissions({ ...editSubmissions, [entry._id]: { ...editSubmissions[entry._id], division: value } })} disabled={!isSuperAdmin} />
                  <EditableField label="District" value={editSubmissions[entry._id]?.district || ''} onChange={(value) => setEditSubmissions({ ...editSubmissions, [entry._id]: { ...editSubmissions[entry._id], district: value } })} disabled={!isSuperAdmin} />
                  <EditableField label="Urban local body" value={editSubmissions[entry._id]?.urbanLocalBody || ''} onChange={(value) => setEditSubmissions({ ...editSubmissions, [entry._id]: { ...editSubmissions[entry._id], urbanLocalBody: value } })} disabled={!isSuperAdmin} />
                  <EditableField label="Project name" value={editSubmissions[entry._id]?.projectName || ''} onChange={(value) => setEditSubmissions({ ...editSubmissions, [entry._id]: { ...editSubmissions[entry._id], projectName: value } })} disabled={!isSuperAdmin} />
                  <EditableField label="Road type" value={editSubmissions[entry._id]?.roadType || ''} onChange={(value) => setEditSubmissions({ ...editSubmissions, [entry._id]: { ...editSubmissions[entry._id], roadType: value } })} disabled={!isSuperAdmin} />
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700">Status</span>
                    <select
                      value={editSubmissions[entry._id]?.status || 'submitted'}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setEditSubmissions({ ...editSubmissions, [entry._id]: { ...editSubmissions[entry._id], status: e.target.value } })}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700">SQM user</span>
                    <select
                      value={editSubmissions[entry._id]?.sqmId || ''}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setEditSubmissions({ ...editSubmissions, [entry._id]: { ...editSubmissions[entry._id], sqmId: e.target.value } })}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                    >
                      <option value="">Select SQM</option>
                      {sqmUsers.map((sqm) => (
                        <option key={sqm._id} value={sqm._id}>
                          {sqm.name || sqm.username}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700">Assigned SPB</span>
                    <select
                      value={editSubmissions[entry._id]?.assignedToSPB || ''}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setEditSubmissions({ ...editSubmissions, [entry._id]: { ...editSubmissions[entry._id], assignedToSPB: e.target.value } })}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                    >
                      <option value="">Select SPB</option>
                      {spbUsers.map((spb) => (
                        <option key={spb._id} value={spb._id}>
                          {spb.name || spb.username}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Submission photos</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Replacing photos here updates the same submission record, so SPB and other users will see the new images.
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">{entry.photos?.length || 0} current</div>
                  </div>

                  {entry.photos?.length ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                      {entry.photos.map((photo, index) => (
                        <button
                          key={`${entry._id}-photo-${index}`}
                          type="button"
                          onClick={() => setPreviewImageUrl(resolveAssetUrl(photo, import.meta.env.VITE_API_BASE))}
                          className="overflow-hidden rounded-lg ring-1 ring-slate-200"
                          title="Click to view full image"
                        >
                          <img
                            src={resolveAssetUrl(photo, import.meta.env.VITE_API_BASE)}
                            alt={`submission ${entry.seriesNumber || entry._id} photo ${index + 1}`}
                            className="h-20 w-full cursor-zoom-in object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-slate-500">No photos available for this submission.</div>
                  )}

                  {isSuperAdmin && (
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <label className="block flex-1">
                        <span className="text-xs font-medium text-slate-700">Replace photos</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) =>
                            setSubmissionPhotoFiles({
                              ...submissionPhotoFiles,
                              [entry._id]: Array.from(e.target.files || [])
                            })
                          }
                          className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
                        />
                        <div className="mt-1 text-xs text-slate-500">
                          Select up to 6 images. Saving will replace the current images for everyone.
                        </div>
                        {submissionPhotoFiles[entry._id]?.length ? (
                          <div className="mt-1 text-xs text-emerald-700">
                            {submissionPhotoFiles[entry._id].length} new photo(s) selected
                          </div>
                        ) : null}
                      </label>

                      <button
                        type="button"
                        onClick={() => saveSubmissionPhotos(entry._id)}
                        disabled={photoUploadLoadingId === entry._id}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                      >
                        {photoUploadLoadingId === entry._id ? 'Updating photos...' : 'Replace photos'}
                      </button>
                    </div>
                  )}
                </div>

                {isSuperAdmin && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => saveSubmission(entry._id)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save submission</button>
                    <button onClick={() => deleteSubmission(entry._id)} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">Delete submission</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {activeDetails === 'samples' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Samples</h3>
            <div className="text-xs text-slate-500">{samples.length} total</div>
          </div>
          <div className="mt-4 space-y-4">
            {samples.map((entry) => (
              <div key={entry._id} className="rounded-2xl border border-slate-200 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <EditableField label="Sample code" value={editSamples[entry._id]?.sampleCode || ''} onChange={(value) => setEditSamples({ ...editSamples, [entry._id]: { ...editSamples[entry._id], sampleCode: value } })} disabled={!isSuperAdmin} />
                  <EditableField label="Submission id" value={editSamples[entry._id]?.submission || ''} onChange={(value) => setEditSamples({ ...editSamples, [entry._id]: { ...editSamples[entry._id], submission: value } })} disabled={!isSuperAdmin} />
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700">SPB user</span>
                    <select
                      value={editSamples[entry._id]?.spbId || ''}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setEditSamples({ ...editSamples, [entry._id]: { ...editSamples[entry._id], spbId: e.target.value } })}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                    >
                      <option value="">Select SPB</option>
                      {spbUsers.map((spb) => (
                        <option key={spb._id} value={spb._id}>
                          {spb.name || spb.username}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700">Lab user</span>
                    <select
                      value={editSamples[entry._id]?.labAssigned || ''}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setEditSamples({ ...editSamples, [entry._id]: { ...editSamples[entry._id], labAssigned: e.target.value } })}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                    >
                      <option value="">Select lab</option>
                      {labUsers.map((lab) => (
                        <option key={lab._id} value={lab._id}>
                          {lab.name || lab.username}
                        </option>
                      ))}
                    </select>
                  </label>
                  <EditableField label="Thickness" value={editSamples[entry._id]?.thickness || ''} onChange={(value) => setEditSamples({ ...editSamples, [entry._id]: { ...editSamples[entry._id], thickness: value } })} disabled={!isSuperAdmin} />
                  <EditableField label="Number of cores" value={editSamples[entry._id]?.numberOfCores ?? ''} onChange={(value) => setEditSamples({ ...editSamples, [entry._id]: { ...editSamples[entry._id], numberOfCores: value } })} disabled={!isSuperAdmin} />
                  <EditableField label="Strength" value={editSamples[entry._id]?.strength || ''} onChange={(value) => setEditSamples({ ...editSamples, [entry._id]: { ...editSamples[entry._id], strength: value } })} disabled={!isSuperAdmin} />
                  <EditableField label="Diameter" value={editSamples[entry._id]?.diameter || ''} onChange={(value) => setEditSamples({ ...editSamples, [entry._id]: { ...editSamples[entry._id], diameter: value } })} disabled={!isSuperAdmin} />
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700">Status</span>
                    <select
                      value={editSamples[entry._id]?.status || 'assigned'}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setEditSamples({ ...editSamples, [entry._id]: { ...editSamples[entry._id], status: e.target.value } })}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                    >
                      {sampleStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {isSuperAdmin && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => saveSample(entry._id)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save sample</button>
                    <button onClick={() => deleteSample(entry._id)} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">Delete sample</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {activeDetails === 'reports' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Reports</h3>
            <div className="text-xs text-slate-500">{reports.length} total</div>
          </div>
          <div className="mt-4 space-y-4">
            {reports.map((entry) => (
              <div key={entry._id} className="rounded-2xl border border-slate-200 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <EditableField label="Sample id" value={editReports[entry._id]?.sample || ''} onChange={(value) => setEditReports({ ...editReports, [entry._id]: { ...editReports[entry._id], sample: value } })} disabled={!isSuperAdmin} />
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700">Lab user</span>
                    <select
                      value={editReports[entry._id]?.labId || ''}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setEditReports({ ...editReports, [entry._id]: { ...editReports[entry._id], labId: e.target.value } })}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                    >
                      <option value="">Select lab</option>
                      {labUsers.map((lab) => (
                        <option key={lab._id} value={lab._id}>
                          {lab.name || lab.username}
                        </option>
                      ))}
                    </select>
                  </label>
                  <EditableField label="Report file URL" value={editReports[entry._id]?.reportFile || ''} onChange={(value) => setEditReports({ ...editReports, [entry._id]: { ...editReports[entry._id], reportFile: value } })} disabled={!isSuperAdmin} />
                  <label className="block md:col-span-2">
                    <span className="text-xs font-medium text-slate-700">Remarks</span>
                    <textarea
                      value={editReports[entry._id]?.remarks || ''}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setEditReports({ ...editReports, [entry._id]: { ...editReports[entry._id], remarks: e.target.value } })}
                      className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                    />
                  </label>
                </div>

                {isSuperAdmin && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => saveReport(entry._id)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save report</button>
                    <button onClick={() => deleteReport(entry._id)} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">Delete report</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <ImagePreviewModal
        imageUrl={previewImageUrl}
        alt="Submission photo preview"
        onClose={() => setPreviewImageUrl('')}
      />
    </div>
  );
}
