import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { ShieldCheck, Database, Key, CheckCircle2, AlertTriangle, User, Mail, Lock } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const { isSupabaseConfigured, signIn, signUp, user, signOut, enableDevMode } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password, fullName);
        toast.success('Account created successfully! Check your email if confirmation is enabled.');
      } else {
        await signIn(email, password);
        toast.success('Signed in successfully!');
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevModeSelect = () => {
    enableDevMode();
    toast.info('Switched to Development Mode (Local SQLite DB active).');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSupabaseConfigured ? (mode === 'signin' ? 'Sign In to WanderWise AI' : 'Create WanderWise AI Account') : 'Supabase Authentication & Database Setup'}
      subtitle={isSupabaseConfigured ? 'Access your private itineraries across all devices' : 'Configure Cloud Database or use Development Mode'}
      maxWidth="max-w-lg"
    >
      {!isSupabaseConfigured ? (
        <div className="space-y-5">
          {/* Helpful configuration message */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-semibold text-amber-900">Supabase Credentials Not Yet Configured in Frontend</p>
              <p>
                To enable live cloud authentication and cloud sync, provide your Supabase API keys in <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">frontend/.env</code>.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-slate-700">
            <p className="font-bold text-navy-900 flex items-center gap-1.5 text-sm">
              <Database className="w-4 h-4 text-teal-600" />
              Quick Setup Steps:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-slate-600">
              <li>Open <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-teal-600 underline font-medium">supabase.com</a> and create a free project.</li>
              <li>Go to <strong>SQL Editor</strong> and execute <code className="bg-slate-200 text-slate-800 px-1 rounded">supabase/schema.sql</code>.</li>
              <li>Go to <strong>Project Settings → API</strong> and copy your <strong>URL</strong> and <strong>Anon Key</strong>.</li>
              <li>Add them to <code className="bg-slate-200 text-slate-800 px-1 rounded">frontend/.env</code> as:
                <pre className="mt-1.5 p-2 bg-navy-950 text-slate-200 rounded font-mono text-[11px] overflow-x-auto">
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
                </pre>
              </li>
            </ol>
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span className="text-xs text-teal-900 font-medium">
                  Development Mode is Active & Fully Functional
                </span>
              </div>
              <Badge variant="primary" size="sm">Local SQLite</Badge>
            </div>

            <Button
              variant="teal"
              className="w-full py-2.5"
              onClick={handleDevModeSelect}
            >
              Continue in Development Mode (WanderWise Explorer)
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {user && !user.isDev ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-semibold text-navy-900">{user.user_metadata?.full_name || 'Traveler'}</h4>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
              <div className="pt-2 flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Close
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    await signOut();
                    toast.info('Signed out.');
                    onClose();
                  }}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tab selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setErrorMsg(''); }}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    mode === 'signin' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setErrorMsg(''); }}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    mode === 'signup' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-navy-900 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="explorer@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="teal"
                isLoading={loading}
                className="w-full py-2.5 mt-2"
              >
                {mode === 'signin' ? 'Sign In' : 'Create Free Account'}
              </Button>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}
