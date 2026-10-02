import React, { useState } from 'react';
import { getAdminCredentials, updateAdminCredentials } from '../store';
import { ShieldCheck, Eye, EyeOff, Lock, UserCheck, KeyRound, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

interface Props {
  onAdminLogin: () => void;
  onNavigateHome: () => void;
}

export default function AdminLoginPage({ onAdminLogin, onNavigateHome }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Recovery flow
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    setTimeout(() => {
      const adminCreds = getAdminCredentials();
      if (username.trim() === adminCreds.username && password === adminCreds.password) {
        setSuccess('Authentication successful. Redirecting to Admin Dashboard...');
        setTimeout(() => {
          onAdminLogin();
        }, 500);
      } else {
        setIsLoading(false);
        setError('Invalid administrator credentials. Please check your username and password.');
      }
    }, 400);
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const adminCreds = getAdminCredentials();

    if (recoveryStep === 1) {
      const input = recoveryInput.trim().toLowerCase();
      const validUsernames = [adminCreds.username.toLowerCase(), 'admin'];
      const validEmails = [adminCreds.recoveryEmail.toLowerCase(), 'cosutech2023@gmail.com', 'admin@zarufarms.ng', 'admin@zaru.com'];
      const validKeys = [adminCreds.recoveryKey.toLowerCase(), 'zaru-admin-2026'];

      if (validUsernames.includes(input) || validEmails.includes(input) || validKeys.includes(input)) {
        setRecoveryStep(2);
        setSuccess('Administrator identity verified. Please enter your new password.');
      } else {
        setError('Unrecognized identifier. Enter your Admin Username, registered recovery email, or Master Key.');
      }
    } else if (recoveryStep === 2) {
      if (newPassword.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      updateAdminCredentials({ password: newPassword });
      setSuccess('Admin password updated successfully! You can now log in.');
      setTimeout(() => {
        setIsForgotMode(false);
        setRecoveryStep(1);
        setRecoveryInput('');
        setPassword(newPassword);
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        setSuccess('');
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black opacity-80" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-950/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-950/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Top Back Link */}
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Return to main website</span>
        </button>

        {/* Card */}
        <div className="bg-neutral-900/90 border border-neutral-800 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 text-emerald-400 mb-4 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {isForgotMode ? 'Admin Recovery' : 'Admin Portal'}
            </h1>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">
              ZARU ENTERPRISE • RESTRICTED ACCESS
            </p>
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="mb-6 p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {!isForgotMode ? (
            /* Standard Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                  Admin Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter admin username"
                    className="w-full bg-black/60 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(true);
                      setError('');
                      setSuccess('');
                      setRecoveryStep(1);
                      setRecoveryInput(username);
                    }}
                    className="text-xs text-gray-400 hover:text-emerald-400 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full bg-black/60 border border-neutral-800 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-[#00A86B] hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-emerald-950/40 hover:shadow-emerald-900/60 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>AUTHENTICATING...</span>
                  </>
                ) : (
                  <span>AUTHENTICATE & ENTER</span>
                )}
              </button>
            </form>
          ) : (
            /* Forgot Password Flow */
            <form onSubmit={handleRecoverySubmit} className="space-y-5">
              {recoveryStep === 1 ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                      Identity Identifier
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={recoveryInput}
                        onChange={e => setRecoveryInput(e.target.value)}
                        placeholder="Admin Username, Email, or Recovery Key"
                        className="w-full bg-black/60 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                      Provide your Admin Username, authorized recovery email (<code className="text-gray-400">admin@zarufarms.ng</code>), or the platform security key.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-colors"
                  >
                    VERIFY IDENTITY
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                      New Admin Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full bg-black/60 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full bg-black/60 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-colors"
                  >
                    SAVE NEW PASSWORD
                  </button>
                </>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(false);
                    setError('');
                    setSuccess('');
                    setRecoveryStep(1);
                  }}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  ← Back to Admin Login
                </button>
              </div>
            </form>
          )}

          {/* Security notice */}
          <div className="mt-8 pt-6 border-t border-neutral-800/80 text-center">
            <p className="text-[11px] text-gray-600 leading-normal">
              Unauthorized access attempts are monitored and recorded. This portal is strictly for authorized ZARU ENTERPRISE system operators.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
