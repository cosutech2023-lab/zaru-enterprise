import React, { useState } from 'react';
import { createStoreUser, findStoreUserByEmail, updateStoreUser, getAdminCredentials, updateAdminCredentials } from '../store';
import { User } from '../types';
import { Eye, EyeOff, X, ShieldAlert, KeyRound } from 'lucide-react';

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

  // Admin forgot password states
  const [adminForgotStep, setAdminForgotStep] = useState<1 | 2>(1);
  const [adminRecoveryInput, setAdminRecoveryInput] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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
          setError('Unrecognized admin identifier. Please enter your Admin Username (e.g. Zaru2026@) or registered recovery email.');
        }
      } else if (adminForgotStep === 2) {
        if (newAdminPassword.length < 6) {
          setError('New password must be at least 6 characters.');
          return;
        }
        if (newAdminPassword !== confirmAdminPassword) {
          setError('Passwords do not match.');
          return;
        }
        updateAdminCredentials({ password: newAdminPassword });
        setSuccess('Admin password updated successfully! Redirecting to login...');
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
        const user = findStoreUserByEmail(email);
        if (user) {
          setForgotStep(2);
          setSuccess('Account found. Please enter your new password.');
        } else {
          setError('No account found with this email address.');
        }
      } else if (forgotStep === 2) {
        const user = findStoreUserByEmail(email);
        if (user) {
          if (password.length < 6) {
             setError('Password must be at least 6 characters.');
             return;
          }
          const updatedUser = { ...user, password };
          updateStoreUser(updatedUser);
          setSuccess('Password updated successfully! You can now login.');
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
      const user = findStoreUserByEmail(email);
      if (user && user.password === password) {
        onLogin(user);
      } else {
        setError('Invalid email or password.');
      }
    } else {
      // Register
      if (findStoreUserByEmail(email)) {
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

      const newUser = createStoreUser({
        email,
        password,
        phone,
        bankName,
        accountNumber,
        accountName,
        referredBy: referralInput,
      });

      // Send welcome email (asynchronous, so we don't block the login)
      fetch('/api/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, accountName })
      }).catch(err => console.error('Failed to trigger welcome email:', err));

      onLogin(newUser);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border-t-4 border-red-600 p-8 rounded-lg max-w-md w-full relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white"
        >
          ✕
        </button>
        
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
            {mode === 'admin-forgot' && (adminForgotStep === 1 ? 'Recover Admin Password' : 'Set New Admin Password')}
          </h2>
          {mode === 'admin-forgot' && (
            <p className="text-xs text-gray-400 mt-1">
              {adminForgotStep === 1 
                ? 'Verify your administrator username or recovery email address.' 
                : 'Choose a secure new password to access the administrative dashboard.'}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode !== 'admin' && mode !== 'admin-forgot' && (
            <>
              {!(mode === 'forgot' && forgotStep === 2) && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                  <input 
                    type="email" required
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-[#00A86B]"
                    placeholder="investor@example.com"
                  />
                </div>
              )}
              {((mode !== 'forgot') || (mode === 'forgot' && forgotStep === 2)) && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-400">
                      {mode === 'login' ? 'Password' : mode === 'forgot' ? 'New Password' : 'Create Login Password'}
                    </label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => {setMode('forgot'); setError(''); setSuccess(''); setForgotStep(1);}} className="text-xs text-[#00A86B] hover:underline">
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} required
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full bg-black border border-neutral-700 rounded p-3 pr-12 text-white focus:outline-none focus:border-[#00A86B]"
                      placeholder="Minimum 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
                <input 
                  type="tel" required
                  value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-[#00A86B]"
                  placeholder="+234 XXX XXXX"
                />
              </div>
              <div className="pt-4 border-t border-neutral-800">
                <p className="text-xs text-red-500 uppercase tracking-wider font-bold mb-3">Payout Bank Details</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Bank Name</label>
                    <input 
                      type="text" required
                      value={bankName} onChange={e => setBankName(e.target.value)}
                      className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-[#00A86B]"
                      placeholder="e.g. Zenith Bank"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Account Number</label>
                    <input 
                      type="text" required pattern="[0-9]{10}" maxLength={10} minLength={10} title="Account number must be exactly 10 digits"
                      value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-[#00A86B]"
                      placeholder="10-digit number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Account Name</label>
                    <input 
                      type="text" required
                      value={accountName} onChange={e => setAccountName(e.target.value)}
                      className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-[#00A86B]"
                      placeholder="Exactly as it appears on bank"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Referral Code <span className="text-gray-600 text-xs">(Optional)</span></label>
                    <input 
                      type="text"
                      value={referralInput} onChange={e => setReferralInput(e.target.value.toUpperCase())}
                      className="w-full bg-black border border-neutral-700 rounded p-3 text-green-400 font-mono tracking-wider focus:outline-none focus:border-[#00A86B]"
                      placeholder="SAP-XXXXXX"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 flex-shrink-0 w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-[#00A86B] focus:ring-[#00A86B]"
                />
                <label htmlFor="terms" className="text-sm text-gray-400">
                  I have read and accept the <button type="button" onClick={() => setShowTerms(true)} className="text-[#00A86B] hover:underline font-medium">Terms and Conditions</button> of Zaru Agricultural Platform.
                </label>
              </div>
            </>
          )}

          {mode === 'admin' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Admin Username</label>
                <input 
                  type="text" required
                  value={adminUsername} onChange={e => setAdminUsername(e.target.value)}
                  placeholder="e.g. Zaru2026@"
                  className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-red-600"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-400">Admin Password</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      setMode('admin-forgot');
                      setError('');
                      setSuccess('');
                      setAdminForgotStep(1);
                      setAdminRecoveryInput(adminUsername || '');
                    }} 
                    className="text-xs text-red-500 hover:text-red-400 hover:underline font-medium"
                  >
                    Forgotten Password?
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showAdminPassword ? "text" : "password"} required
                    value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
                    className="w-full bg-black border border-neutral-700 rounded p-3 pr-12 text-white focus:outline-none focus:border-red-600"
                    placeholder="Enter admin password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === 'admin-forgot' && (
            <div className="space-y-4">
              {adminForgotStep === 1 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Admin Username or Recovery Email
                  </label>
                  <div className="relative">
                    <input 
                      type="text" required
                      value={adminRecoveryInput} 
                      onChange={e => setAdminRecoveryInput(e.target.value)}
                      className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-red-600"
                      placeholder="e.g. Zaru2026@ or admin@zarufarms.ng"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    Enter your Admin Username or registered administrative email address.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">New Admin Password</label>
                    <div className="relative">
                      <input 
                        type={showNewAdminPassword ? "text" : "password"} required
                        value={newAdminPassword} 
                        onChange={e => setNewAdminPassword(e.target.value)}
                        className="w-full bg-black border border-neutral-700 rounded p-3 pr-12 text-white focus:outline-none focus:border-red-600"
                        placeholder="Minimum 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showNewAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Confirm New Password</label>
                    <input 
                      type="password" required
                      value={confirmAdminPassword} 
                      onChange={e => setConfirmAdminPassword(e.target.value)}
                      className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-red-600"
                      placeholder="Re-enter new admin password"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
          {success && <p className="text-[#00A86B] text-sm font-medium">{success}</p>}

          <button 
            type="submit"
            disabled={mode === 'register' && !acceptTerms}
            className={`w-full py-3 font-bold rounded tracking-wide transition-colors mt-2 ${
              mode === 'admin' || mode === 'admin-forgot'
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : mode === 'register' && !acceptTerms
                  ? 'bg-neutral-800 text-gray-500 cursor-not-allowed'
                  : 'bg-[#00A86B] hover:bg-green-600 text-white'
            }`}
          >
            {mode === 'login' && 'LOGIN'}
            {mode === 'register' && 'REGISTER NOW'}
            {mode === 'admin' && 'ACCESS DASHBOARD'}
            {mode === 'forgot' && (forgotStep === 1 ? 'CONTINUE' : 'UPDATE PASSWORD')}
            {mode === 'admin-forgot' && (adminForgotStep === 1 ? 'VERIFY ADMIN ACCESS' : 'UPDATE ADMIN PASSWORD')}
          </button>
        </form>

        {mode === 'admin' ? (
          <div className="mt-6 text-center text-sm text-gray-400">
            <button 
              type="button" 
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }} 
              className="text-gray-400 hover:text-white text-xs transition-colors"
            >
              ← Back to Investor Portal
            </button>
          </div>
        ) : mode === 'admin-forgot' ? (
          <div className="mt-6 text-center text-sm text-gray-400">
            <p>
              Remember your credentials?{' '}
              <button 
                type="button" 
                onClick={() => { setMode('admin'); setError(''); setSuccess(''); setAdminForgotStep(1); }} 
                className="text-red-500 font-bold hover:text-red-400 hover:underline"
              >
                Back to Admin Login
              </button>
            </p>
          </div>
        ) : (
          <div className="mt-6 text-center text-sm text-gray-400">
            {mode === 'login' ? (
              <p>New to ZARU? <button onClick={() => {setMode('register'); setError(''); setSuccess(''); setForgotStep(1);}} className="text-white font-bold hover:text-[#00A86B]">Create an account</button></p>
            ) : mode === 'forgot' ? (
              <p>Remember your password? <button onClick={() => {setMode('login'); setError(''); setSuccess(''); setForgotStep(1);}} className="text-white font-bold hover:text-[#00A86B]">Login here</button></p>
            ) : (
              <p>Already an investor? <button onClick={() => {setMode('login'); setError(''); setSuccess(''); setForgotStep(1);}} className="text-white font-bold hover:text-[#00A86B]">Login here</button></p>
            )}
          </div>
        )}
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">TERMS AND CONDITIONS FOR ZARU ENTERPRISE</h3>
              <button onClick={() => setShowTerms(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="overflow-y-auto pr-2 text-sm text-gray-300 space-y-4 font-mono leading-relaxed">
              <p>Welcome to ZARU ENTERPRISE. These Terms and Conditions ("Terms") govern your use of our website, mobile platform, and investment services. By creating an account or investing, you agree to these Terms.</p>
              
              <h4 className="text-white font-bold text-base pt-2">ABOUT ZARU ENTERPRISE</h4>
              <p>ZARU ENTERPRISE is a registered agricultural firm in Nigeria involved in crop farming, livestock, agro-processing, and farm produce trading. We provide an opportunity for members of the public to co-invest in our agricultural projects and earn returns based on farm yields and trading profits.<br/>Our platform operates as Zaru a peer-assisted agricultural financing platform.</p>

              <h4 className="text-white font-bold text-base pt-2">2. DEFINITIONS</h4>
              <p>ZARU ENTERPRISE is our company name.<br/>Investor/User means any person who creates an account and invests.</p>

              <h4 className="text-white font-bold text-base pt-2">3. ELIGIBILITY</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>3.1. You must be 18 years or older.</li>
                <li>3.2. You must provide accurate KYC information: Full Name, Valid Phone Number, Email, and Bank Account.</li>
                <li>3.3. One account per person. Multiple accounts will be banned.</li>
                <li>3.4. ZARU reserves the right to reject any registration.</li>
              </ul>

              <h4 className="text-white font-bold text-base pt-2">4. NATURE OF INVESTMENT</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>4.1. Your investment is used directly for agricultural purposes including but not limited to: farm land lease, seedlings, fertilizers, livestock feeds, labour, storage and logistics.</li>
                <li>4.2. This is NOT a banking deposit. It is an agricultural co-investment.</li>
                <li>4.3. Returns are based on agricultural output and market performance.</li>
                <li>4.4. Minimum Investment: NGN 30,000. Maximum Investment: NGN 20,000,000 per slot. investing above 20,000,000 will lead to automatic ban and forfeiture of the money.</li>
              </ul>

              <h4 className="text-white font-bold text-base pt-2">5. HOW IT WORKS PURCHASE PLAN & REQUEST WITHDRAWAL</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>5.1. PURCHASE PLAN You select an amount to buy. Your funds are allocated to an active farm cycle. Pledge duration is 14 days.</li>
                <li>5.2. DIVIDEND After 14 days, you are eligible for up to 15% to 20% dividend on your purchased plan amount, subject to farm yield.</li>
                <li>5.3. REQUEST WITHDRAWAL After maturity, you can request your capital + dividend after two time withdraw of only dividend via the request withdrawal button on your dashboard.</li>
                <li>5.4. Approval is done by the system admin. Payouts are processed within 24 to 48 hours.</li>
                <li>5.5. You must have an active "Request withdrawal" to be eligible for withdrawal.</li>
              </ul>

              <h4 className="text-white font-bold text-base pt-2">6. RISK DISCLOSURE</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>6.1. Agriculture involves risks: weather, pests, disease, market price fluctuation.</li>
                <li>6.2. While ZARU takes all measures to secure investments through insurance and best practices, we do not guarantee 100% capital protection in cases of force majeure (flood, drought, fire, government policy).</li>
                <li>6.3. By investing, you acknowledge and accept these risks.</li>
                <li>6.4. Past performance does not guarantee future returns.</li>
              </ul>

              <h4 className="text-white font-bold text-base pt-2">7. PAYMENTS & WITHDRAWALS</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>7.1. All payments are in Nigerian Naira (NGN).</li>
                <li>7.2. Deposits must be made to the company's official account displayed on your dashboard only.</li>
                <li>7.3. Withdrawals are only to the bank account registered in your name.</li>
                <li>7.4. ZARU will never ask for your password or ask you to pay to a personal account.</li>
              </ul>

              <h4 className="text-white font-bold text-base pt-2">8. USER OBLIGATIONS</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>8.1. You must keep your login details confidential.</li>
                <li>8.2. You must not use the platform for money laundering or fraud.</li>
                <li>8.3. You must not create fake payment proofs.</li>
                <li>8.4. Any attempt to manipulate the system will lead to permanent ban and forfeiture of funds.</li>
              </ul>

              <h4 className="text-white font-bold text-base pt-2">9. COMPANY OBLIGATIONS</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>9.1. To manage funds transparently and provide regular farm updates.</li>
                <li>9.2. To process withdrawal requests fairly and timely.</li>
                <li>9.3. To maintain data privacy and security.</li>
              </ul>

              <h4 className="text-white font-bold text-base pt-2">10. CANCELLATION & REFUND</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>10.1. A purchase plan can be cancelled within 2 hours if not yet approved.</li>
                <li>10.2. After approved, cancellation is not possible until maturity.</li>
                <li>10.3. In case of proven system error, a refund will be processed within 7 working days.</li>
              </ul>

              <h4 className="text-white font-bold text-base pt-2">11. FEES</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>11.1. ZARU charges a 2% management fee on dividends earned. This is deducted automatically.</li>
                <li>11.2. No hidden charges.</li>
              </ul>

              <h4 className="text-white font-bold text-base pt-2">12. ACCOUNT SUSPENSION & TERMINATION</h4>
              <p>We reserve the right to suspend or terminate accounts that violate these Terms, provide false information, or engage in fraudulent activity.</p>

              <h4 className="text-white font-bold text-base pt-2">13. LIMITATION OF LIABILITY</h4>
              <p>ZARU ENTERPRISE shall not be liable for indirect losses, loss of profit, or third-party actions.</p>

              <h4 className="text-white font-bold text-base pt-2">14. PRIVACY POLICY</h4>
              <p>Your personal data will be used only for KYC, payment processing, and communication. We do not sell your data.</p>

              <h4 className="text-white font-bold text-base pt-2">15. INTELLECTUAL PROPERTY</h4>
              <p>All content on the platform, including logo "ZARU", text, images are property of ZARU ENTERPRISE.</p>

              <h4 className="text-white font-bold text-base pt-2">17. CHANGES TO TERMS</h4>
              <p>We may update these Terms at any time. Continued use of the platform means you accept the new Terms.</p>

              <p className="font-bold">By clicking "I Agree" you confirm that you have read, understood, and accepted these Terms and Conditions.</p>

              <div className="bg-neutral-800/50 p-4 rounded text-xs border border-neutral-700/50">
                <p className="font-bold mb-2 text-white">Disclaimer:</p>
                <p className="mb-2">By accessing and using our platform, you acknowledge and agree that Zaru Enterprise shall not be held liable for any direct, indirect, incidental, or consequential financial losses, damages, or missed opportunities incurred by individuals. Please invest only what you can afford.</p>
                <p className="mb-4">All participation, investments, or transactions are undertaken at your own risk. Zaru enterprise has the Right to Restrict or Terminate Accounts.</p>
                <p className="mb-2">We are committed to maintaining a fair, safe, and transparent environment for all users. Zaru Enterprise reserves the absolute right to suspend, restrict, or permanently terminate any user account, without prior notice, if we detect any attempt to cheat, exploit, hack, or manipulate the system or its features.</p>
                <p>Fraudulent activities, by usage of unauthorized automated bots, or deceptive practices is a violations of our Terms of Service or community guidelines.<br/>By continuing or Accepting to use our services, you agree to abide by these terms.</p>
              </div>
            </div>
            <div className="pt-4 border-t border-neutral-800 mt-4 flex justify-end gap-3">
              <button 
                onClick={() => setShowTerms(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  setAcceptTerms(true);
                  setShowTerms(false);
                }}
                className="px-4 py-2 bg-[#00A86B] hover:bg-green-600 text-white font-bold rounded transition-colors"
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
