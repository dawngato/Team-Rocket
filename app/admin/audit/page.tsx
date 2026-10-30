'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Search, Filter, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AuditEventItem {
  id: string;
  eventType: string;
  actorRole: string | null;
  outcome: string;
  details: string;
  ipAddress: string | null;
  createdAt: string;
  user?: {
    name: string;
    studentId: string;
    role: string;
  } | null;
}

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    fetch('/api/audit')
      .then((res) => res.json())
      .then((data) => {
        if (data.events) {
          setEvents(data.events);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.user?.name && ev.user.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = filterType === 'ALL' || ev.outcome === filterType;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Tamper-Evident System Audit Trail
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Application Audit Log
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Append-only historical record of security operations, state transitions, duplicate vote
          rejections, and checkpoint commitments. Plaintext ballot selections are strictly excluded
          by design.
        </p>

        {/* Filters */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search event type, actor, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none"
            >
              <option value="ALL">All Outcomes</option>
              <option value="SUCCESS">Success Only</option>
              <option value="REJECTED">Rejected Attempts</option>
              <option value="FAILURE">Failures</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-4">Event Type</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Outcome</th>
                <th className="py-3.5 px-6">Operational Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-6 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                    {new Date(ev.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {ev.eventType}
                  </td>
                  <td className="py-3.5 px-4">
                    {ev.user ? (
                      <div>
                        <span className="font-semibold text-slate-900">{ev.user.name}</span>
                        <span className="block text-[10px] text-slate-400">
                          {ev.user.role} • {ev.user.studentId}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">
                        {ev.actorRole || 'SYSTEM'}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ev.outcome === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : ev.outcome === 'REJECTED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {ev.outcome === 'SUCCESS' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                      )}
                      {ev.outcome}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 font-mono text-[11px] text-slate-600 break-all max-w-md">
                    {ev.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
