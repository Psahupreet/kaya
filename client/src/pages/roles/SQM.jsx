import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import ImagePreviewModal from '../../components/ImagePreviewModal';
import { resolveAssetUrl } from '../../utils/assets';

const OTHER_PROJECT_VALUE = '__OTHER__';

export default function SQMPage({ options, user }) {
  const [form, setForm] = useState({
    division: '',
    district: '',
    urbanLocalBody: '',
    projectName: '',
    roadType: ''
  });
  const [customProjectName, setCustomProjectName] = useState('');
  const [photos, setPhotos] = useState([]);
  const [message, setMessage] = useState('');
  const [mySubs, setMySubs] = useState([]);
  const [previewImageUrl, setPreviewImageUrl] = useState('');

  // Derived options for dependent selects
  const [divisionOptions, setDivisionOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [ulbOptions, setUlbOptions] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [roadTypeOptions, setRoadTypeOptions] = useState([]);

  useEffect(() => {
    // load options from props
    if (options) {
      const allDivisions = options.divisions || [];
      const allowedDivisions = user?.assignedDivision
        ? allDivisions.filter((d) => d === user.assignedDivision)
        : allDivisions;
      setDivisionOptions(allowedDivisions);
      setRoadTypeOptions(options.roadTypes || []);
      // default district list: empty until division chosen
      setDistrictOptions([]);
      setUlbOptions([]);
      setProjectOptions([]);
      if (user?.assignedDivision) {
        onDivisionChange(user.assignedDivision);
      }
    }
    fetchMy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, user?.assignedDivision]);

  const fetchMy = async () => {
    try {
      const r = await API.get('/sqm/my');
      setMySubs(r.data);
    } catch (e) {
      // ignore
    }
  };

  const handleFile = (e) => {
    setPhotos(e.target.files);
  };

  const onDivisionChange = (value) => {
    setForm(prev => ({ ...prev, division: value, district: '', urbanLocalBody: '', projectName: '' }));
    setCustomProjectName('');

    // districts for division
    const districts = options?.districtsByDivision?.[value] || [];
    setDistrictOptions(districts);

    // reset ULB and projects until district selected
    setUlbOptions([]);
    setProjectOptions([]);
  };

  const onDistrictChange = (value) => {
    setForm(prev => ({ ...prev, district: value, urbanLocalBody: '', projectName: '' }));
    setCustomProjectName('');

    // ULBs for division+district
    const ulbs = options?.ulbsByDivisionAndDistrict?.[form.division]?.[value] || [];
    setUlbOptions(ulbs);

    // reset projects until ULB selected
    setProjectOptions([]);
  };

  const onUlbChange = (value) => {
    setForm(prev => ({ ...prev, urbanLocalBody: value, projectName: '' }));
    setCustomProjectName('');

    // projects for ULB
    const projects = options?.projectsByULB?.[value] || [];
    setProjectOptions(projects);
  };

  const submit = async (e) => {
    e.preventDefault();
    const isOtherSelected = form.projectName === OTHER_PROJECT_VALUE;
    const finalProjectName = isOtherSelected ? customProjectName.trim() : form.projectName.trim();

    if (!form.division || !form.district || !form.urbanLocalBody || !finalProjectName) {
      setMessage('Please fill division, district, ULB and project.');
      return;
    }
    const fd = new FormData();
    Object.keys(form).forEach((k) => {
      if (k === 'projectName') {
        fd.append(k, finalProjectName);
      } else {
        fd.append(k, form[k]);
      }
    });
    for (let i = 0; i < photos.length; i++) fd.append('photos', photos[i]);
    try {
      const res = await API.post('/sqm/submit', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage(`Submitted. Series number: ${res.data.seriesNumber}`);
      fetchMy();
      // reset form
      setForm({
        division: '',
        district: '',
        urbanLocalBody: '',
        projectName: '',
        roadType: ''
      });
      setCustomProjectName('');
      setDistrictOptions([]);
      setUlbOptions([]);
      setProjectOptions([]);
      setPhotos([]);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Submit failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">SQM</h2>
        <p className="mt-1 text-sm text-slate-600">Create a new submission and review your past submissions.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">New submission</h3>
            <p className="mt-1 text-xs text-slate-500">Fill the required fields and upload 3–4 photos.</p>
          </div>
          <div className="text-xs text-slate-500">
            {options ? 'Options loaded' : 'Loading options…'}
          </div>
        </div>

        <form onSubmit={submit} className="mt-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-700">Division</span>
              <select
                value={form.division}
                onChange={(e) => onDivisionChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                disabled={Boolean(user?.assignedDivision)}
              >
                <option value="">Select</option>
                {divisionOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {user?.assignedDivision && (
                <div className="mt-1 text-xs text-slate-500">
                  Assigned division: {user.assignedDivision}
                </div>
              )}
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">District</span>
              <select
                value={form.district}
                onChange={(e) => onDistrictChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
                disabled={!districtOptions.length}
              >
                <option value="">Select</option>
                {districtOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Urban Local Body</span>
              <select
                value={form.urbanLocalBody}
                onChange={(e) => onUlbChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
                disabled={!ulbOptions.length}
              >
                <option value="">Select</option>
                {ulbOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Project name</span>
              <select
                value={form.projectName}
                onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
                disabled={!form.urbanLocalBody}
              >
                <option value="">Select</option>
                {projectOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value={OTHER_PROJECT_VALUE}>Others</option>
              </select>
              {form.projectName === OTHER_PROJECT_VALUE && (
                <input
                  value={customProjectName}
                  onChange={(e) => setCustomProjectName(e.target.value)}
                  placeholder="Enter project name"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              )}
            </label>

            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-slate-700">Road type</span>
              <select
                value={form.roadType}
                onChange={(e) => setForm({ ...form, roadType: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Select</option>
                {roadTypeOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-slate-700">Photos (3–4)</span>
              <input
                multiple
                onChange={handleFile}
                type="file"
                accept="image/*"
                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200">
              Submit
            </button>
            {message && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {message}
              </div>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">My submissions</h3>
          <div className="text-xs text-slate-500">{mySubs.length} items</div>
        </div>

        {mySubs.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            No submissions yet.
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {mySubs.map((s) => (
              <li key={s._id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{s.seriesNumber}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {s.projectName} {s.roadType ? <span className="text-slate-400">—</span> : null}{' '}
                      {s.roadType}
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    {s.status || '—'}
                  </span>
                </div>

                {s.photos?.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {s.photos.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPreviewImageUrl(resolveAssetUrl(p, import.meta.env.VITE_API_BASE))}
                        className="overflow-hidden rounded-xl ring-1 ring-slate-200"
                        title="Click to view full image"
                      >
                        <img
                          src={resolveAssetUrl(p, import.meta.env.VITE_API_BASE)}
                          alt="photo"
                          className="h-24 w-full cursor-zoom-in object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-slate-500">No photos attached.</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ImagePreviewModal
        imageUrl={previewImageUrl}
        alt="Submission photo preview"
        onClose={() => setPreviewImageUrl('')}
      />
    </div>
  );
}
