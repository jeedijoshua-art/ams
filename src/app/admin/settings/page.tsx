'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role } from '@prisma/client';
import { Settings, Save, Loader2, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function AdminSettingsPage() {
  const [threshold, setThreshold] = useState(75);
  const [term, setTerm] = useState('');
  const [institution, setInstitution] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.threshold) setThreshold(data.threshold);
        if (data.term) setTerm(data.term);
        if (data.institution) setInstitution(data.institution);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: Number(threshold) }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: `Attendance threshold updated to ${data.threshold}%. All student warning alerts will now trigger at this benchmark.`,
        });
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to update threshold.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex">
        <Sidebar role={Role.ADMIN} />

        <main className="flex-1 p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Settings className="w-7 h-7 text-teal-400" />
              Institutional Configuration
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Configure global academic thresholds and regulatory attendance policies.
            </p>
          </div>

          {feedback && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              )}
              <span className="text-xs font-medium">{feedback.text}</span>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-400 mb-2" />
              <p className="text-xs">Loading institutional settings...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Threshold Configuration Card */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white">Minimum Attendance Threshold</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      Students whose calculated attendance falls below this benchmark will receive
                      automatic high-risk warning banners, and their profiles will be flagged in
                      faculty reports.
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative w-40">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="0.5"
                        required
                        value={threshold}
                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-lg font-black text-teal-400 focus:outline-none focus:border-teal-500 pr-10"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                        %
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {[65, 75, 80, 85].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setThreshold(val)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            threshold === val
                              ? 'bg-teal-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {val}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Threshold Policy
                  </button>
                </form>
              </div>

              {/* Institution Metadata */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white">Academic Term Telemetry</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block mb-1">Affiliated Institution</span>
                    <span className="font-semibold text-slate-200">{institution}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block mb-1">Active Academic Term</span>
                    <span className="font-semibold text-teal-400">{term}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
