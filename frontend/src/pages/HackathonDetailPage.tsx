import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Trophy, Calendar, Users, Layers, Award, Gavel, Sparkles,
  CheckCircle2, Clock, Share2, Plus, Download, ThumbsUp,
  ExternalLink, Github, Video, Edit3, ArrowRight, AlertCircle, Copy,
  Upload, Trash2, Mail, FileText, BarChart3
} from 'lucide-react';
import {
  hackathonsApi, teamsApi, projectsApi, rubricsApi, judgingApi, votesApi, exportsApi,
  prizesApi, judgesApi, importApi
} from '../services/api';
import {
  HackathonDetail, Team, Project, ProjectDetail, Rubric, LeaderboardResponse, HackathonStatus,
  HackathonPrize, HackathonStats, JudgeDetail
} from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export const HackathonDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated } = useAuth();

  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tracks' | 'prizes' | 'team' | 'submissions' | 'leaderboard' | 'manage'>('overview');
  const [stats, setStats] = useState<HackathonStats | null>(null);

  // Team & Project State
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [myProject, setMyProject] = useState<Project | null>(null);
  const [teamFormName, setTeamFormName] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Submissions Gallery State
  const [submissions, setSubmissions] = useState<Project[]>([]);
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<number | 'ALL'>('ALL');
  const [gallerySearch, setGallerySearch] = useState('');
  const [activeProjectModal, setActiveProjectModal] = useState<ProjectDetail | null>(null);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [scoreViewMode, setScoreViewMode] = useState<'normalized' | 'raw' | 'trimmed'>('normalized');

  // Organizer Management State
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [isAddTrackOpen, setIsAddTrackOpen] = useState(false);
  const [trackForm, setTrackForm] = useState({ name: '', description: '' });
  const [isAddPrizeOpen, setIsAddPrizeOpen] = useState(false);
  const [prizeForm, setPrizeForm] = useState({ title: '', description: '', reward_amount: '', track_id: undefined as number | undefined, place: 1 });
  const [isAddCriterionOpen, setIsAddCriterionOpen] = useState(false);
  const [criterionForm, setCriterionForm] = useState({ title: '', description: '', max_points: 10, weight: 0.25 });
  const [autoAssignCount, setAutoAssignCount] = useState(3);
  const [judgesList, setJudgesList] = useState<JudgeDetail[]>([]);
  const [isInviteJudgeOpen, setIsInviteJudgeOpen] = useState(false);
  const [judgeInviteForm, setJudgeInviteForm] = useState({ email: '', full_name: '', notes: '' });
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importStatusMsg, setImportStatusMsg] = useState<string | null>(null);

  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: '',
    tagline: '',
    description: '',
    demo_url: '',
    repo_url: '',
    video_url: '',
    presentation_url: '',
    additional_info: '',
    tech_stack: '',
    track_id: undefined as number | undefined,
  });

  const loadData = async () => {
    if (!slug) return;
    try {
      const h = await hackathonsApi.get(slug);
      setHackathon(h);

      // Load submissions
      const subs = await projectsApi.list({ hackathon_id: h.id, status: 'SUBMITTED' });
      setSubmissions(subs);

      // Load my team if authenticated
      if (isAuthenticated) {
        const t = await teamsApi.getMyTeam(h.id);
        setMyTeam(t);
        if (t && t.project_id) {
          const p = await projectsApi.get(t.project_id);
          setMyProject(p);
        } else {
          setMyProject(null);
        }
      }

      // Load Leaderboard if permitted
      try {
        const lb = await judgingApi.getLeaderboard(h.id);
        setLeaderboard(lb);
      } catch (err) {
        // Leaderboard not yet published
        setLeaderboard(null);
      }

      // Load Rubrics
      const r = await rubricsApi.list(h.id);
      setRubrics(r);

      // Load live stats
      try {
        const s = await hackathonsApi.getStats(h.id);
        setStats(s);
      } catch (err) {
        console.error(err);
      }

      // Load judges
      try {
        const j = await judgesApi.list(h.id);
        setJudgesList(j);
      } catch (err) {
        // Optional if not permitted
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [slug, isAuthenticated]);

  const handleRegister = async () => {
    if (!hackathon) return;
    try {
      await hackathonsApi.register(hackathon.id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Registration failed');
    }
  };

  const handleUnregister = async () => {
    if (!hackathon || !confirm('Are you sure you want to withdraw your registration?')) return;
    try {
      await hackathonsApi.unregister(hackathon.id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Withdrawal failed');
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hackathon) return;
    try {
      await teamsApi.create(hackathon.id, teamFormName);
      setTeamFormName('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create team');
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teamsApi.join(joinInviteCode);
      setJoinInviteCode('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to join team');
    }
  };

  const handleLeaveTeam = async () => {
    if (!myTeam || !confirm('Leave this team?')) return;
    try {
      await teamsApi.leave(myTeam.id);
      setMyTeam(null);
      setMyProject(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to leave team');
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hackathon || !myTeam) return;
    try {
      if (myProject) {
        await projectsApi.update(myProject.id, projectForm);
      } else {
        await projectsApi.create({
          ...projectForm,
          hackathon_id: hackathon.id,
          team_id: myTeam.id,
          status: 'DRAFT',
        });
      }
      setIsProjectFormOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save project');
    }
  };

  const handleFinalizeSubmission = async () => {
    if (!myProject || !confirm('Finalize and lock your submission?')) return;
    try {
      await projectsApi.submit(myProject.id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to finalize submission');
    }
  };

  const handleCastVote = async (projectId: number) => {
    if (!hackathon || !isAuthenticated) return;
    try {
      await votesApi.castVote(hackathon.id, projectId);
      loadData();
      if (activeProjectModal && activeProjectModal.id === projectId) {
        setActiveProjectModal({
          ...activeProjectModal,
          vote_count: activeProjectModal.vote_count + 1,
          has_user_voted: true,
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to cast vote');
    }
  };

  const handleStatusChange = async (newStatus: HackathonStatus) => {
    if (!hackathon || !confirm(`Transition hackathon lifecycle status to ${newStatus}?`)) return;
    try {
      await hackathonsApi.update(hackathon.id, { status: newStatus });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleAutoAssignJudges = async () => {
    if (!hackathon) return;
    try {
      const res = await judgingApi.autoAssign(hackathon.id, autoAssignCount, true);
      alert(`Success! Created ${res.total_assignments_created} assignments across ${res.judges_count} judges.`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Auto-assignment failed');
    }
  };

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hackathon) return;
    try {
      await hackathonsApi.addTrack(hackathon.id, trackForm);
      setTrackForm({ name: '', description: '' });
      setIsAddTrackOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add track');
    }
  };

  const handleAddCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hackathon) return;
    try {
      let r = rubrics[0];
      if (!r) {
        r = await rubricsApi.create({
          hackathon_id: hackathon.id,
          name: 'Main Evaluation Rubric',
          criteria: [criterionForm],
        });
      } else {
        const newCriteria = [...r.criteria, criterionForm];
        await rubricsApi.update(r.id, { criteria: newCriteria });
      }
      setIsAddCriterionOpen(false);
      setCriterionForm({ title: '', description: '', max_points: 10, weight: 0.25 });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add criterion');
    }
  };

  const handleAddPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hackathon) return;
    try {
      await prizesApi.create(hackathon.id, prizeForm);
      setPrizeForm({ title: '', description: '', reward_amount: '', track_id: undefined, place: 1 });
      setIsAddPrizeOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add prize');
    }
  };

  const handleDeletePrize = async (prizeId: number) => {
    if (!hackathon || !confirm('Delete this prize?')) return;
    try {
      await prizesApi.delete(hackathon.id, prizeId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete prize');
    }
  };

  const handleInviteJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hackathon) return;
    try {
      await judgesApi.invite(hackathon.id, judgeInviteForm);
      setJudgeInviteForm({ email: '', full_name: '', notes: '' });
      setIsInviteJudgeOpen(false);
      alert('Judge added/invited successfully!');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to invite judge');
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hackathon || !csvFile) return;
    try {
      const res = await importApi.importParticipants(hackathon.id, csvFile);
      setImportStatusMsg(`Import successful: ${res.imported_count} imported, ${res.registered_count} registered, ${res.created_count} created.`);
      setCsvFile(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'CSV Import failed');
    }
  };

  if (loading) {
    return <div className="text-center py-24 text-slate-500">Loading hackathon details...</div>;
  }

  if (!hackathon) {
    return (
      <div className="text-center py-24 text-slate-400">
        <h2 className="text-xl font-bold">Hackathon not found</h2>
        <Link to="/hackathons" className="text-brand-400 mt-2 inline-block">
          &larr; Back to hackathons
        </Link>
      </div>
    );
  }

  const isOrganizerOrAdmin = user && (user.role === 'ADMIN' || hackathon.created_by_id === user.id);
  const filteredSubmissions = submissions.filter((p) => {
    const matchTrack = selectedTrackFilter === 'ALL' || p.track_id === selectedTrackFilter;
    const matchSearch =
      !gallerySearch ||
      p.title.toLowerCase().includes(gallerySearch.toLowerCase()) ||
      p.tagline.toLowerCase().includes(gallerySearch.toLowerCase()) ||
      (p.tech_stack && p.tech_stack.toLowerCase().includes(gallerySearch.toLowerCase()));
    return matchTrack && matchSearch;
  });

  return (
    <div className="space-y-8 py-6">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
        {hackathon.banner_url ? (
          <div className="h-64 w-full relative">
            <img src={hackathon.banner_url} alt={hackathon.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </div>
        ) : (
          <div className="h-44 w-full bg-gradient-to-r from-brand-950 via-indigo-950 to-slate-900" />
        )}

        <div className="p-8 -mt-20 relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={hackathon.status} />
              <span className="text-xs text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-800/80">
                Created by {hackathon.creator?.full_name}
              </span>
            </div>

            {/* Registration Action */}
            {isAuthenticated ? (
              hackathon.is_user_registered ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    You are registered
                  </span>
                  <button
                    onClick={handleUnregister}
                    className="text-xs text-slate-400 hover:text-rose-400 hover:underline px-2 py-1"
                  >
                    Withdraw
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={!['REGISTRATION_OPEN', 'SUBMISSION_OPEN'].includes(hackathon.status)}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-brand-600/30"
                >
                  Register for Hackathon
                </button>
              )
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Sign in to Register
              </Link>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {hackathon.title}
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
            {hackathon.tagline}
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 block">Participants</span>
              <span className="font-bold text-white text-base">{hackathon.registrations_count}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Teams</span>
              <span className="font-bold text-white text-base">{hackathon.teams_count}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Projects</span>
              <span className="font-bold text-white text-base">{hackathon.projects_count}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Submissions Due</span>
              <span className="font-bold text-white text-sm">
                {new Date(hackathon.submission_deadline).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'overview'
              ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Overview & Rules
        </button>
        <button
          onClick={() => setActiveTab('tracks')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'tracks'
              ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Tracks ({hackathon.tracks?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('prizes')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'prizes'
              ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          🎁 Prizes ({hackathon.prizes?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'team'
              ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          My Team & Project
          {myTeam && <span className="ml-1.5 w-2 h-2 rounded-full bg-emerald-400 inline-block" />}
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'submissions'
              ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          Submissions ({submissions.length})
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition ${
            activeTab === 'leaderboard'
              ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          🏆 Leaderboard
        </button>
        {isOrganizerOrAdmin && (
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition ml-auto ${
              activeTab === 'manage'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                : 'text-amber-400 hover:text-amber-300 hover:bg-slate-900'
            }`}
          >
            ⚙️ Manage Event
          </button>
        )}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">About the Hackathon</h3>
              <div className="prose prose-invert prose-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {hackathon.description}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
                Timeline & Deadlines
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400 flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200">Registration Closes</span>
                    <p className="text-slate-400">
                      {new Date(hackathon.registration_deadline).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200">Submission Deadline</span>
                    <p className="text-slate-400">
                      {new Date(hackathon.submission_deadline).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <Gavel className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200">Judging Closes</span>
                    <p className="text-slate-400">
                      {new Date(hackathon.judging_deadline).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-400">
                Team Constraints
              </h3>
              <p className="text-slate-300">
                Minimum team size: <strong>{hackathon.min_team_size}</strong>
              </p>
              <p className="text-slate-300">
                Maximum team size: <strong>{hackathon.max_team_size}</strong>
              </p>
              <p className="text-slate-400 text-[11px] pt-2 border-t border-slate-800">
                Community voting is{' '}
                <strong className={hackathon.is_community_voting_enabled ? 'text-emerald-400' : 'text-slate-500'}>
                  {hackathon.is_community_voting_enabled ? 'ENABLED' : 'DISABLED'}
                </strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Tracks */}
      {activeTab === 'tracks' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Challenge Tracks</h2>
              <p className="text-xs text-slate-400">Target specific problems and prizes</p>
            </div>
            {isOrganizerOrAdmin && (
              <button
                onClick={() => setIsAddTrackOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Track
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {hackathon.tracks?.map((t) => (
              <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-400 px-2 py-0.5 rounded bg-brand-950/80 border border-brand-800">
                  Track #{t.id}
                </span>
                <h3 className="text-lg font-bold text-white pt-1">{t.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{t.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Prizes */}
      {activeTab === 'prizes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Prizes & Awards
              </h2>
              <p className="text-xs text-slate-400">Exciting cash rewards, sponsor grants, and trophies</p>
            </div>
            {isOrganizerOrAdmin && (
              <button
                onClick={() => setIsAddPrizeOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Prize
              </button>
            )}
          </div>

          {(!hackathon.prizes || hackathon.prizes.length === 0) ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-slate-500 text-xs">
              No prizes configured for this hackathon yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {hackathon.prizes.map((p) => (
                <div key={p.id} className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-6 space-y-3 flex flex-col justify-between transition">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800">
                        {p.place ? `${p.place} Place` : 'Special Award'}
                      </span>
                      {p.reward_amount && (
                        <span className="font-mono font-extrabold text-sm text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                          {p.reward_amount}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white pt-1">{p.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{p.description || 'Awarded to the top qualifying project.'}</p>
                    {p.track_id && (
                      <span className="inline-block text-[11px] text-brand-300 bg-brand-950/60 px-2 py-0.5 rounded border border-brand-800/40">
                        Track: {hackathon.tracks?.find(t => t.id === p.track_id)?.name || `Track #${p.track_id}`}
                      </span>
                    )}
                  </div>
                  {isOrganizerOrAdmin && (
                    <div className="pt-3 border-t border-slate-800 flex justify-end">
                      <button
                        onClick={() => handleDeletePrize(p.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: My Team & Project Submission */}
      {activeTab === 'team' && (
        <div className="space-y-8 max-w-4xl mx-auto">
          {!isAuthenticated ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-3">
              <Users className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">Sign In to Form a Team</h3>
              <p className="text-xs text-slate-400">You must be logged in to create or join a team.</p>
              <Link to="/login" className="inline-block px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold">
                Sign In
              </Link>
            </div>
          ) : !hackathon.is_user_registered ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-white">Register for this Hackathon First</h3>
              <p className="text-xs text-slate-400">
                You must register before creating or joining a team.
              </p>
              <button onClick={handleRegister} className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-semibold">
                Register Now
              </button>
            </div>
          ) : !myTeam ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create Team Form */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-brand-400" />
                  Create a New Team
                </h3>
                <p className="text-xs text-slate-400">
                  Form a team to build and submit your project. You will receive an invite code to share with members.
                </p>
                <form onSubmit={handleCreateTeam} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Enter team name..."
                    value={teamFormName}
                    onChange={(e) => setTeamFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs"
                  >
                    Create Team
                  </button>
                </form>
              </div>

              {/* Join Team Form */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Join an Existing Team
                </h3>
                <p className="text-xs text-slate-400">
                  Ask your team leader for their secret 6-8 digit invite code to join their roster.
                </p>
                <form onSubmit={handleJoinTeam} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="e.g. NEURAL1"
                    value={joinInviteCode}
                    onChange={(e) => setJoinInviteCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white uppercase tracking-wider"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
                  >
                    Join Team
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* My Team Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-400">
                      Team Profile
                    </span>
                    <h2 className="text-2xl font-bold text-white">{myTeam.name}</h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2">
                      <span className="text-xs text-slate-400">Invite Code:</span>
                      <code className="text-xs font-mono font-bold text-brand-400">{myTeam.invite_code}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(myTeam.invite_code);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="text-slate-400 hover:text-white p-1"
                        title="Copy Code"
                      >
                        {copiedCode ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      onClick={handleLeaveTeam}
                      className="px-3 py-1.5 rounded-lg border border-red-800 text-red-400 hover:bg-red-950 text-xs font-semibold"
                    >
                      Leave Team
                    </button>
                  </div>
                </div>

                {/* Team Members List */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Team Members ({myTeam.members?.length || 1} / {hackathon.max_team_size})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {myTeam.members?.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                            {m.user.full_name[0]}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-200 block">{m.user.full_name}</span>
                            <span className="text-[11px] text-slate-500">@{m.user.username}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Project Submission Area */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-white">Project Submission</h3>
                    <p className="text-xs text-slate-400">Only one project submission per team</p>
                  </div>

                  {myProject && (
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        myProject.status === 'SUBMITTED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {myProject.status === 'SUBMITTED' ? 'FINALIZED & SUBMITTED' : 'DRAFT IN PROGRESS'}
                    </span>
                  )}
                </div>

                {!myProject ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-xs text-slate-400">
                      Your team has not created a project draft yet.
                    </p>
                    <button
                      onClick={() => {
                        setProjectForm({
                          title: '',
                          tagline: '',
                          description: '',
                          demo_url: '',
                          repo_url: '',
                          video_url: '',
                          presentation_url: '',
                          additional_info: '',
                          tech_stack: '',
                          track_id: hackathon.tracks?.[0]?.id,
                        });
                        setIsProjectFormOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs"
                    >
                      Create Project Submission
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xl font-bold text-white">{myProject.title}</h4>
                      <p className="text-xs text-slate-300 mt-1">{myProject.tagline}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {myProject.description}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {myProject.repo_url && (
                        <a
                          href={myProject.repo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                        >
                          <Github className="w-3.5 h-3.5" /> Repository
                        </a>
                      )}
                      {myProject.demo_url && (
                        <a
                          href={myProject.demo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Live Demo
                        </a>
                      )}
                      {myProject.video_url && (
                        <a
                          href={myProject.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5" /> Demo Video
                        </a>
                      )}
                      {myProject.presentation_url && (
                        <a
                          href={myProject.presentation_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-brand-400" /> Pitch Deck / Slides
                        </a>
                      )}
                    </div>

                    {myProject.additional_info && (
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400">
                        <strong className="text-slate-300 block mb-0.5">Deployment & Test Notes:</strong>
                        {myProject.additional_info}
                      </div>
                    )}

                    {myProject.status === 'DRAFT' && (
                      <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                        <button
                          onClick={() => {
                            setProjectForm({
                              title: myProject.title,
                              tagline: myProject.tagline,
                              description: myProject.description,
                              demo_url: myProject.demo_url || '',
                              repo_url: myProject.repo_url || '',
                              video_url: myProject.video_url || '',
                              presentation_url: myProject.presentation_url || '',
                              additional_info: myProject.additional_info || '',
                              tech_stack: myProject.tech_stack || '',
                              track_id: myProject.track_id || undefined,
                            });
                            setIsProjectFormOpen(true);
                          }}
                          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit Details
                        </button>
                        <button
                          onClick={handleFinalizeSubmission}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Finalize & Submit
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Submissions Gallery */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => setSelectedTrackFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedTrackFilter === 'ALL'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Tracks
              </button>
              {hackathon.tracks?.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTrackFilter(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedTrackFilter === t.id
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search projects..."
              value={gallerySearch}
              onChange={(e) => setGallerySearch(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 w-full md:w-64"
            />
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-20 text-slate-500">No project submissions found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredSubmissions.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <h3 className="font-bold text-white text-base hover:text-brand-300 transition">
                      {p.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{p.tagline}</p>
                    {p.tech_stack && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {p.tech_stack.split(',').map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800"
                          >
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    {hackathon.is_community_voting_enabled && (
                      <button
                        onClick={() => handleCastVote(p.id)}
                        className="px-3 py-1.5 rounded-lg bg-brand-950/80 border border-brand-800/60 text-brand-300 hover:bg-brand-900 flex items-center gap-1.5"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        Upvote
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const full = await projectsApi.get(p.id);
                        setActiveProjectModal(full);
                      }}
                      className="text-brand-400 font-semibold hover:underline ml-auto"
                    >
                      View Details &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                Competition Leaderboard
              </h2>
              <p className="text-xs text-slate-400">
                Mathematical rankings computed using Z-score statistical normalization
              </p>
            </div>

            {/* Score view toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setScoreViewMode('normalized')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  scoreViewMode === 'normalized' ? 'bg-brand-600 text-white' : 'text-slate-400'
                }`}
              >
                Z-Score Normalized
              </button>
              <button
                onClick={() => setScoreViewMode('raw')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  scoreViewMode === 'raw' ? 'bg-brand-600 text-white' : 'text-slate-400'
                }`}
              >
                Raw Weighted Avg
              </button>
              <button
                onClick={() => setScoreViewMode('trimmed')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  scoreViewMode === 'trimmed' ? 'bg-brand-600 text-white' : 'text-slate-400'
                }`}
              >
                Olympic Trimmed
              </button>
            </div>
          </div>

          {!leaderboard ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-2">
              <Clock className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">Leaderboard In Progress</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Judging is underway. The final leaderboard will automatically unlock once the organizer
                concludes evaluations or marks the hackathon completed.
              </p>
            </div>
          ) : leaderboard.rankings.length === 0 ? (
            <div className="text-center py-16 text-slate-500">No project evaluations submitted yet.</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Rank</th>
                    <th className="py-3.5 px-4 font-semibold">Project & Team</th>
                    <th className="py-3.5 px-4 font-semibold">Track</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Evaluations</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Community Votes</th>
                    <th className="py-3.5 px-4 font-semibold text-right">
                      {scoreViewMode === 'normalized'
                        ? 'Normalized Score'
                        : scoreViewMode === 'raw'
                        ? 'Raw Average'
                        : 'Trimmed Score'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {leaderboard.rankings.map((r) => {
                    const score =
                      scoreViewMode === 'normalized'
                        ? r.normalized_score
                        : scoreViewMode === 'raw'
                        ? r.raw_average_score
                        : r.trimmed_score;

                    return (
                      <tr key={r.project_id} className="hover:bg-slate-800/50 transition">
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${
                              r.rank === 1
                                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                                : r.rank === 2
                                ? 'bg-slate-300 text-slate-950'
                                : r.rank === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {r.rank}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white block">{r.project_title}</span>
                          <span className="text-[11px] text-slate-400">{r.team_name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{r.track_name || 'General'}</td>
                        <td className="py-3.5 px-4 text-center font-medium">{r.evaluations_count}</td>
                        <td className="py-3.5 px-4 text-center font-medium">{r.community_votes}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-base text-brand-400">
                          {score.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Manage Event (Organizer / Admin) */}
      {activeTab === 'manage' && isOrganizerOrAdmin && (
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* Real-time Dynamic Statistics Banner */}
          {stats && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-400" />
                Live Event Telemetry & Analytics
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Participants</span>
                  <span className="text-xl font-extrabold text-white">{stats.total_registrations}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Teams</span>
                  <span className="text-xl font-extrabold text-white">{stats.total_teams}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Submitted</span>
                  <span className="text-xl font-extrabold text-emerald-400">{stats.submitted_projects}</span>
                  <span className="text-[10px] text-slate-500">/ {stats.total_projects} total</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Judges</span>
                  <span className="text-xl font-extrabold text-purple-400">{stats.total_judges}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Evaluations</span>
                  <span className="text-xl font-extrabold text-amber-400">{stats.completed_evaluations}</span>
                  <span className="text-[10px] text-slate-500">/ {stats.total_assignments}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Completion</span>
                  <span className="text-xl font-extrabold text-brand-400">{stats.evaluation_completion_rate}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Lifecycle State Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Hackathon Lifecycle Phase</h3>
            <p className="text-xs text-slate-400">Current Phase: <StatusBadge status={hackathon.status} /></p>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => handleStatusChange('REGISTRATION_OPEN')}
                className="px-3 py-1.5 rounded-lg bg-blue-950 border border-blue-800 text-blue-300 hover:bg-blue-900 text-xs font-semibold"
              >
                1. Open Registration
              </button>
              <button
                onClick={() => handleStatusChange('SUBMISSION_OPEN')}
                className="px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 text-xs font-semibold"
              >
                2. Open Submissions
              </button>
              <button
                onClick={() => handleStatusChange('JUDGING')}
                className="px-3 py-1.5 rounded-lg bg-amber-950 border border-amber-800 text-amber-300 hover:bg-amber-900 text-xs font-semibold"
              >
                3. Lock & Start Judging
              </button>
              <button
                onClick={() => handleStatusChange('VOTING')}
                className="px-3 py-1.5 rounded-lg bg-violet-950 border border-violet-800 text-violet-300 hover:bg-violet-900 text-xs font-semibold"
              >
                4. Start Community Voting
              </button>
              <button
                onClick={() => handleStatusChange('COMPLETED')}
                className="px-3 py-1.5 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300 hover:bg-indigo-900 text-xs font-semibold"
              >
                5. Complete & Publish Results
              </button>
            </div>
          </div>

          {/* Rubrics & Criteria */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Evaluation Rubric Criteria</h3>
                <p className="text-xs text-slate-400">Weighted scorecard dimensions for judges</p>
              </div>
              <button
                onClick={() => setIsAddCriterionOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Criterion
              </button>
            </div>

            <div className="space-y-3">
              {rubrics[0]?.criteria?.map((c) => (
                <div key={c.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">{c.title}</span>
                    <p className="text-slate-400 text-[11px]">{c.description}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-slate-500 block">Max Points</span>
                      <span className="font-semibold text-white">{c.max_points}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Weight</span>
                      <span className="font-semibold text-brand-400">{(c.weight * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Judge Panel Management & Auto Assignment */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-purple-400" />
                  Judge Panel Management ({judgesList.length} judges)
                </h3>
                <p className="text-xs text-slate-400">
                  Invite verified judges and auto-assign them evenly to projects with conflict-of-interest prevention
                </p>
              </div>
              <button
                onClick={() => setIsInviteJudgeOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Invite Judge
              </button>
            </div>

            {judgesList.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {judgesList.map((j) => (
                  <div key={j.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{j.full_name || j.username}</span>
                      <span className="text-[10px] text-purple-400 px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800/60">
                        {j.role}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate">{j.email}</span>
                    <span className="text-[10px] text-emerald-400 block pt-1">
                      Assigned: {j.assigned_count} project(s)
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800/80 flex items-center gap-4">
              <label className="text-xs text-slate-300">
                Judges per project:
                <select
                  value={autoAssignCount}
                  onChange={(e) => setAutoAssignCount(Number(e.target.value))}
                  className="ml-2 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white text-xs"
                >
                  <option value={1}>1 Judge</option>
                  <option value={2}>2 Judges</option>
                  <option value={3}>3 Judges</option>
                  <option value={4}>4 Judges</option>
                </select>
              </label>

              <button
                onClick={handleAutoAssignJudges}
                className="px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold shadow"
              >
                Run Round-Robin Auto-Assignment
              </button>
            </div>
          </div>

          {/* Participant Ingestion (CSV) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  Bulk Participant Ingestion
                </h3>
                <p className="text-xs text-slate-400">
                  Quickly upload participant rosters and pre-registered teams via CSV file
                </p>
              </div>
              <button
                onClick={() => {
                  setImportStatusMsg(null);
                  setIsImportCsvOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow"
              >
                <Upload className="w-3.5 h-3.5" /> Import CSV
              </button>
            </div>
            {importStatusMsg && (
              <p className="text-xs text-emerald-400 bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800">
                {importStatusMsg}
              </p>
            )}
          </div>

          {/* Data Exports (CSV & JSON) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Export Records & Results</h3>
            <p className="text-xs text-slate-400">
              Download complete raw records and normalized scoring tables in CSV and JSON formats.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <a
                href={exportsApi.getLeaderboardCsvUrl(hackathon.id)}
                download
                className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-brand-400" />
                Leaderboard (CSV)
              </a>
              <a
                href={exportsApi.getLeaderboardJsonUrl(hackathon.id)}
                download
                className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                Leaderboard (JSON)
              </a>
              <a
                href={exportsApi.getProjectsCsvUrl(hackathon.id)}
                download
                className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Projects (CSV)
              </a>
              <a
                href={exportsApi.getParticipantsCsvUrl(hackathon.id)}
                download
                className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                Participants (CSV)
              </a>
              <a
                href={exportsApi.getEvaluationsCsvUrl(hackathon.id)}
                download
                className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                Evaluations (CSV)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Project Submission / Edit Modal */}
      <Modal isOpen={isProjectFormOpen} onClose={() => setIsProjectFormOpen(false)} title="Project Submission" maxWidth="lg">
        <form onSubmit={handleSaveProject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Project Title</label>
            <input
              type="text"
              required
              value={projectForm.title}
              onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
              placeholder="e.g. Offline Agent Studio"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tagline</label>
            <input
              type="text"
              required
              value={projectForm.tagline}
              onChange={(e) => setProjectForm({ ...projectForm, tagline: e.target.value })}
              placeholder="One line summary"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Category Track</label>
            <select
              value={projectForm.track_id}
              onChange={(e) => setProjectForm({ ...projectForm, track_id: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            >
              {hackathon.tracks?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Markdown)</label>
            <textarea
              required
              rows={4}
              value={projectForm.description}
              onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
              placeholder="What it does, architecture, offline deployment instructions..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">GitHub Repo URL</label>
              <input
                type="url"
                value={projectForm.repo_url}
                onChange={(e) => setProjectForm({ ...projectForm, repo_url: e.target.value })}
                placeholder="https://github.com/..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Live Demo URL</label>
              <input
                type="url"
                value={projectForm.demo_url}
                onChange={(e) => setProjectForm({ ...projectForm, demo_url: e.target.value })}
                placeholder="http://..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Video Demo URL</label>
              <input
                type="url"
                value={projectForm.video_url}
                onChange={(e) => setProjectForm({ ...projectForm, video_url: e.target.value })}
                placeholder="https://youtube.com/..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Pitch Deck / Slides URL</label>
              <input
                type="url"
                value={projectForm.presentation_url}
                onChange={(e) => setProjectForm({ ...projectForm, presentation_url: e.target.value })}
                placeholder="https://slideshare.net/..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tech Stack</label>
            <input
              type="text"
              value={projectForm.tech_stack}
              onChange={(e) => setProjectForm({ ...projectForm, tech_stack: e.target.value })}
              placeholder="React, Python, FastAPI, SQLite"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Deployment Notes & Test Credentials</label>
            <textarea
              rows={2}
              value={projectForm.additional_info}
              onChange={(e) => setProjectForm({ ...projectForm, additional_info: e.target.value })}
              placeholder="Test accounts, environment setup, docker instructions..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsProjectFormOpen(false)}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white">
              Save Project Draft
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Track Modal */}
      <Modal isOpen={isAddTrackOpen} onClose={() => setIsAddTrackOpen(false)} title="Add Challenge Track">
        <form onSubmit={handleAddTrack} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Track Name</label>
            <input
              type="text"
              required
              value={trackForm.name}
              onChange={(e) => setTrackForm({ ...trackForm, name: e.target.value })}
              placeholder="e.g. Decentralized Storage"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              required
              rows={3}
              value={trackForm.description}
              onChange={(e) => setTrackForm({ ...trackForm, description: e.target.value })}
              placeholder="Track objectives and guidelines..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddTrackOpen(false)}
              className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white">
              Add Track
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Criterion Modal */}
      <Modal isOpen={isAddCriterionOpen} onClose={() => setIsAddCriterionOpen(false)} title="Add Rubric Criterion">
        <form onSubmit={handleAddCriterion} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Criterion Title</label>
            <input
              type="text"
              required
              value={criterionForm.title}
              onChange={(e) => setCriterionForm({ ...criterionForm, title: e.target.value })}
              placeholder="e.g. Technical Execution"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              required
              rows={2}
              value={criterionForm.description}
              onChange={(e) => setCriterionForm({ ...criterionForm, description: e.target.value })}
              placeholder="Guidance for judges..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Points</label>
              <input
                type="number"
                min="1"
                max="100"
                value={criterionForm.max_points}
                onChange={(e) => setCriterionForm({ ...criterionForm, max_points: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Relative Weight (0.0 - 1.0)</label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="1.0"
                value={criterionForm.weight}
                onChange={(e) => setCriterionForm({ ...criterionForm, weight: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddCriterionOpen(false)}
              className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white">
              Add Criterion
            </button>
          </div>
        </form>
      </Modal>

      {/* Project Detail Modal */}
      {activeProjectModal && (
        <Modal isOpen={!!activeProjectModal} onClose={() => setActiveProjectModal(null)} title={activeProjectModal.title} maxWidth="lg">
          <div className="space-y-4 text-xs">
            <p className="text-sm font-semibold text-slate-300">{activeProjectModal.tagline}</p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
              {activeProjectModal.description}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {activeProjectModal.repo_url && (
                <a
                  href={activeProjectModal.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                >
                  <Github className="w-3.5 h-3.5" /> Repository
                </a>
              )}
              {activeProjectModal.demo_url && (
                <a
                  href={activeProjectModal.demo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Live Demo
                </a>
              )}
              {activeProjectModal.video_url && (
                <a
                  href={activeProjectModal.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" /> Demo Video
                </a>
              )}
              {activeProjectModal.presentation_url && (
                <a
                  href={activeProjectModal.presentation_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-brand-400" /> Pitch Deck
                </a>
              )}
            </div>

            {activeProjectModal.additional_info && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400">
                <strong className="text-slate-300 block mb-0.5">Deployment Notes & Credentials:</strong>
                {activeProjectModal.additional_info}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-slate-400">Total Upvotes: {activeProjectModal.vote_count}</span>
              {hackathon.is_community_voting_enabled && (
                <button
                  onClick={() => handleCastVote(activeProjectModal.id)}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold flex items-center gap-1.5"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {activeProjectModal.has_user_voted ? 'Upvoted' : 'Cast Upvote'}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Add Prize Modal */}
      <Modal isOpen={isAddPrizeOpen} onClose={() => setIsAddPrizeOpen(false)} title="Add Hackathon Prize">
        <form onSubmit={handleAddPrize} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Prize Title</label>
            <input
              type="text"
              required
              value={prizeForm.title}
              onChange={(e) => setPrizeForm({ ...prizeForm, title: e.target.value })}
              placeholder="e.g. 1st Place Grand Winner"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reward / Cash Value</label>
              <input
                type="text"
                required
                value={prizeForm.reward_amount}
                onChange={(e) => setPrizeForm({ ...prizeForm, reward_amount: e.target.value })}
                placeholder="e.g. $10,000 USD"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Place / Rank</label>
              <input
                type="number"
                min="1"
                max="10"
                value={prizeForm.place}
                onChange={(e) => setPrizeForm({ ...prizeForm, place: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Track (Optional)</label>
            <select
              value={prizeForm.track_id || ''}
              onChange={(e) => setPrizeForm({ ...prizeForm, track_id: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            >
              <option value="">All Tracks / Overall</option>
              {hackathon.tracks?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description & Criteria</label>
            <textarea
              rows={3}
              value={prizeForm.description}
              onChange={(e) => setPrizeForm({ ...prizeForm, description: e.target.value })}
              placeholder="What makes a project eligible for this prize..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddPrizeOpen(false)}
              className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white">
              Create Prize
            </button>
          </div>
        </form>
      </Modal>

      {/* Invite Judge Modal */}
      <Modal isOpen={isInviteJudgeOpen} onClose={() => setIsInviteJudgeOpen(false)} title="Invite Verified Judge">
        <form onSubmit={handleInviteJudge} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Judge Email Address</label>
            <input
              type="email"
              required
              value={judgeInviteForm.email}
              onChange={(e) => setJudgeInviteForm({ ...judgeInviteForm, email: e.target.value })}
              placeholder="judge@company.org"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Judge Full Name (Optional)</label>
            <input
              type="text"
              value={judgeInviteForm.full_name}
              onChange={(e) => setJudgeInviteForm({ ...judgeInviteForm, full_name: e.target.value })}
              placeholder="Dr. Eleanor Vance"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Expertise / Notes (Optional)</label>
            <textarea
              rows={2}
              value={judgeInviteForm.notes}
              onChange={(e) => setJudgeInviteForm({ ...judgeInviteForm, notes: e.target.value })}
              placeholder="Specializes in distributed systems and systems security..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsInviteJudgeOpen(false)}
              className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white">
              Send Invitation / Add Judge
            </button>
          </div>
        </form>
      </Modal>

      {/* Import CSV Modal */}
      <Modal isOpen={isImportCsvOpen} onClose={() => setIsImportCsvOpen(false)} title="Import Participants from CSV">
        <form onSubmit={handleImportCsv} className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Upload a CSV containing your participant list. Expected column headers:{' '}
            <code className="text-brand-300">email</code>, <code className="text-brand-300">full_name</code>,{' '}
            <code className="text-brand-300">username</code>, <code className="text-brand-300">team_name</code> (optional).
          </p>
          <div className="p-4 border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl bg-slate-950 text-center">
            <input
              type="file"
              accept=".csv"
              required
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500 cursor-pointer"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsImportCsvOpen(false)}
              className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white">
              Start Ingestion
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
