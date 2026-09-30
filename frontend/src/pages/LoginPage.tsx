import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LogIn,
  UserPlus,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Shield,
  Gavel,
  Trophy,
  Users,
  Server,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import axios from 'axios';

interface LoginPageProps {
  initialTab?: 'login' | 'register';
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialTab = 'login' }) => {
  const { login, register, quickDemoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Parse query params to allow ?tab=register
  const queryParams = new URLSearchParams(location.search);
  const requestedTab = (queryParams.get('tab') === 'register' || location.pathname.includes('/register') || initialTab === 'register')
    ? 'register'
    : 'login';

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(requestedTab);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [ident, setIdent] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginFailedWithIdent, setLoginFailedWithIdent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Register form state
  const [regData, setRegData] = useState({
    email: '',
    username: '',
    password: '',
    full_name: '',
    role: 'PARTICIPANT' as UserRole,
    institution: '',
  });

  // Backend connectivity state
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isRetryingBackend, setIsRetryingBackend] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  // Check backend health
  const checkBackendHealth = async () => {
    setIsRetryingBackend(true);
    try {
      // Direct call to health endpoint
      const res = await axios.get('/api/v1/health', { timeout: 3000 });
      if (res.status === 200) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch {
      try {
        const rootRes = await axios.get('/', { timeout: 2000 });
        if (rootRes.status === 200) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch {
        setBackendStatus('offline');
      }
    } finally {
      setIsRetryingBackend(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 12000);
    return () => clearInterval(interval);
  }, []);

  // Update tab if location changes
  useEffect(() => {
    if (queryParams.get('tab') === 'register' || location.pathname.includes('/register')) {
      setActiveTab('register');
    }
  }, [location]);

  // Auto-suggest username and full name when email changes in register form
  const handleEmailChange = (emailVal: string) => {
    const clean = emailVal.trim();
    const updates: Partial<typeof regData> = { email: clean };
    if (!regData.username && clean.includes('@')) {
      const prefix = clean.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      updates.username = prefix.toLowerCase();
    }
    if (!regData.full_name && clean.includes('@')) {
      const raw = clean.split('@')[0].replace(/[0-9]/g, '').trim();
      if (raw) {
        updates.full_name = raw.charAt(0).toUpperCase() + raw.slice(1);
      }
    }
    setRegData(prev => ({ ...prev, ...updates }));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginFailedWithIdent(null);
    setLoading(true);
    try {
      await login(ident.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = typeof err.response?.data?.detail === 'string'
        ? err.response.data.detail
        : 'Invalid credentials or backend unreachable.';
      setError(msg);
      setLoginFailedWithIdent(ident.trim());
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        email: regData.email.trim().toLowerCase(),
        username: regData.username.trim().toLowerCase(),
        password: regData.password,
        full_name: regData.full_name.trim(),
        role: regData.role,
        institution: regData.institution.trim() || undefined,
      });
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = typeof err.response?.data?.detail === 'string'
        ? err.response.data.detail
        : 'Registration failed. Please check the details provided.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Instant 1-Click Auto Register for un-registered users typing personal email on login
  const handleQuickAutoRegister = async () => {
    if (!loginFailedWithIdent) return;
    setError('');
    setLoading(true);
    try {
      const cleanIdent = loginFailedWithIdent.toLowerCase();
      const isEmail = cleanIdent.includes('@');
      const email = isEmail ? cleanIdent : `${cleanIdent}@hackathon.local`;
      const prefix = cleanIdent.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'participant';
      const cleanName = prefix.replace(/[0-9]/g, '') || prefix;
      const fullName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

      await register({
        email: email,
        username: prefix.toLowerCase(),
        password: password || 'HackathonPass2026!',
        full_name: fullName || 'Hackathon Participant',
        role: 'PARTICIPANT' as UserRole,
      });
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = typeof err.response?.data?.detail === 'string'
        ? err.response.data.detail
        : 'Auto-registration failed. Please switch to Create Account tab.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchToRegisterWithPreFill = () => {
    if (loginFailedWithIdent) {
      handleEmailChange(loginFailedWithIdent);
      setRegData(prev => ({
        ...prev,
        email: loginFailedWithIdent,
        password: password,
      }));
    }
    setError('');
    setActiveTab('register');
  };

  const handleDemoClick = async (role: any) => {
    setError('');
    setLoading(true);
    try {
      await quickDemoLogin(role);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError('Demo login failed. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4 sm:px-6">
      {/* Backend Status Alert Banner (Shown if offline) */}
      {backendStatus === 'offline' && (
        <div className="mb-6 p-4 bg-amber-950/70 border border-amber-600/60 rounded-2xl text-amber-200 shadow-xl flex items-start gap-3">
          <Server className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs space-y-1.5">
            <div className="font-bold text-amber-300 text-sm">Backend Server Not Responding</div>
            <p className="text-amber-200/90 leading-relaxed">
              The FastAPI backend at <code className="px-1 py-0.5 bg-amber-900/60 rounded text-amber-300">http://127.0.0.1:8000</code> is offline.
            </p>
            <div className="bg-slate-950/80 p-2 rounded-lg border border-amber-800/40 text-[11px] font-mono text-amber-300 select-all">
              python -m uvicorn app.main:app --port 8000
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={checkBackendHealth}
                disabled={isRetryingBackend}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetryingBackend ? 'animate-spin' : ''}`} />
                {isRetryingBackend ? 'Checking...' : 'Retry Connection'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header & Status */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-500/30 text-brand-400 flex items-center justify-center">
              {activeTab === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">OpenHack Authentication</h2>
              <p className="text-xs text-slate-400">Offline-first local hackathon management</p>
            </div>
          </div>

          {/* Backend Status Pill */}
          <div className="flex items-center">
            {backendStatus === 'online' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Backend Online (:8000)
              </span>
            ) : backendStatus === 'offline' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-950/80 text-rose-400 border border-rose-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Backend Offline
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Connecting...
              </span>
            )}
          </div>
        </div>

        {/* 1-Click Demo Profiles Bar */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>⚡ 1-Click Instant Demo Access</span>
            </div>
            <span className="text-[10px] text-slate-500">No password required</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoClick('admin')}
              disabled={loading}
              className="p-2.5 text-left bg-slate-900/90 hover:bg-slate-800 border border-purple-900/50 hover:border-purple-600 rounded-xl transition group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-purple-400 group-hover:text-purple-300">👑 Admin</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">Platform Manager</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoClick('organizer')}
              disabled={loading}
              className="p-2.5 text-left bg-slate-900/90 hover:bg-slate-800 border border-amber-900/50 hover:border-amber-600 rounded-xl transition group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-amber-400 group-hover:text-amber-300">🎪 Organizer</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">Sarah (Host Events)</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoClick('participant')}
              disabled={loading}
              className="p-2.5 text-left bg-slate-900/90 hover:bg-slate-800 border border-emerald-900/50 hover:border-emerald-600 rounded-xl transition group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-emerald-400 group-hover:text-emerald-300">🚀 Participant</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">Alex (Teams & Code)</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoClick('judge1')}
              disabled={loading}
              className="p-2.5 text-left bg-slate-900/90 hover:bg-slate-800 border border-cyan-900/50 hover:border-cyan-600 rounded-xl transition group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-cyan-400 group-hover:text-cyan-300">⚖️ Judge Vance</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">Harsh Rubric Scorer</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoClick('judge2')}
              disabled={loading}
              className="p-2.5 text-left bg-slate-900/90 hover:bg-slate-800 border border-cyan-900/50 hover:border-cyan-600 rounded-xl transition group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-cyan-400 group-hover:text-cyan-300">⚖️ Judge Elena</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">Lenient Evaluator</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoClick('judge3')}
              disabled={loading}
              className="p-2.5 text-left bg-slate-900/90 hover:bg-slate-800 border border-cyan-900/50 hover:border-cyan-600 rounded-xl transition group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-cyan-400 group-hover:text-cyan-300">⚖️ Judge Kenji</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">Balanced Evaluator</div>
            </button>
          </div>
        </div>

        {/* Tab Toggle Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 ${
              activeTab === 'login'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In with Existing Account
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 ${
              activeTab === 'register'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create New Account
          </button>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {/* Smart Unregistered Email Prompt Banner */}
        {activeTab === 'login' && loginFailedWithIdent && (
          <div className="p-4 bg-amber-950/50 border border-amber-700/60 rounded-xl space-y-3">
            <div className="flex items-start gap-2 text-xs text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300">Account not found or password incorrect</span>
                <p className="text-[11px] text-amber-200/90 mt-0.5">
                  Are you new to this hackathon platform? You can register <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-200 font-mono">{loginFailedWithIdent}</code> right now!
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={handleQuickAutoRegister}
                disabled={loading}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                ⚡ Instant Register & Sign In Now
              </button>
              <button
                type="button"
                onClick={switchToRegisterWithPreFill}
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
              >
                Customize Profile Details &rarr;
              </button>
            </div>
          </div>
        )}

        {/* SIGN IN FORM */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username or Email Address
              </label>
              <input
                type="text"
                required
                value={ident}
                onChange={(e) => setIdent(e.target.value)}
                placeholder="e.g. 24nn1a4236bhavya@gmail.com or admin@example.local"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-brand-500 focus:outline-none text-sm text-white placeholder-slate-500 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-brand-500 focus:outline-none text-sm text-white placeholder-slate-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In to OpenHack
                </>
              )}
            </button>
          </form>
        )}

        {/* CREATE ACCOUNT FORM */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={regData.full_name}
                  onChange={(e) => setRegData({ ...regData, full_name: e.target.value })}
                  placeholder="e.g. Bhavya Sharma"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-brand-500 focus:outline-none text-sm text-white placeholder-slate-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username</label>
                <input
                  type="text"
                  required
                  value={regData.username}
                  onChange={(e) => setRegData({ ...regData, username: e.target.value })}
                  placeholder="e.g. bhavyas"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-brand-500 focus:outline-none text-sm text-white placeholder-slate-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={regData.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="e.g. 24nn1a4236bhavya@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-brand-500 focus:outline-none text-sm text-white placeholder-slate-500 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={regData.password}
                onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                placeholder="Choose a strong password"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-brand-500 focus:outline-none text-sm text-white placeholder-slate-500 transition"
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Account Role</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRegData({ ...regData, role: 'PARTICIPANT' })}
                  className={`p-3 rounded-xl border text-left transition ${
                    regData.role === 'PARTICIPANT'
                      ? 'bg-emerald-950/60 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5 text-emerald-400">
                    <Users className="w-3.5 h-3.5" /> Participant
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                    Join hackathons, create teams & submit projects
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRegData({ ...regData, role: 'ORGANIZER' })}
                  className={`p-3 rounded-xl border text-left transition ${
                    regData.role === 'ORGANIZER'
                      ? 'bg-amber-950/60 border-amber-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5 text-amber-400">
                    <Trophy className="w-3.5 h-3.5" /> Organizer
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                    Create & manage hackathons, tracks & rubrics
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRegData({ ...regData, role: 'JUDGE' })}
                  className={`p-3 rounded-xl border text-left transition ${
                    regData.role === 'JUDGE'
                      ? 'bg-cyan-950/60 border-cyan-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1.5 text-cyan-400">
                    <Gavel className="w-3.5 h-3.5" /> Judge
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                    Score submissions with statistical normalization
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                University or Organization <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={regData.institution}
                onChange={(e) => setRegData({ ...regData, institution: e.target.value })}
                placeholder="e.g. Stanford University or Tech Corp"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-brand-500 focus:outline-none text-sm text-white placeholder-slate-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Complete Registration & Sign In
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="pt-2 text-center text-xs text-slate-500">
          OpenHack platform runs with local SQLite &bull; No third-party tracking or cloud vendor lock-in.
        </div>
      </div>
    </div>
  );
};
