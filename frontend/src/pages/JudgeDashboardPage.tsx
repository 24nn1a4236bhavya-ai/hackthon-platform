import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, CheckCircle2, Clock, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { judgingApi } from '../services/api';
import { JudgeAssignment } from '../types';
import { useAuth } from '../context/AuthContext';

export const JudgeDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    judgingApi
      .getAssignments()
      .then((data) => setAssignments(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const completedCount = assignments.filter((a) => a.status === 'COMPLETED').length;
  const progressPercent = assignments.length > 0 ? (completedCount / assignments.length) * 100 : 0;

  return (
    <div className="space-y-8 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Gavel className="w-7 h-7 text-cyan-400" />
            Judge Evaluation Portal
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Evaluate your assigned project submissions using weighted rubrics
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Evaluated</span>
            <span className="text-base font-bold text-white">
              {completedCount} / {assignments.length}
            </span>
          </div>
          <div className="w-24 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Assignments List */}
      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading assigned projects...</div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-2">
          <Clock className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No Assigned Projects</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not currently have any assigned projects to grade. The organizer will assign projects
            once the submission deadline closes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow-lg"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      a.status === 'COMPLETED'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : 'bg-amber-950/80 text-amber-300 border-amber-800 animate-pulse'
                    }`}
                  >
                    {a.status === 'COMPLETED' ? 'EVALUATION COMPLETED' : 'PENDING EVALUATION'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Assigned {new Date(a.assigned_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white">{a.project?.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-1">{a.project?.tagline}</p>
                {a.project?.tech_stack && (
                  <p className="text-[11px] text-slate-500 font-mono pt-1">
                    Tech: {a.project.tech_stack}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to={`/scorecard/${a.hackathon_id}/${a.project_id}`}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    a.status === 'COMPLETED'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30'
                  }`}
                >
                  {a.status === 'COMPLETED' ? 'Review / Edit Score' : 'Open Scorecard'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
