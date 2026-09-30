import React, { useEffect, useState } from 'react';
import { Sparkles, Search, ThumbsUp, Github, ExternalLink, Filter, Video, FileText } from 'lucide-react';
import { projectsApi, votesApi, hackathonsApi } from '../services/api';
import { Project, ProjectDetail, Hackathon } from '../types';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export const PublicGalleryPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState<number | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeModal, setActiveModal] = useState<ProjectDetail | null>(null);

  useEffect(() => {
    hackathonsApi.list()
      .then((data) => setHackathons(data))
      .catch((err) => console.error(err));
  }, []);

  const fetchProjects = () => {
    setLoading(true);
    projectsApi
      .list({
        status: 'SUBMITTED',
        search: search || undefined,
        hackathon_id: selectedHackathonId !== 'ALL' ? selectedHackathonId : undefined,
      })
      .then((data) => setProjects(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, [selectedHackathonId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProjects();
  };

  const handleVote = async (projectId: number, hackathonId: number) => {
    if (!isAuthenticated) {
      alert('Please log in to vote for projects.');
      return;
    }
    try {
      await votesApi.castVote(hackathonId, projectId);
      fetchProjects();
      if (activeModal && activeModal.id === projectId) {
        setActiveModal({
          ...activeModal,
          vote_count: activeModal.vote_count + 1,
          has_user_voted: true,
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to vote');
    }
  };

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-brand-400" />
            Project Showcase Gallery
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Explore and vote for innovative open-source projects built across hackathons
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Hackathon Selector */}
          <select
            value={selectedHackathonId}
            onChange={(e) => setSelectedHackathonId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-brand-500 focus:outline-none"
          >
            <option value="ALL">All Hackathons</option>
            {hackathons.map((h) => (
              <option key={h.id} value={h.id}>
                {h.title}
              </option>
            ))}
          </select>

          <form onSubmit={handleSearch} className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search by title, tech..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
          </form>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading showcase projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-2xl p-8">
          <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">No project submissions found</h3>
          <p className="text-xs text-slate-500 mt-1">Check back once teams submit their projects!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 hover:border-brand-500/50 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between transition group"
            >
              {p.cover_image_url ? (
                <div className="h-44 w-full overflow-hidden bg-slate-950">
                  <img
                    src={p.cover_image_url}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>
              ) : (
                <div className="h-32 w-full bg-gradient-to-r from-brand-950 to-indigo-950 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-brand-500/30" />
                </div>
              )}

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-brand-300 transition line-clamp-1">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{p.tagline}</p>

                  {p.tech_stack && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {p.tech_stack.split(',').map((tech, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800"
                        >
                          {tech.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleVote(p.id, p.hackathon_id)}
                    className="px-3 py-1.5 rounded-lg bg-brand-950/80 border border-brand-800/60 text-brand-300 hover:bg-brand-900 flex items-center gap-1.5 transition"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Upvote
                  </button>

                  <button
                    onClick={async () => {
                      const full = await projectsApi.get(p.id);
                      setActiveModal(full);
                    }}
                    className="text-brand-400 font-semibold hover:underline"
                  >
                    View Project &rarr;
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Detail Modal */}
      {activeModal && (
        <Modal isOpen={!!activeModal} onClose={() => setActiveModal(null)} title={activeModal.title} maxWidth="lg">
          <div className="space-y-4 text-xs">
            <p className="text-sm font-semibold text-slate-300">{activeModal.tagline}</p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
              {activeModal.description}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {activeModal.repo_url && (
                <a
                  href={activeModal.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                >
                  <Github className="w-3.5 h-3.5" /> Repository
                </a>
              )}
              {activeModal.demo_url && (
                <a
                  href={activeModal.demo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Live Demo
                </a>
              )}
              {activeModal.video_url && (
                <a
                  href={activeModal.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" /> Demo Video
                </a>
              )}
              {activeModal.presentation_url && (
                <a
                  href={activeModal.presentation_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-brand-400" /> Pitch Deck
                </a>
              )}
            </div>

            {activeModal.additional_info && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400">
                <strong className="text-slate-300 block mb-0.5">Deployment Notes & Test Credentials:</strong>
                {activeModal.additional_info}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-slate-400">Total Upvotes: {activeModal.vote_count}</span>
              <button
                onClick={() => handleVote(activeModal.id, activeModal.hackathon_id)}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold flex items-center gap-1.5"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                {activeModal.has_user_voted ? 'Upvoted' : 'Cast Upvote'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
