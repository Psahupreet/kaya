import React, { useEffect, useState } from 'react';
import API from '../../utils/api';

export default function LabPage() {
  const [samples, setSamples] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reportFile, setReportFile] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [message, setMessage] = useState('');

  useEffect(()=> {
    fetch();
  }, []);

  const fetch = async () => {
    try {
      const r = await API.get('/lab/my-samples');
      setSamples(r.data);
    } catch (e) {
      // ignore
    }
  };

  const submitReport = async () => {
    if (!selected || !reportFile) return setMessage('Select sample and report file');
    const fd = new FormData();
    fd.append('sampleId', selected._id);
    fd.append('remarks', remarks);
    fd.append('report', reportFile);
    try {
      await API.post('/lab/upload-report', fd, { headers: { 'Content-Type': 'multipart/form-data' }});
      setMessage('Report uploaded');
      setSelected(null);
      setReportFile(null);
      setRemarks('');
      fetch();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Upload failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Lab</h2>
          <p className="mt-1 text-sm text-slate-600">Upload test reports for assigned samples.</p>
        </div>
        <button
          onClick={fetch}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Assigned samples</h3>
            <div className="text-xs text-slate-500">{samples.length} items</div>
          </div>

          {samples.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              No samples assigned yet.
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {samples.map((s) => (
                <li key={s._id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">Series: {s.submission?.seriesNumber || '—'}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Serial No: <span className="font-medium text-slate-800">{s.submission?.seriesNumber || '—'}</span>
                        <span className="mx-2 text-slate-300">|</span>
                        Sample ID: <span className="font-medium text-slate-800 break-all">{s.sampleCode || s._id}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        Thickness: <span className="font-medium text-slate-800">{s.thickness || '—'}</span>
                        <span className="mx-2 text-slate-300">|</span>
                        Cores: <span className="font-medium text-slate-800">{s.numberOfCores || '—'}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        Strength: <span className="font-medium text-slate-800">{s.strength || '—'}</span>
                        <span className="mx-2 text-slate-300">|</span>
                        Diameter: <span className="font-medium text-slate-800">{s.diameter || '—'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelected(s);
                        setMessage('');
                      }}
                      className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
                    >
                      Upload report
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Upload test report</h3>

          {!selected ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Select a sample from the left to upload a report.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-xs text-slate-500">Selected sample</div>
                <div className="mt-1 font-semibold text-slate-900 break-all">{selected.sampleCode || selected._id}</div>
                <div className="mt-1 text-sm text-slate-600">
                  Series: <span className="font-medium text-slate-800">{selected.submission?.seriesNumber || '—'}</span>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Serial No: <span className="font-medium text-slate-800">{selected.submission?.seriesNumber || '—'}</span>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Thickness: <span className="font-medium text-slate-800">{selected.thickness || '—'}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  Cores: <span className="font-medium text-slate-800">{selected.numberOfCores || '—'}</span>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Strength: <span className="font-medium text-slate-800">{selected.strength || '—'}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  Diameter: <span className="font-medium text-slate-800">{selected.diameter || '—'}</span>
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-slate-700">Report file</span>
                <input
                  type="file"
                  onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-700">Remarks</span>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Optional remarks"
                  rows={4}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={submitReport}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                >
                  Upload
                </button>
                <button
                  onClick={() => {
                    setSelected(null);
                    setReportFile(null);
                    setRemarks('');
                    setMessage('');
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {message}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}