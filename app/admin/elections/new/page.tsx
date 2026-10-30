'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';

interface CandidateDraft {
  name: string;
  department: string;
  academicYear: number;
  shortBio: string;
  manifesto: string;
}

export default function NewElectionPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('University Wide');
  const [academicSession, setAcademicSession] = useState('2025-2026');
  const [category, setCategory] = useState('STUDENT_GOVERNMENT');
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(
    new Date(Date.now() + 7 * 86400 * 1000).toISOString().slice(0, 16)
  );

  const [candidates, setCandidates] = useState<CandidateDraft[]>([
    {
      name: '',
      department: 'Computer Science & Engineering',
      academicYear: 3,
      shortBio: '',
      manifesto: '',
    },
    {
      name: '',
      department: 'School of Law',
      academicYear: 2,
      shortBio: '',
      manifesto: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addCandidate = () => {
    setCandidates([
      ...candidates,
      {
        name: '',
        department: 'General',
        academicYear: 3,
        shortBio: '',
        manifesto: '',
      },
    ]);
  };

  const removeCandidate = (idx: number) => {
    if (candidates.length <= 2) {
      alert('An election must have at least 2 candidates.');
      return;
    }
    setCandidates(candidates.filter((_, i) => i !== idx));
  };

  const updateCandidate = (idx: number, field: keyof CandidateDraft, value: any) => {
    const updated = [...candidates];
    updated[idx] = { ...updated[idx], [field]: value };
    setCandidates(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Title and description are required.');
      return;
    }

    for (let i = 0; i < candidates.length; i++) {
      if (!candidates[i].name.trim()) {
        setErrorMsg(`Candidate #${i + 1} requires a valid name.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/elections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          department,
          academicSession,
          category,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          candidates,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create election');
      }

      router.push(`/admin/elections/${data.election.id}`);
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Overview
      </Link>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configure New Election</h1>
        <p className="text-xs text-slate-500 mt-1">
          Create an election draft. Candidates and eligibility can be configured before opening.
        </p>

        {errorMsg && (
          <div className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Election Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Fall 2026 Student Union General Election"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Description & Purpose *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Provide official election guidelines and voter scope..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Academic Session
                </label>
                <input
                  type="text"
                  value={academicSession}
                  onChange={(e) => setAcademicSession(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="STUDENT_GOVERNMENT">Student Government</option>
                  <option value="COUNCIL">University Council</option>
                  <option value="FACULTY_REP">Faculty Representative</option>
                  <option value="CLUB">Society Delegate</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Voting Start Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Voting End Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Candidates List */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Initial Candidates ({candidates.length})
                </h3>
                <p className="text-xs text-slate-500">At least 2 candidates are required.</p>
              </div>
              <button
                type="button"
                onClick={addCandidate}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Candidate
              </button>
            </div>

            <div className="space-y-4">
              {candidates.map((cand, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Candidate #{idx + 1}
                    </span>
                    {candidates.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeCandidate(idx)}
                        className="text-red-500 hover:text-red-600 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        required
                        placeholder="Full Name"
                        value={cand.name}
                        onChange={(e) => updateCandidate(idx, 'name', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Department"
                        value={cand.department}
                        onChange={(e) => updateCandidate(idx, 'department', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Short Biography & Standing"
                    value={cand.shortBio}
                    onChange={(e) => updateCandidate(idx, 'shortBio', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />

                  <textarea
                    rows={2}
                    placeholder="Official Manifesto Statement"
                    value={cand.manifesto}
                    onChange={(e) => updateCandidate(idx, 'manifesto', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
            <Link
              href="/admin"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Save & Open Election Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
