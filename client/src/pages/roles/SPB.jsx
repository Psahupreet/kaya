import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import ImagePreviewModal from '../../components/ImagePreviewModal';
import { resolveAssetUrl } from '../../utils/assets';

export default function SPBPage() {
  const [subs, setSubs] = useState([]);
  const [labs, setLabs] = useState([]);
  const [mySamples, setMySamples] = useState([]);
  const [nextPreferredLabId, setNextPreferredLabId] = useState('');
  const [nextPreferredLabUsername, setNextPreferredLabUsername] = useState('');
  const [selected, setSelected] = useState(null);
  const [sampleForm, setSampleForm] = useState({ thickness:'', numberOfCores:'', strength:'', diameter:'', labId: '' });
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState('');

  useEffect(()=> {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const r1 = await API.get('/spb/submissions');
      setSubs(r1.data);
      const r2 = await API.get('/spb/labs');
      setLabs(r2.data?.labs || []);
      setNextPreferredLabId(r2.data?.nextPreferredLabId || '');
      setNextPreferredLabUsername(r2.data?.nextPreferredLabUsername || '');
      const r3 = await API.get('/spb/samples');
      setMySamples(r3.data);
    } catch (e) {
      // ignore
    }
  };

  const startAssign = (sub) => {
    setSelected(sub);
    setMessage('');
    setFormError('');
    setSampleForm({
      thickness:'',
      numberOfCores:'',
      strength:'',
      diameter:'',
      labId: nextPreferredLabId || labs[0]?._id || ''
    });
  };

  const isSafeText = (value) => {
    // Allow digits, spaces, dot, comma, slash, and dash, plus common unit text like "mm"
    return /^[0-9\s.,\-\/a-zA-Z]*$/.test(value);
  };

  const submitAssign = async () => {
    setFormError('');
    if (!sampleForm.labId) {
      setFormError('Please select a lab.');
      return;
    }
    if (!isSafeText(sampleForm.thickness) || !isSafeText(sampleForm.diameter)) {
      setFormError('Thickness/Diameter can contain only numbers, spaces, comma, dot, dash, slash and unit text (e.g. "100-120 mm").');
      return;
    }
    if (sampleForm.numberOfCores && Number.isNaN(Number.parseInt(sampleForm.numberOfCores, 10))) {
      setFormError('Number of cores must be a number (e.g. 3).');
      return;
    }
    try {
      await API.post('/spb/assign-sample', {
        submissionId: selected._id,
        labId: sampleForm.labId,
        thickness: sampleForm.thickness,
        numberOfCores: sampleForm.numberOfCores,
        strength: sampleForm.strength,
        diameter: sampleForm.diameter
      });
      const assignedLab = labs.find((lab) => lab._id === sampleForm.labId);
      setMessage(`Assigned to ${assignedLab?.name || assignedLab?.username || 'selected lab'}`);
      setSelected(null);
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">SPB</h2>
          <p className="mt-1 text-sm text-slate-600">Assign samples to labs for testing.</p>
        </div>
        <button
          onClick={fetchData}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Submissions</h3>
            <div className="text-xs text-slate-500">{subs.length} items</div>
          </div>

          {subs.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              No submissions available.
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {subs.map((s) => (
                <li key={s._id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{s.seriesNumber}</div>
                      <div className="mt-1 text-sm text-slate-600">{s.projectName}</div>
                      {s.roadType && <div className="mt-1 text-xs text-slate-500">Road type: {s.roadType}</div>}
                    </div>
                    <button
                      onClick={() => startAssign(s)}
                      className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
                    >
                      Assign
                    </button>
                  </div>
                  {s.photos?.length ? (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {s.photos.slice(0, 4).map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPreviewImageUrl(resolveAssetUrl(p, import.meta.env.VITE_API_BASE))}
                          className="overflow-hidden rounded-lg ring-1 ring-slate-200"
                          title="Click to view full image"
                        >
                          <img
                            src={resolveAssetUrl(p, import.meta.env.VITE_API_BASE)}
                            alt="submission"
                            className="h-16 w-full cursor-zoom-in object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Assign sample</h3>

          {!selected ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Select a submission from the left to assign it to a lab.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs text-slate-500">Assigning</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{selected.seriesNumber}</div>
                <div className="mt-1 text-sm text-slate-600">{selected.projectName}</div>
                {selected.photos?.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {selected.photos.slice(0, 3).map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPreviewImageUrl(resolveAssetUrl(p, import.meta.env.VITE_API_BASE))}
                        className="overflow-hidden rounded-lg ring-1 ring-slate-200"
                        title="Click to view full image"
                      >
                        <img
                          src={resolveAssetUrl(p, import.meta.env.VITE_API_BASE)}
                          alt="selected submission"
                          className="h-16 w-full cursor-zoom-in object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <label className="block">
                <span className="text-xs font-medium text-slate-700">Lab</span>
                <select
                  value={sampleForm.labId}
                  onChange={(e) => setSampleForm({ ...sampleForm, labId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">Select Lab</option>
                  {labs.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.name || l.username}
                    </option>
                  ))}
                </select>
                {labs.length === 0 && (
                  <div className="mt-1 text-xs text-amber-700">No labs found. Create lab users first.</div>
                )}
                {nextPreferredLabUsername && (
                  <div className="mt-1 text-xs text-emerald-700">
                    Next alternating lab: {nextPreferredLabUsername}
                  </div>
                )}
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-slate-700">Thickness</span>
                  <input
                    value={sampleForm.thickness}
                    onChange={(e) => setSampleForm({ ...sampleForm, thickness: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder='e.g. "100-120 mm" or "100,120 MM"'
                  />
                  <div className="mt-1 text-xs text-slate-500">You can enter single value or range/multiple values.</div>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-700">Number of cores</span>
                  <input
                    value={sampleForm.numberOfCores}
                    onChange={(e) => setSampleForm({ ...sampleForm, numberOfCores: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="e.g. 3"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-700">Strength</span>
                  <input
                    value={sampleForm.strength}
                    onChange={(e) => setSampleForm({ ...sampleForm, strength: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="e.g. M30"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-700">Diameter</span>
                  <input
                    value={sampleForm.diameter}
                    onChange={(e) => setSampleForm({ ...sampleForm, diameter: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder='e.g. "150MM" or "100 mm"'
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={submitAssign}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  disabled={!sampleForm.labId}
                >
                  Assign to lab
                </button>
                <button
                  onClick={() => {
                    setSelected(null);
                    setMessage('');
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {formError && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {formError}
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {message}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">My assigned samples</h3>
          <div className="text-xs text-slate-500">{mySamples.length} items</div>
        </div>

        {mySamples.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            No assigned samples yet.
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {mySamples.map((sample) => (
              <li key={sample._id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">
                      {sample.submission?.seriesNumber || 'Series unavailable'}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Lab: {sample.labAssigned?.name || sample.labAssigned?.username || '—'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Sample ID: {sample.sampleCode || sample._id}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Thickness: {sample.thickness || '—'}
                      <span className="mx-2 text-slate-300">|</span>
                      Cores: {sample.numberOfCores ?? '—'}
                      <span className="mx-2 text-slate-300">|</span>
                      Strength: {sample.strength || '—'}
                      <span className="mx-2 text-slate-300">|</span>
                      Diameter: {sample.diameter || '—'}
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    {sample.status || 'assigned'}
                  </span>
                </div>

                {sample.submission?.photos?.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {sample.submission.photos.slice(0, 4).map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPreviewImageUrl(resolveAssetUrl(p, import.meta.env.VITE_API_BASE))}
                        className="overflow-hidden rounded-lg ring-1 ring-slate-200"
                        title="Click to view full image"
                      >
                        <img
                          src={resolveAssetUrl(p, import.meta.env.VITE_API_BASE)}
                          alt="sample submission"
                          className="h-20 w-full cursor-zoom-in object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-slate-500">No photos available.</div>
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
