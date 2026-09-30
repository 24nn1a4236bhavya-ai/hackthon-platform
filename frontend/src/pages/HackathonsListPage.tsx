import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Plus, Search, Calendar, Users } from 'lucide-react';
import { hackathonsApi } from '../services/api';
import { Hackathon, HackathonStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export const HackathonsListPage: React.FC = () => {
  const { user } = useAuth();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: '',
    tagline: '',
    description: '',
    banner_url: '',
    registration_start: new Date().toISOString().slice(0, 16),
    registration_deadline: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16),
    submission_deadline: new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 16),
    judging_deadline: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 16),
    min_team_size: 1,
    max_team_size: 4,
    is_community_voting_enabled: true,
  });

  const fetchHackathons = () => {
    setLoading(true);
    const statusParam = selectedStatus === 'ALL' ? undefined : selectedStatus;
    hackathonsApi
      .list(statusParam, searchQuery || undefined)
      .then((data) => setHackathons(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHackathons();
  }, [selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHackathons();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await hackathonsApi.create(createForm);
      setIsCreateOpen(false);
      fetchHackathons();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create hackathon');
    } finally {
      setCreating(false);
    }
  };

  const statusTabs = [
    { id: 'ALL', label: 'All Hackathons' },
    { id: 'REGISTRATION_OPEN', label: 'Registration Open' },
    { id: 'SUBMISSION_OPEN', label: 'Submissions Open' },
    { id: 'JUDGING', label: 'Judging' },
    { id: 'COMPLETED', label: 'Completed' },
  ];

  const canCreate = user && ['ORGANIZER', 'ADMIN'].includes(user.role);

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Hackathons</h1>
          <p className="text-sm text-slate-400 mt-1">Browse, register, and compete in competitions</p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition shadow-lg shadow-brand-600/30 flex items-center gap-2 self-start"
          >
            <Plus className="w-4 h-4" />
            Create Hackathon
          </button>
        )}
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedStatus === tab.id
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search by title or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-brand-500 focus:outline-none text-xs text-white placeholder-slate-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
        </form>
      </div>

      {/* Hackathons Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading hackathons...</div>
      ) : hackathons.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No hackathons found</h3>
          <p className="text-xs text-slate-500 mt-1">Try changing your filter or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hackathons.map((h) => (
            <Link
              key={h.id}
              to={`/hackathons/${h.slug}`}
              className="group bg-slate-900 border border-slate-800 hover:border-brand-500/50 rounded-2xl overflow-hidden transition shadow-xl flex flex-col justify-between"
            >
              {h.banner_url ? (
                <div className="h-44 w-full overflow-hidden bg-slate-950">
                  <img
                    src={h.banner_url}
                    alt={h.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>
              ) : (
                <div className="h-32 w-full bg-gradient-to-r from-brand-950 to-slate-900 flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-brand-500/40" />
                </div>
              )}

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <StatusBadge status={h.status} />
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(h.submission_deadline).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-brand-300 transition line-clamp-1">
                    {h.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {h.tagline}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Team: {h.min_team_size} - {h.max_team_size}</span>
                  </div>
                  <span className="text-brand-400 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                    View Hackathon &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Hackathon Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Hackathon" maxWidth="lg">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
            <input
              type="text"
              required
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              placeholder="e.g. Decentralized AI Hackathon"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tagline</label>
            <input
              type="text"
              required
              value={createForm.tagline}
              onChange={(e) => setCreateForm({ ...createForm, tagline: e.target.value })}
              placeholder="A brief punchy hook"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Markdown)</label>
            <textarea
              required
              rows={4}
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Provide event details, rules, and overview..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Registration Closes</label>
              <input
                type="datetime-local"
                required
                value={createForm.registration_deadline}
                onChange={(e) => setCreateForm({ ...createForm, registration_deadline: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Submission Deadline</label>
              <input
                type="datetime-local"
                required
                value={createForm.submission_deadline}
                onChange={(e) => setCreateForm({ ...createForm, submission_deadline: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Judging Deadline</label>
              <input
                type="datetime-local"
                required
                value={createForm.judging_deadline}
                onChange={(e) => setCreateForm({ ...createForm, judging_deadline: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Image URL</label>
              <input
                type="url"
                value={createForm.banner_url}
                onChange={(e) => setCreateForm({ ...createForm, banner_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="comm_vote"
              checked={createForm.is_community_voting_enabled}
              onChange={(e) =>
                setCreateForm({ ...createForm, is_community_voting_enabled: e.target.checked })
              }
              className="rounded bg-slate-950 border-slate-800 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="comm_vote" className="text-xs text-slate-300">
              Enable Community Upvoting
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Draft Hackathon'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
