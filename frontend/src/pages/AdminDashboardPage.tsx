import React, { useEffect, useState } from 'react';
import { Shield, Users, Trophy, Layers, Gavel, CheckCircle2 } from 'lucide-react';
import { adminApi } from '../services/api';
import { User, UserRole } from '../types';
import { RoleBadge } from '../components/RoleBadge';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = () => {
    setLoading(true);
    Promise.all([adminApi.getStats(), adminApi.getUsers()])
      .then(([s, u]) => {
        setStats(s);
        setUsers(u);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    try {
      await adminApi.updateRole(userId, newRole);
      loadAdminData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update user role');
    }
  };

  if (loading) {
    return <div className="text-center py-24 text-slate-500">Loading system admin data...</div>;
  }

  return (
    <div className="space-y-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Shield className="w-7 h-7 text-purple-400" />
          System Administration
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Monitor platform metrics, manage user roles, and inspect system audit state
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold block">Total Users</span>
            <span className="text-2xl font-bold text-white mt-1 block">{stats.total_users}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold block">Hackathons</span>
            <span className="text-2xl font-bold text-white mt-1 block">{stats.total_hackathons}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold block">Teams</span>
            <span className="text-2xl font-bold text-white mt-1 block">{stats.total_teams}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold block">Projects</span>
            <span className="text-2xl font-bold text-white mt-1 block">{stats.total_projects}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold block">Evaluations</span>
            <span className="text-2xl font-bold text-white mt-1 block">{stats.total_evaluations}</span>
          </div>
        </div>
      )}

      {/* User Management Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">User Directory & Role Elevation</h3>
            <p className="text-xs text-slate-400">Assign system-wide roles with backend-enforced RBAC</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800">
            {users.length} registered accounts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold">Current Role</th>
                <th className="py-3 px-4 font-semibold">Joined</th>
                <th className="py-3 px-4 font-semibold text-right">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4">
                    <span className="font-bold text-white block">{u.full_name}</span>
                    <span className="text-[11px] text-slate-500">@{u.username}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{u.email}</td>
                  <td className="py-3 px-4">
                    <RoleBadge role={u.role} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="PARTICIPANT">PARTICIPANT</option>
                      <option value="JUDGE">JUDGE</option>
                      <option value="ORGANIZER">ORGANIZER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
