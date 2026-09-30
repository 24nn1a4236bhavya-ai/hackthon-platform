import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Award, Shield, ArrowRight, Sparkles, CheckCircle2, Gavel } from 'lucide-react';
import { hackathonsApi } from '../services/api';
import { Hackathon } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export const HomePage: React.FC = () => {
  const { quickDemoLogin, isAuthenticated, user } = useAuth();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hackathonsApi
      .list()
      .then((data) => setHackathons(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-brand-950/40 via-slate-900 to-slate-950 border border-slate-800 p-8 sm:p-14 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-950 border border-brand-800/80 text-brand-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Complete Open-Source Hackathon Lifecycle</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Run World-Class Hackathons{' '}
          <span className="bg-gradient-to-r from-brand-400 to-indigo-300 bg-clip-text text-transparent">
            100% Offline & Locally
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          From team registration and project submission to statistical Z-score rubric judging and
          public showcases. Fully self-hostable with zero cloud vendor lock-in.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/hackathons"
            className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-600/30 transition flex items-center gap-2"
          >
            Explore Hackathons
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/gallery"
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm transition"
          >
            Browse Projects
          </Link>
        </div>

        {/* 1-Click Interactive Demo Switcher */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 max-w-3xl mx-auto">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Quick Persona Switcher (Seeded Demo Data)
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => quickDemoLogin('admin')}
              className="px-3 py-1.5 rounded-lg bg-purple-950/70 border border-purple-800 text-purple-300 hover:bg-purple-900 text-xs font-medium transition"
            >
              👑 Admin
            </button>
            <button
              onClick={() => quickDemoLogin('organizer')}
              className="px-3 py-1.5 rounded-lg bg-amber-950/70 border border-amber-800 text-amber-300 hover:bg-amber-900 text-xs font-medium transition"
            >
              📋 Organizer (Sarah)
            </button>
            <button
              onClick={() => quickDemoLogin('judge1')}
              className="px-3 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-800 text-cyan-300 hover:bg-cyan-900 text-xs font-medium transition"
            >
              ⚖️ Harsh Judge (Dr. Vance)
            </button>
            <button
              onClick={() => quickDemoLogin('judge2')}
              className="px-3 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-800 text-cyan-300 hover:bg-cyan-900 text-xs font-medium transition"
            >
              ⚖️ Lenient Judge (Elena)
            </button>
            <button
              onClick={() => quickDemoLogin('alice')}
              className="px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 text-xs font-medium transition"
            >
              🚀 Participant (Alice)
            </button>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800/60 flex items-center justify-center text-blue-400 mb-4">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Team Formation</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Unique join codes, capacity validation, and integrated project draft submissions with markdown.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800/60 flex items-center justify-center text-amber-400 mb-4">
            <Gavel className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Weighted Rubrics</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Multi-dimensional criteria with custom weights, points, private notes, and public feedback.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-800/60 flex items-center justify-center text-purple-400 mb-4">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Z-Score Normalization</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Statistical standardization eliminates harsh/lenient judge bias and guarantees mathematical meritocracy.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-4">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Strict Backend RBAC</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Zero reliance on frontend hiding. Every endpoint verifies role, ownership, event state, and deadlines.
          </p>
        </div>
      </section>

      {/* Active Hackathons Showcase */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Active Competitions</h2>
            <p className="text-sm text-slate-400">Discover upcoming and ongoing hackathons</p>
          </div>
          <Link
            to="/hackathons"
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition"
          >
            View All ({hackathons.length})
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading hackathons...</div>
        ) : hackathons.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No hackathons found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hackathons.map((h) => (
              <Link
                key={h.id}
                to={`/hackathons/${h.slug}`}
                className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition shadow-lg flex flex-col justify-between"
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
                      <span className="text-[11px] text-slate-500">
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
                    <span>Teams: {h.min_team_size} - {h.max_team_size} members</span>
                    <span className="text-brand-400 font-semibold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                      Details &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
