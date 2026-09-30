import React from 'react';
import { UserRole } from '../types';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'sm' }) => {
  const configs: Record<UserRole, { label: string; bg: string; text: string; border: string }> = {
    ADMIN: {
      label: 'Admin',
      bg: 'bg-purple-950/60',
      text: 'text-purple-300',
      border: 'border-purple-700/50',
    },
    ORGANIZER: {
      label: 'Organizer',
      bg: 'bg-amber-950/60',
      text: 'text-amber-300',
      border: 'border-amber-700/50',
    },
    JUDGE: {
      label: 'Judge',
      bg: 'bg-cyan-950/60',
      text: 'text-cyan-300',
      border: 'border-cyan-700/50',
    },
    PARTICIPANT: {
      label: 'Participant',
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-300',
      border: 'border-emerald-700/50',
    },
  };

  const c = configs[role] || configs.PARTICIPANT;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${c.bg} ${c.text} ${c.border} ${sizeClasses}`}
    >
      {c.label}
    </span>
  );
};
