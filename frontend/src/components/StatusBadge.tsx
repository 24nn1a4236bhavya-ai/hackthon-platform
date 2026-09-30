import React from 'react';
import { HackathonStatus } from '../types';

interface StatusBadgeProps {
  status: HackathonStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const configs: Record<HackathonStatus, { label: string; bg: string; text: string; dot: string }> = {
    DRAFT: {
      label: 'Draft',
      bg: 'bg-slate-800 text-slate-300 border-slate-700',
      text: 'text-slate-300',
      dot: 'bg-slate-400',
    },
    REGISTRATION_OPEN: {
      label: 'Registration Open',
      bg: 'bg-blue-950/60 text-blue-300 border-blue-800',
      text: 'text-blue-300',
      dot: 'bg-blue-400 animate-pulse',
    },
    SUBMISSION_OPEN: {
      label: 'Submissions Open',
      bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
      text: 'text-emerald-300',
      dot: 'bg-emerald-400 animate-pulse',
    },
    JUDGING: {
      label: 'Judging In Progress',
      bg: 'bg-amber-950/60 text-amber-300 border-amber-800',
      text: 'text-amber-300',
      dot: 'bg-amber-400 animate-pulse',
    },
    VOTING: {
      label: 'Community Voting',
      bg: 'bg-violet-950/60 text-violet-300 border-violet-800',
      text: 'text-violet-300',
      dot: 'bg-violet-400 animate-pulse',
    },
    COMPLETED: {
      label: 'Completed & Winners',
      bg: 'bg-indigo-950/60 text-indigo-300 border-indigo-800',
      text: 'text-indigo-300',
      dot: 'bg-indigo-400',
    },
  };

  const c = configs[status] || configs.DRAFT;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};
