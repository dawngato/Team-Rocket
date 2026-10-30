import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';
  let label = status;

  switch (status.toUpperCase()) {
    case 'OPEN':
      colorStyles = 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
      dotColor = 'bg-emerald-500';
      label = 'Voting Open';
      break;
    case 'SCHEDULED':
      colorStyles = 'bg-blue-50 text-blue-800 border-blue-200/80';
      dotColor = 'bg-blue-500';
      label = 'Scheduled';
      break;
    case 'DRAFT':
      colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';
      dotColor = 'bg-slate-400';
      label = 'Draft';
      break;
    case 'CLOSED':
      colorStyles = 'bg-amber-50 text-amber-800 border-amber-200/80';
      dotColor = 'bg-amber-500';
      label = 'Voting Closed';
      break;
    case 'VERIFIED':
      colorStyles = 'bg-teal-50 text-teal-800 border-teal-200/80';
      dotColor = 'bg-teal-500';
      label = 'Audit Verified';
      break;
    case 'PUBLISHED':
      colorStyles = 'bg-indigo-50 text-indigo-800 border-indigo-200/80';
      dotColor = 'bg-indigo-500';
      label = 'Results Published';
      break;
  }

  const sizeStyles =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px]'
      : size === 'lg'
      ? 'px-3 py-1 text-sm'
      : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${colorStyles} ${sizeStyles} tracking-tight shadow-sm`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dotColor} ${
          status.toUpperCase() === 'OPEN' ? 'animate-pulse' : ''
        }`}
      />
      {label}
    </span>
  );
}
