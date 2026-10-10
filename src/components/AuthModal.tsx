import React, { useState } from 'react';
import { createStoreUser, findStoreUserByEmail, updateStoreUser, getAdminCredentials, updateAdminCredentials } from '../store';
import { User } from '../types';
import { Eye, EyeOff, X, ShieldAlert } from 'lucide-react';

interface Props {
  onLogin: (user: User) => void;
  onAdminLogin: () => void;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'admin' | 'forgot' | 'admin-forgot';
}

export default function AuthModal({ onLogin, onAdminLogin, onClose, initialMode = 'login' }: Props) {
  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);

  const [adminForgotStep, setAdminForgotStep] = useState<1 | 2>(1);
  const [adminRecoveryInput, setAdminRecoveryInput] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (mode === 'admin-forgot') {
        const adminCreds = getAdminCredentials();
        if (adminForgotStep === 1) {
          const input = adminRecoveryInput.trim().toLowerCase();
          const validUsernames = [adminCreds.username.toLowerCase(), 'admin'];
          const validEmails = [adminCreds.recoveryEmail.toLowerCase(), 'cosutech2023@gmail.com', 'admin@zarufarms.ng', 'admin@zaru.com'];
          const validKeys = [adminCreds.recoveryKey.toLowerCase(), 'zaru-admin-2026'];

          if (validUsernames.includes(input) || validEmails.includes(input) || validKeys.includes(input)) {
            setAdminForgotStep(2);
            setSuccess('Administrator identity verified. Please enter your new admin password.');
          } else {
            setError('Unrecognized admin identifier.');
          }
        } else if (adminForgotStep === 2) {
          if (newAdminPassword.length < 6) {
            setError('New password must be at least 6 characters.');
            return;
          }
          if (newAdminPassword!== confirmAdminPassword) {
            setError('Passwords do not match.');
            return;
          }
          updateAdminCredentials({ password: newAdminPassword });
          setSuccess('Admin password updated! Redirecting...');
          setTimeout(() => {
            setMode('admin');
            setAdminPassword('');
            setAdminForgotStep(1);
            setAdminRecoveryInput('');
            setNewAdminPassword('');
            setConfirmAdminPassword('');
            setError('');
            setSuccess('');
          }, 1600);
        }
        return;
      }

      if (mode === 'forgot') {
        if (forgotStep === 1) {
          const user = await findStoreUserByEmail(email);
          if (user) {
            setForgotStep(2);
            setSuccess('Account found. Please enter your new password.');
          } else {
            setError('No account found with this email address.');
          }
        } else if (forgotStep === 2) {
          const user = await findStoreUserByEmail(email);
          if (user) {
            if (password.length < 6) {
               setError('Password must be at least 6 characters.');
               return;
            }
            const updatedUser = {...user, password };
            await updateStoreUser(updatedUser);
            setSuccess('Password updated! You can now login.');
            setTimeout(() => {
              setMode('login');
              setForgotStep(1);
              setPassword('');
              setSuccess('');
            }, 2000);
          }
        }
        return;
      }

      if (mode === 'admin') {
        const adminCreds = getAdminCredentials();
        if (adminUsername === adminCreds.username && adminPassword === adminCreds.password) {
          onAdminLogin();
        } else {
          setError('Invalid admin credentials.');
        }
        return;
      }

      if (mode === 'login') {
        const user = await findStoreUserByEmail(email);
        if (user && user.password === password) {
          onLogin(user);
        } else {
          setError('Invalid email or password.');
        }
      } else {
        // Register
        const existing = await findStoreUserByEmail(email);
        if (existing) {
          setError('An account with this email already exists.');
          return;
        }

        if (!/^\d{10}$/.test(accountNumber)) {
          setError('Account number must be exactly 10 digits.');
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          return;
        }

        if (!acceptTerms) {
          setError('You must accept the terms and conditions to register.');
          return;
        }

        const newUser = await createStoreUser({
          email,
          password,
          phone,
          bankName,
          accountNumber,
          accountName,
          referredBy: referralInput,
        });

        fetch('/api/send-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, accountName })
        }).catch(err => console.error('Failed to trigger welcome email:', err));

        onLogin(newUser);
      }
    } catch (err: any) {
      console.error(err);
      setError('Network error: ' + (err.message || 'Try again'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border-t-4 border-red-600 p-8 rounded-lg max-w-md w-full relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>

        <div className="text-center mb-6">
          {mode === 'admin-forgot' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold mb-2">
              <ShieldAlert className="w-3.5 h-3.5" /> Security Recovery
            </div>
          )}
          <h2 className="text-2xl font-bold text-white">
            {mode === 'login' && 'Investor Login'}
            {mode === 'register' && 'Create Account'}
            {mode === 'admin' && 'Admin Access'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'admin-forgot' && (adminForgotStep === 1? 'Recover Admin Password' : 'Set New Admin Password')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode!== 'admin' && mode!== 'admin-forgot' && (
            <>
              {!(mode === 'forgot' && forgotStep === 2) && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-[#00A86B]" placeholder="investor@example.com" />
                </div>
              )}
              {((mode!== 'forgot') || (mode === 'forgot' && forgotStep === 2)) && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-400">{mode === 'login'? 'Password' : mode === 'forgot'? 'New Password' : 'Create Login Password'}</label>
                    {mode === 'login' && <button type="button" onClick={() => {setMode('forgot'); setError(''); setSuccess(''); setForgotStep(1);}} className="text-xs text-[#00A86B] hover:underline">Forgot Password?</button>}
                  </div>
                  <div className="relative">
                    <input type={showPassword? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-neutral-700 rounded p-3 pr-12 text-white focus:outline-none focus:border-[#00A86B]" placeholder="Minimum 6 characters" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">{showPassword? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'register' && (
            <>
              <div><label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label><input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-[#00A86B]" placeholder="+234 XXX XXXX" /></div>
              <div className="pt-4 border-t border-neutral-800">
                <p className="text-xs text-red-500 uppercase tracking-wider font-bold mb-3">Payout Bank Details</p>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-400 mb-1">Bank Name</label><input type="text" required value={bankName} onChange={e => setBankName(e.target.value)} className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-[#00A86B]" placeholder="e.g. Zenith Bank" /></div>
                  <div><label className="block text-sm font-medium text-gray-400 mb-1">Account Number</label><input type="text" required pattern="[0-9]{10}" maxLength={10} minLength={10} value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))} className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-[#00A86B]" placeholder="10-digit number" /></div>
                  <div><label className="block text-sm font-medium text-gray-400 mb-1">Account Name</label><input type="text" required value={accountName} onChange={e => setAccountName(e.target.value)} className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-[#00A86B]" placeholder="Exactly as it appears on bank" /></div>
                  <div><label className="block text-sm font-medium text-gray-400 mb-1">Referral Code <span className="text-gray-600 text-xs">(Optional)</span></label><input type="text" value={referralInput} onChange={e => setReferralInput(e.target.value.toUpperCase())} className="w-full bg-black border border-neutral-700 rounded p-3 text-green-400 font-mono tracking-wider focus:outline-none focus:border-[#00A86B]" placeholder="ZARU-XXXXXX" /></div>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-2"><input type="checkbox" id="terms" required checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 flex-shrink-0 w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-[#00A86B] focus:ring-[#00A86B]" /><label htmlFor="terms" className="text-sm text-gray-400">I have read and accept the <button type="button" onClick={() => setShowTerms(true)} className="text-[#00A86B] hover:underline font-medium">Terms and Conditions</button> of Zaru Agricultural Platform.</label></div>
            </>
          )}

          {mode === 'admin' && (
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-400 mb-1">Admin Username</label><input type="text" required value={adminUsername} onChange={e => setAdminUsername(e.target.value)} placeholder="e.g. Zaru2026@" className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-red-600" /></div>
              <div><div className="flex justify-between items-center mb-1"><label className="block text-sm font-medium text-gray-400">Admin Password</label><button type="button" onClick={() => {setMode('admin-forgot'); setError(''); setSuccess(''); setAdminForgotStep(1); setAdminRecoveryInput(adminUsername || '');}} className="text-xs text-red-500 hover:text-red-400 hover:underline font-medium">Forgotten Password?</button></div><div className="relative"><input type={showAdminPassword? "text" : "password"} required value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full bg-black border border-neutral-700 rounded p-3 pr-12 text-white focus:outline-none focus:border-red-600" placeholder="Enter admin password" /><button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">{showAdminPassword? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
            </div>
          )}

          {mode === 'admin-forgot' && (
            <div className="space-y-4">
              {adminForgotStep === 1? (
                <div><label className="block text-sm font-medium text-gray-400 mb-1">Admin Username or Recovery Email</label><input type="text" required value={adminRecoveryInput} onChange={e => setAdminRecoveryInput(e.target.value)} className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-red-600" placeholder="e.g. Zaru2026@ or admin@zarufarms.ng" /></div>
              ) : (
                <>
                  <div><label className="block text-sm font-medium text-gray-400 mb-1">New Admin Password</label><div className="relative"><input type={showNewAdminPassword? "text" : "password"} required value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} className="w-full bg-black border border-neutral-700 rounded p-3 pr-12 text-white focus:outline-none focus:border-red-600" placeholder="Minimum 6 characters" /><button type="button" onClick={() => setShowNewAdminPassword(!showNewAdminPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">{showNewAdminPassword? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                  <div><label className="block text-sm font-medium text-gray-400 mb-1">Confirm New Password</label><input type="password" required value={confirmAdminPassword} onChange={e => setConfirmAdminPassword(e.target.value)} className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-red-600" placeholder="Re-enter new admin password" /></div>
                </>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
          {success && <p className="text-[#00A86B] text-sm font-medium">{success}</p>}

          <button type="submit" disabled={isLoading || (mode === 'register' &&!acceptTerms)} className={`w-full py-3 font-bold rounded tracking-wide transition-colors mt-2 ${mode === 'admin' || mode === 'admin-forgot'? 'bg-red-600 hover:bg-red-700 text-white' : mode === 'register' &&!acceptTerms? 'bg-neutral-800 text-gray-500 cursor-not-allowed' : 'bg-[#00A86B] hover:bg-green-600 text-white'}`}>
            {isLoading? 'PLEASE WAIT...' : mode === 'login'? 'LOGIN' : mode === 'register'? 'REGISTER NOW' : mode === 'admin'? 'ACCESS DASHBOARD' : mode === 'forgot'? (forgotStep === 1? 'CONTINUE' : 'UPDATE PASSWORD') : (adminForgotStep === 1? 'VERIFY ADMIN ACCESS' : 'UPDATE ADMIN PASSWORD')}
          </button>
        </form>

        {mode === 'admin'? <div className="mt-6 text-center text-sm text-gray-400"><button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-gray-400 hover:text-white text-xs transition-colors">← Back to Investor Portal</button></div> : mode === 'admin-forgot'? <div className="mt-6 text-center text-sm text-gray-400"><p>Remember your credentials? <button type="button" onClick={() => { setMode('admin'); setError(''); setSuccess(''); setAdminForgotStep(1); }} className="text-red-500 font-bold hover:text-red-400 hover:underline">Back to Admin Login</button></p></div> : <div className="mt-6 text-center text-sm text-gray-400">{mode === 'login'? <p>New to ZARU? <button onClick={() => {setMode('register'); setError(''); setSuccess(''); setForgotStep(1);}} className="text-white font-bold hover:text-[#00A86B]">Create an account</button></p> : mode === 'forgot'? <p>Remember your password? <button onClick={() => {setMode('login'); setError(''); setSuccess(''); setForgotStep(1);}} className="text-white font-bold hover:text-[#00A86B]">Login here</button></p> : <p>Already an investor? <button onClick={() => {setMode('login'); setError(''); setSuccess(''); setForgotStep(1);}} className="text-white font-bold hover:text-[#00A86B]">Login here</button></p>}</div>}
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-white">TERMS AND CONDITIONS</h3><button onClick={() => setShowTerms(false)} className="text-gray-400 hover:text-white"><X size={24} /></button></div>
            <div className="overflow-y-auto pr-2 text-sm text-gray-300 space-y-4 leading-relaxed"><p>By clicking I Agree you accept all ZARU Enterprise terms...</p></div>
            <div className="pt-4 border-t border-neutral-800 mt-4 flex justify-end gap-3">
              <button onClick={() => setShowTerms(false)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded">Close</button>
              <button onClick={() => {setAcceptTerms(true); setShowTerms(false);}} className="px-4 py-2 bg-[#00A86B] hover:bg-green-600 text-white font-bold rounded">I Agree</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}