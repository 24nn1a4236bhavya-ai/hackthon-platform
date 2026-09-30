import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Gavel, CheckCircle2, ArrowLeft, Github, ExternalLink, Video, Save, AlertCircle } from 'lucide-react';
import { projectsApi, rubricsApi, judgingApi } from '../services/api';
import { ProjectDetail, Rubric, Evaluation } from '../types';
import { useAuth } from '../context/AuthContext';

export const ScorecardPage: React.FC = () => {
  const { hackathonId, projectId } = useParams<{ hackathonId: string; projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [existingEvaluation, setExistingEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [scores, setScores] = useState<Record<number, number>>({});
  const [privateNotes, setPrivateNotes] = useState('');
  const [publicFeedback, setPublicFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hackathonId || !projectId) return;
    const hId = Number(hackathonId);
    const pId = Number(projectId);

    Promise.all([
      projectsApi.get(pId),
      rubricsApi.list(hId),
      judgingApi.getEvaluations(hId, pId).catch(() => []),
    ])
      .then(([proj, rubricsList, evals]) => {
        setProject(proj);
        const r = rubricsList[0];
        setRubric(r);

        // Find existing evaluation by this judge
        const myEval = evals.find((e) => e.judge_id === user?.id);
        if (myEval) {
          setExistingEvaluation(myEval);
          setPrivateNotes(myEval.private_notes || '');
          setPublicFeedback(myEval.public_feedback || '');
          const scoreMap: Record<number, number> = {};
          myEval.criterion_scores?.forEach((cs) => {
            scoreMap[cs.criterion_id] = cs.score;
          });
          setScores(scoreMap);
        } else if (r) {
          // Initialize scores with default mid values
          const initialMap: Record<number, number> = {};
          r.criteria.forEach((c) => {
            initialMap[c.id] = c.max_points * 0.8;
          });
          setScores(initialMap);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load scorecard data.');
      })
      .finally(() => setLoading(false));
  }, [hackathonId, projectId, user]);

  const handleScoreChange = (criterionId: number, val: number) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: val,
    }));
  };

  // Calculate live weighted raw score (0 - 100)
  const calculateLiveScore = () => {
    if (!rubric || !rubric.criteria.length) return 0;
    let accumulated = 0;
    let totalWeight = 0;

    rubric.criteria.forEach((c) => {
      const s = scores[c.id] ?? 0;
      const ratio = Math.max(0, Math.min(s / c.max_points, 1));
      accumulated += ratio * c.weight * 100;
      totalWeight += c.weight;
    });

    return totalWeight > 0 ? (accumulated / totalWeight).toFixed(2) : '0.00';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hackathonId || !projectId || !rubric) return;
    setError('');
    setSubmitting(true);

    const scorePayload = rubric.criteria.map((c) => ({
      criterion_id: c.id,
      score: scores[c.id] ?? 0,
    }));

    try {
      if (existingEvaluation) {
        await judgingApi.updateEvaluation(existingEvaluation.id, {
          scores: scorePayload,
          private_notes: privateNotes,
          public_feedback: publicFeedback,
        });
      } else {
        await judgingApi.submitEvaluation({
          hackathon_id: Number(hackathonId),
          project_id: Number(projectId),
          scores: scorePayload,
          private_notes: privateNotes,
          public_feedback: publicFeedback,
        });
      }
      alert('Evaluation submitted successfully!');
      navigate('/judging');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-24 text-slate-500">Loading evaluation scorecard...</div>;
  }

  if (!project || !rubric) {
    return (
      <div className="text-center py-24 text-slate-400 space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">Scorecard Not Available</h2>
        <p className="text-xs text-slate-500">Ensure the hackathon has defined rubrics and the project exists.</p>
        <Link to="/judging" className="text-brand-400 text-xs font-semibold inline-block">
          &larr; Back to Judge Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Top Navigation */}
      <Link
        to="/judging"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Judge Portal
      </Link>

      {/* Project Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
              Project Evaluation
            </span>
            <h1 className="text-2xl font-bold text-white">{project.title}</h1>
            <p className="text-xs text-slate-300 mt-0.5">{project.tagline}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
              >
                <Github className="w-3.5 h-3.5" /> Code Repo
              </a>
            )}
            {project.demo_url && (
              <a
                href={project.demo_url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Demo
              </a>
            )}
            {project.video_url && (
              <a
                href={project.video_url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
              >
                <Video className="w-3.5 h-3.5" /> Video
              </a>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
          {project.description}
        </div>
      </div>

      {/* Scorecard Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Criteria Sliders Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Gavel className="w-5 h-5 text-cyan-400" />
                {rubric.name}
              </h2>
              <p className="text-xs text-slate-400">Score each dimension based on project merits</p>
            </div>

            {/* Live Score Counter */}
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                Live Weighted Score
              </span>
              <span className="text-3xl font-extrabold font-mono text-cyan-400">
                {calculateLiveScore()}{' '}
                <span className="text-xs font-normal text-slate-500">/ 100</span>
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {rubric.criteria.map((c) => {
              const currentScore = scores[c.id] ?? 0;
              return (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{c.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                          Weight: {(c.weight * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-lg font-bold font-mono text-white">
                        {currentScore.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-500">/ {c.max_points}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max={c.max_points}
                      step="0.5"
                      value={currentScore}
                      onChange={(e) => handleScoreChange(c.id, parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Written Feedback & Notes Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <h3 className="text-base font-bold text-white">Written Feedback & Notes</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Public Constructive Feedback (Visible to participants upon judging conclusion)
              </label>
              <textarea
                rows={3}
                value={publicFeedback}
                onChange={(e) => setPublicFeedback(e.target.value)}
                placeholder="What did the team execute well? What are opportunities for improvement?"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Private Evaluation Notes (Only visible to judges and organizers)
              </label>
              <textarea
                rows={2}
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                placeholder="Private technical observations, potential flags, or benchmarking observations..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-4">
          <Link to="/judging" className="text-xs font-semibold text-slate-400 hover:text-white">
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            {submitting ? 'Saving Evaluation...' : existingEvaluation ? 'Update Evaluation' : 'Submit Evaluation'}
          </button>
        </div>
      </form>
    </div>
  );
};
