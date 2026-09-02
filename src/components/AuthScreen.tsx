import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Factory, Mail, Lock, User, Building, ArrowRight, AlertCircle } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await register(email, password, name, organization);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4FAF9] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-[#00796B] to-[#004D40] text-white shadow-lg shadow-[#00796B]/25 mb-4">
          <Factory className="w-8 h-8 text-[#E0F2F1]" />
        </div>
        <h1 className="text-3xl font-black text-[#004D40] tracking-tight">
          DF <span className="text-[#00796B]">Ultimate</span>
        </h1>
        <p className="mt-1.5 text-xs text-slate-500 font-bold uppercase tracking-[0.15em]">
          DF Automation & Robotics • Site Readiness System
        </p>
      </div>

      {/* Main Card Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-[2.5rem] border border-[#E0F2F1] shadow-xs">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-[#F4FAF9] rounded-2xl mb-6 border border-[#E0F2F1]">
            <button
              id="tab-sign-in-btn"
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-white text-[#00796B] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-create-account-btn"
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-white text-[#00796B] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create an Account
            </button>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-name-input"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Tan"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Company / Organization (Optional)
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-org-input"
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="e.g. DF Automation & Robotics / Customer Site"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@dfautomation.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-2xl border border-[#E0F2F1] bg-[#F4FAF9]/50 focus:outline-hidden focus:ring-2 focus:ring-[#00796B]/20 focus:border-[#00796B]"
                />
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-3 inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-bold rounded-2xl shadow-md shadow-[#00796B]/20 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create an Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-400 mt-6 font-medium">
          DF Ultimate • Site Readiness Verification System (FRM-FLD-003 Standard)
        </p>
      </div>
    </div>
  );
};
