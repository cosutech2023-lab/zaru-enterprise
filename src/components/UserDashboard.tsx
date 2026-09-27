import React, { useState } from 'react';
import { User, PACKAGES, Package, Withdrawal, Investment } from '../types';
import { updateStoreUser, addInvestmentToUser, calculateUserProgress, addWithdrawalToUser, getDividendCycleStatus, getUserCurrentActiveInvestments } from '../store';
import { uploadProofToSupabaseStorage } from '../lib/supabaseService';
import { Copy, TrendingUp, Calendar, Info, MessageSquare, AlertCircle, CheckCircle, Users, ArrowDownCircle, Clock, XCircle, Building2, ShieldCheck, Wallet, Eye, AlertTriangle, Lock, Unlock } from 'lucide-react';
import ProofViewerModal from './ProofViewerModal';
import UserSupportChat from './UserSupportChat';

interface Props {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

const processUploadedProof = async (file: File): Promise<{ dataUrl: string; name: string; type: string; size: number }> => {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDimension = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve({ dataUrl, name: file.name, type: 'image/jpeg', size: Math.round((dataUrl.length * 3) / 4) });
          } else {
            resolve({ dataUrl: e.target?.result as string, name: file.name, type: file.type, size: file.size });
          }
        };
        img.onerror = () => {
          resolve({ dataUrl: e.target?.result as string, name: file.name, type: file.type, size: file.size });
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({ dataUrl: e.target?.result as string, name: file.name, type: file.type, size: file.size });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
  });
};

export default function UserDashboard({ user, onLogout, onUpdateUser }: Props) {
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [investMessage, setInvestMessage] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);
  const [viewingUserProof, setViewingUserProof] = useState<Investment | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  const [withdrawMessage, setWithdrawMessage] = useState('');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawType, setWithdrawType] = useState<'Plan Dividend' | 'Capital + Dividend' | 'Capital Return' | 'Referral Bonus' | 'General Withdrawal'>('Plan Dividend');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  const currentProgress = calculateUserProgress(user);
  const cycleStatus = getDividendCycleStatus(user);
  const {
    dividendWithdrawalsCount,
    approvedDividendWithdrawalsCount,
    canWithdrawCapital,
    cycle1Done,
    cycle2Done,
    currentCycle,
    cycle1Progress,
    cycle2Progress
  } = cycleStatus;

  const activeInvestments = getUserCurrentActiveInvestments(user);
  const totalActiveCapital = activeInvestments.reduce((sum, i) => sum + i.amount, 0);

  // Dividends must stop adding up after the second withdrawal (2 of 2 completed)
  const isDividendMaxedOut = dividendWithdrawalsCount >= 2;
  const totalEstimatedDividend = isDividendMaxedOut 
    ? 0 
    : activeInvestments.reduce((sum, i) => {
        const pkg = PACKAGES.find(p => p.id === i.packageId);
        const roi = pkg ? pkg.roi : 15;
        return sum + Math.round((i.amount * roi) / 100);
      }, 0);
  const estimatedBonus = (user.referralCount || 0) * 3000;

  const handleOpenWithdrawModal = () => {
    if (!user.canWithdraw) {
      setWithdrawMessage('Withdrawals are temporarily paused for your account. Please contact support.');
      setTimeout(() => setWithdrawMessage(''), 5000);
      return;
    }
    
    // Check if user is eligible to withdraw
    if (!canWithdrawCapital && currentProgress < 100) {
      const cycleName = currentCycle === 1 ? '1st Dividend (14 days)' : '2nd Dividend (another 14 days)';
      setWithdrawMessage(`Commitment progress for ${cycleName} must reach 100% to withdraw. Current cycle progress: ${currentProgress}%.`);
      setTimeout(() => setWithdrawMessage(''), 6000);
      return;
    }

    if (canWithdrawCapital) {
      // After the second withdrawal, capital is unlocked and NO extra amount should add to capital
      // It must be just the amount of the capital user deposited only
      setWithdrawType('Capital Return');
      setWithdrawAmount(totalActiveCapital > 0 ? totalActiveCapital.toString() : '30000');
    } else {
      setWithdrawType('Plan Dividend');
      setWithdrawAmount(totalEstimatedDividend > 0 ? totalEstimatedDividend.toString() : '15000');
    }
    setIsWithdrawModalOpen(true);
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(withdrawAmount);
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid withdrawal amount.');
      return;
    }

    // At the end of 14 days, user can withdraw only dividend (until 2 dividend cycles are completed)
    if (!canWithdrawCapital && withdrawType !== 'Plan Dividend' && withdrawType !== 'Referral Bonus') {
      alert(`At the end of 14 days, you can withdraw only your dividend. Capital withdrawal is unlocked only after you have withdrawn your dividend twice (that is 14 days and another 14 days). Completed dividend withdrawals: ${dividendWithdrawalsCount} of 2.`);
      return;
    }

    // Dividends stop adding up after the second withdrawal
    if (withdrawType === 'Plan Dividend' && isDividendMaxedOut) {
      alert('Dividends have stopped adding up after your second withdrawal. You have already completed both 14-day dividend withdrawals (2 of 2). You can now withdraw your deposited capital only.');
      return;
    }

    if (withdrawType === 'Plan Dividend' && totalEstimatedDividend > 0 && amountNum > totalEstimatedDividend) {
      alert(`At the end of 14 days, you can withdraw only your dividend amount of up to ₦${totalEstimatedDividend.toLocaleString()}. You entered ₦${amountNum.toLocaleString()}.`);
      return;
    }

    // After second withdrawal, no extra amount should add to capital while requesting capital withdrawal
    // It must be just the amount of the capital user deposited only
    if (canWithdrawCapital && (withdrawType === 'Capital Return' || withdrawType === 'Capital + Dividend')) {
      if (amountNum > totalActiveCapital) {
        alert(`No extra amount should add to capital while requesting for capital withdrawal. It must be just the amount of the capital you deposited only: ₦${totalActiveCapital.toLocaleString()}. You entered ₦${amountNum.toLocaleString()}.`);
        return;
      }
    }

    setWithdrawSubmitting(true);
    const res = addWithdrawalToUser(user.id, {
      userId: user.id,
      userName: user.accountName,
      userEmail: user.email,
      amount: amountNum,
      type: withdrawType,
      bankName: user.bankName,
      accountNumber: user.accountNumber,
      accountName: user.accountName,
      status: 'Pending'
    });

    setWithdrawSubmitting(false);
    if (res) {
      onUpdateUser(res.user);
      setIsWithdrawModalOpen(false);
      setWithdrawMessage(`Withdrawal request for ₦${amountNum.toLocaleString()} (${withdrawType}) submitted successfully! Ref: ${res.withdrawal.reference}. Processing takes 24-48 hours.`);
      setTimeout(() => setWithdrawMessage(''), 8000);
    }
  };

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setProofFile(file);
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setProofPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  };

  const handleInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    if (!proofFile) {
      setInvestMessage('Please upload proof of payment');
      return;
    }

    const amount = Number(investmentAmount);
    if (amount < selectedPackage.minInvestment) {
      setInvestMessage(`Minimum investment is ₦${selectedPackage.minInvestment.toLocaleString()}`);
      return;
    }

    setIsSubmittingPlan(true);
    setInvestMessage('Processing payment proof...');

    try {
      const processed = await processUploadedProof(proofFile);
      setInvestMessage('Uploading proof to secure database...');
      
      let finalProofUrl = processed.dataUrl;
      try {
        const remoteUrl = await uploadProofToSupabaseStorage(processed.dataUrl, processed.name);
        if (remoteUrl) {
          finalProofUrl = remoteUrl;
        }
      } catch (storageErr) {
        console.warn('Storage bucket upload fallback:', storageErr);
      }

      const today = new Date();
      const withdrawalDate = new Date();
      withdrawalDate.setDate(today.getDate() + selectedPackage.durationDays);

      const updatedUser = addInvestmentToUser(user.id, {
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        amount: amount,
        date: today.toISOString(),
        withdrawalDate: withdrawalDate.toISOString(),
        proofOfPayment: finalProofUrl,
        proofFileName: processed.name,
        proofFileType: processed.type,
        proofFileSize: processed.size,
        status: 'Pending'
      });

      if (updatedUser) {
        onUpdateUser(updatedUser);
        setInvestMessage('Investment submitted successfully! Awaiting admin verification.');
        setInvestmentAmount('');
        setProofFile(null);
        setProofPreview(null);
        setTimeout(() => {
          setSelectedPackage(null);
          setInvestMessage('');
        }, 2500);
      }
    } catch (err) {
      setInvestMessage('Failed to upload proof. Please select another image.');
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  const handleRequestBonus = () => {
    if ((user.referralCount || 0) === 0) {
      alert("You don't have any active referrals yet.");
      return;
    }
    setWithdrawType('Referral Bonus');
    setWithdrawAmount((estimatedBonus > 0 ? estimatedBonus : 3000).toString());
    setIsWithdrawModalOpen(true);
  };

  const userWithdrawals: Withdrawal[] = user.withdrawals || [];
  const totalApprovedWithdrawals = userWithdrawals.filter(w => w.status === 'Approved').reduce((acc, w) => acc + w.amount, 0);
  const totalPendingWithdrawals = userWithdrawals.filter(w => w.status === 'Pending').reduce((acc, w) => acc + w.amount, 0);

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-red-600 pb-6">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {user.accountName}</h1>
            <p className="text-gray-400 mt-1">Investor Dashboard</p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <a 
              href="#admin-support"
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-700 hover:border-red-600 rounded text-sm text-gray-200 hover:text-white transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-red-500" />
              <span>Message Admin</span>
              {(user.supportMessages || []).filter(m => m.sender === 'admin' && !m.read).length > 0 && (
                <span className="px-1.5 py-0.5 bg-red-600 text-white rounded-full text-xs font-bold animate-pulse">
                  {(user.supportMessages || []).filter(m => m.sender === 'admin' && !m.read).length}
                </span>
              )}
            </a>
            <button 
              onClick={onLogout}
              className="px-6 py-2 border border-red-600 text-red-600 rounded hover:bg-red-600 hover:text-white transition-colors font-medium tracking-wide"
            >
              LOGOUT
            </button>
          </div>
        </div>

        {/* Referral Notification Bar */}
        <div className="bg-[#00A86B]/10 border border-[#00A86B]/30 p-4 rounded flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#00A86B]/20 rounded-full">
               <Users className="w-5 h-5 text-[#00A86B]" />
             </div>
             <div>
               <p className="font-medium text-gray-200">You currently have <span className="font-bold text-[#00A86B] text-lg mx-1">{user.referralCount || 0}</span> active referrals.</p>
               <span className="text-sm font-semibold text-[#00A86B]">10% Bonus per referral</span>
             </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            {user.referralCount === 0 && user.referralBonusApproved ? (
              <span className="text-sm font-bold bg-green-900/50 text-green-400 px-4 py-2 rounded border border-green-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Bonus Approved
              </span>
            ) : user.referralBonusRequested ? (
              <span className="text-sm font-bold bg-yellow-900/50 text-yellow-500 px-4 py-2 rounded border border-yellow-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Request Pending
              </span>
            ) : (
              <button 
                onClick={handleRequestBonus}
                className="w-full md:w-auto px-4 py-2 bg-neutral-900 border border-neutral-700 text-white rounded hover:bg-neutral-800 transition-colors text-sm font-medium"
              >
                Request Bonus Withdrawal
              </button>
            )}
          </div>
        </div>

        {/* Admin Message Alert */}
        {user.adminMessage && (
          <div className="bg-red-900/30 border border-red-600 p-4 rounded flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-500 mb-1">Message from Admin</h3>
              <p className="text-gray-300">{user.adminMessage}</p>
            </div>
          </div>
        )}

        {/* Pending Payment Verification Banner */}
        {(() => {
          const pendingInvs = (user.investments || []).filter(i => i.status === 'Pending');
          if (pendingInvs.length > 0 && activeInvestments.length === 0) {
            return (
              <div className="bg-amber-950/40 border border-amber-500/50 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-300 animate-fadeIn shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400 flex-shrink-0 animate-pulse">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm sm:text-base text-amber-200">
                        Payment Awaiting Admin Confirmation
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/30 text-amber-300 border border-amber-500/40">
                        PROOF SUBMITTED
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                      You submitted a payment of ₦{pendingInvs[0].amount.toLocaleString()} for {pendingInvs[0].packageName}. Your 14-day dividend cycle will start counting immediately once Admin verifies and confirms your payment.
                    </p>
                  </div>
                </div>
                <div className="self-start sm:self-auto text-xs font-mono bg-black/60 px-3 py-1.5 rounded-lg border border-neutral-700 text-gray-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Status: <strong className="text-amber-400">Verifying</strong></span>
                </div>
              </div>
            );
          }
          if (activeInvestments.length > 0) {
            const firstActive = activeInvestments[0];
            const approvedDate = firstActive.approvedAt ? new Date(firstActive.approvedAt) : new Date(firstActive.date);
            const daysSinceApproval = Math.min(14, Math.max(1, Math.ceil((Date.now() - approvedDate.getTime()) / (1000 * 3600 * 24))));
            return (
              <div className="bg-emerald-950/30 border border-emerald-500/40 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-emerald-300 animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400 flex-shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-emerald-200 font-medium">
                    Payment confirmed by Admin on {approvedDate.toLocaleDateString()} • Your 14-day dividend cycle is actively counting (Day {daysSinceApproval} of 14)
                  </p>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-black/50 px-2.5 py-1 rounded border border-emerald-900 self-start sm:self-auto">
                  Maturity: {new Date(firstActive.withdrawalDate).toLocaleDateString()}
                </span>
              </div>
            );
          }
          return null;
        })()}

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Commitment Progress */}
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg col-span-1 md:col-span-2 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp className="w-24 h-24 text-green-500" />
             </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-200">Dividend Commitment Progress</h3>
                <p className="text-xs text-gray-400">
                  {activeInvestments.length === 0 && (user.investments || []).some(i => i.status === 'Pending')
                    ? 'Awaiting Admin payment confirmation • Your 14-day cycle begins counting upon confirmation'
                    : dividendWithdrawalsCount === 0 
                    ? 'Cycle 1 of 2: First 14-day farming growth cycle' 
                    : dividendWithdrawalsCount === 1 
                    ? 'Cycle 2 of 2: Second 14-day farming growth cycle'
                    : 'Both 14-day dividend cycles completed! Capital withdrawal unlocked.'}
                </p>
              </div>
              <div className="text-xs font-mono">
                {canWithdrawCapital ? (
                  <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold inline-flex items-center gap-1">
                    <Unlock className="w-3 h-3 text-purple-400" /> Capital Unlocked
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium inline-flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" /> Capital Locked ({dividendWithdrawalsCount}/2 Dividends)
                  </span>
                )}
              </div>
            </div>

            <div className="w-full bg-neutral-800 rounded-full h-4 mb-2 overflow-hidden border border-neutral-700">
              <div 
                className={`h-4 transition-all duration-1000 ease-in-out ${
                  canWithdrawCapital ? 'bg-purple-500' : 'bg-green-500'
                }`}
                style={{ width: `${currentProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>{dividendWithdrawalsCount === 0 ? 'Cycle 1 (Day 1)' : dividendWithdrawalsCount === 1 ? 'Cycle 2 (Day 15)' : 'Completed'}</span>
              <span className={`font-bold font-mono ${canWithdrawCapital ? 'text-purple-400' : 'text-green-500'}`}>{currentProgress}%</span>
              <span>{dividendWithdrawalsCount === 0 ? 'Cycle 1 Ready (14 Days)' : dividendWithdrawalsCount === 1 ? 'Cycle 2 Ready (28 Days)' : 'Capital Ready'}</span>
            </div>

            {/* 3-Step Milestone Breakdown for 14 Days & Another 14 Days */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-neutral-800 text-xs">
              {/* Cycle 1 */}
              <div className={`p-3 rounded-lg border flex flex-col justify-between transition-colors ${
                cycle1Done 
                  ? 'bg-green-950/30 border-green-800/60 text-green-300' 
                  : currentProgress >= 100 && dividendWithdrawalsCount === 0
                  ? 'bg-[#00A86B]/15 border-[#00A86B]/40 text-emerald-300' 
                  : 'bg-black/40 border-neutral-800 text-gray-400'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold flex items-center gap-1">
                    <span>1st Dividend</span>
                  </span>
                  {cycle1Done ? (
                    <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-mono text-[10px] font-bold">Withdrawn ✓</span>
                  ) : currentProgress >= 100 && dividendWithdrawalsCount === 0 ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">Ready</span>
                  ) : (
                    <span className="text-[10px] text-gray-500 font-mono">14 Days</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">First 14-day dividend harvest</p>
              </div>

              {/* Cycle 2 */}
              <div className={`p-3 rounded-lg border flex flex-col justify-between transition-colors ${
                cycle2Done 
                  ? 'bg-green-950/30 border-green-800/60 text-green-300' 
                  : (dividendWithdrawalsCount === 1 && currentProgress >= 100)
                  ? 'bg-[#00A86B]/15 border-[#00A86B]/40 text-emerald-300'
                  : 'bg-black/40 border-neutral-800 text-gray-400'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold">2nd Dividend</span>
                  {cycle2Done ? (
                    <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-mono text-[10px] font-bold">Withdrawn ✓</span>
                  ) : (dividendWithdrawalsCount === 1 && currentProgress >= 100) ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">Ready</span>
                  ) : (
                    <span className="text-[10px] text-gray-500 font-mono">Another 14 Days</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">Second 14-day dividend harvest</p>
              </div>

              {/* Capital Withdrawal */}
              <div className={`p-3 rounded-lg border flex flex-col justify-between transition-colors ${
                canWithdrawCapital 
                  ? 'bg-purple-950/30 border-purple-800/60 text-purple-300' 
                  : 'bg-black/40 border-neutral-800 text-gray-500'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold">Capital Withdrawal</span>
                  {canWithdrawCapital ? (
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">UNLOCKED ✓</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-gray-400 font-mono text-[10px]">LOCKED ({dividendWithdrawalsCount}/2)</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  {canWithdrawCapital ? 'Full capital payout accessible' : 'Unlocked after 2 dividend payouts'}
                </p>
              </div>
            </div>

            {/* 14-Day Cycle Policy Clarification */}
            {canWithdrawCapital ? (
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-lg p-3 mt-4 flex items-start gap-2.5 text-xs text-purple-200">
                <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-purple-100">Capital Return Unlocked:</span> You have completed both 14-day dividend cycles (2 of 2). Dividends have stopped adding up. You can now withdraw <strong className="text-white">strictly your deposited capital only (₦{totalActiveCapital.toLocaleString()})</strong> with no extra additions.
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3 mt-4 flex items-start gap-2.5 text-xs text-emerald-300">
                <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-200">14-Day Payout Rule:</span> At the end of 14 days, you can withdraw <strong className="text-white">only your dividend</strong>. Capital remains active in the farm and can only be withdrawn after completing 2 dividend cycles (14 days and another 14 days).
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-neutral-800 pt-6">
              <button
                onClick={handleOpenWithdrawModal}
                className={`px-6 py-2.5 text-white font-bold rounded transition-colors flex items-center gap-2 shadow-md cursor-pointer text-sm ${
                  canWithdrawCapital ? 'bg-purple-600 hover:bg-purple-700' : 'bg-[#00A86B] hover:bg-green-600'
                }`}
              >
                {canWithdrawCapital ? (
                  <>
                    <Unlock className="w-4 h-4" /> WITHDRAW DEPOSITED CAPITAL (₦{totalActiveCapital.toLocaleString()})
                  </>
                ) : currentProgress >= 100 ? (
                  <>
                    <ArrowDownCircle className="w-4 h-4" /> WITHDRAW 14-DAY DIVIDEND (₦{totalEstimatedDividend.toLocaleString()})
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" /> REQUEST WITHDRAWAL
                  </>
                )}
              </button>
              
              {withdrawMessage && (
                <div className={`mt-3 flex items-center gap-2 text-sm p-2 rounded ${
                  withdrawMessage.includes('paused') || withdrawMessage.includes('must be 100%') 
                    ? 'text-red-500 bg-red-500/10' 
                    : 'text-green-500 bg-green-500/10'
                }`}>
                  {withdrawMessage.includes('paused') || withdrawMessage.includes('must be 100%') ? (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  {withdrawMessage}
                </div>
              )}
            </div>
            
            {!user.canWithdraw && !withdrawMessage && (
              <div className="mt-4 flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-2 rounded">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Withdrawals are temporarily paused for your account. Please contact support.
              </div>
            )}
          </div>

          {/* Referral Info */}
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg flex flex-col justify-center">
            <h3 className="text-lg font-semibold mb-2 text-gray-200">Referral Program</h3>
            <p className="text-sm text-gray-400 mb-4">Invite friends and earn 10% bonus on their first plan.</p>
            <div className="bg-black border border-neutral-700 p-3 rounded flex items-center justify-between">
              <span className="font-mono text-green-400 tracking-wider">{user.referralCode}</span>
              <button 
                onClick={handleCopyReferral}
                className="text-gray-400 hover:text-white transition-colors p-1 flex items-center gap-1 text-xs"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4" />
                {copiedReferral ? <span className="text-green-400 font-medium">Copied!</span> : null}
              </button>
            </div>
          </div>
        </div>

        {/* Plan History */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-neutral-800">
            <h3 className="text-lg font-semibold text-gray-200">Plan History</h3>
          </div>
          <div className="overflow-x-auto">
            {user.investments.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-950 text-gray-400 uppercase">
                  <tr>
                    <th className="px-6 py-4 font-medium">Package</th>
                    <th className="px-6 py-4 font-medium">Amount (₦)</th>
                    <th className="px-6 py-4 font-medium">Start Date</th>
                    <th className="px-6 py-4 font-medium">Maturity Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Proof of Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {user.investments.map(inv => (
                    <tr key={inv.id} className="hover:bg-neutral-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium">{inv.packageName}</td>
                      <td className="px-6 py-4 text-green-400 font-mono">{inv.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-400">{new Date(inv.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-gray-400">{new Date(inv.withdrawalDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            inv.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                            inv.status === 'Completed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-green-500/10 text-green-500 border-green-500/20'
                          }`}>
                            {inv.status === 'Pending' ? <Clock className="w-3 h-3 animate-pulse" /> : <CheckCircle className="w-3 h-3" />}
                            {inv.status === 'Pending' ? 'Pending Admin Confirmation' : inv.status}
                          </span>
                          {inv.status === 'Pending' && (
                            <p className="text-[10px] text-amber-400/90 mt-1">
                              Dividend countdown starts upon confirmation
                            </p>
                          )}
                          {inv.status === 'Active' && inv.approvedAt && (
                            <p className="text-[10px] text-emerald-400 mt-1 font-mono">
                              Confirmed: {new Date(inv.approvedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {inv.proofOfPayment ? (
                          <button
                            type="button"
                            onClick={() => setViewingUserProof(inv)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-xs font-medium rounded border border-neutral-700 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            <span>View Receipt</span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500 italic">None attached</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Info className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>You have no active plans yet.</p>
                <p className="text-sm mt-1">Select a package below to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Withdrawal & Transaction History */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-[#00A86B]" />
                <h3 className="text-lg font-semibold text-gray-200">Withdrawal & Transaction History</h3>
              </div>
              <p className="text-xs text-gray-400 mt-1">Live tracking of your dividend payouts, capital returns, and referral bonus disbursements</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="bg-black/50 px-3 py-1.5 rounded border border-neutral-800">
                <span className="text-gray-400 mr-2">Paid Out:</span>
                <span className="text-green-400 font-bold font-mono">₦{totalApprovedWithdrawals.toLocaleString()}</span>
              </div>
              <div className="bg-black/50 px-3 py-1.5 rounded border border-neutral-800">
                <span className="text-gray-400 mr-2">Pending:</span>
                <span className="text-yellow-400 font-bold font-mono">₦{totalPendingWithdrawals.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {userWithdrawals.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-950 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Ref Code</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Amount (₦)</th>
                    <th className="px-6 py-4 font-medium">Destination Account</th>
                    <th className="px-6 py-4 font-medium">Request Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {userWithdrawals.map(wd => (
                    <tr key={wd.id} className="hover:bg-neutral-800/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-300 font-semibold">{wd.reference}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded text-xs bg-neutral-800 text-gray-200 border border-neutral-700">
                          {wd.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-green-400 font-mono font-bold">₦{wd.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-300 font-medium">{wd.bankName}</div>
                        <div className="text-xs text-gray-500 font-mono">{wd.accountNumber} • {wd.accountName}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(wd.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border w-max ${
                            wd.status === 'Approved'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : wd.status === 'Rejected'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          }`}>
                            {wd.status === 'Approved' ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : wd.status === 'Rejected' ? (
                              <XCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {wd.status === 'Approved' ? 'Approved & Paid' : wd.status === 'Rejected' ? 'Rejected' : 'Pending Review'}
                          </span>
                          {wd.adminNote && (
                            <span className="text-[11px] text-gray-400 italic">Note: {wd.adminNote}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Wallet className="w-8 h-8 mx-auto mb-3 opacity-40 text-[#00A86B]" />
                <p className="font-medium text-gray-400">No withdrawal records yet</p>
                <p className="text-xs mt-1 text-gray-500">
                  When you request a dividend or bonus payout, your transaction details and payment approvals will be logged here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* User <-> Admin Communication Channel */}
        <UserSupportChat user={user} onUpdateUser={onUpdateUser} />

        {/* New Investments */}
        <div>
          <h3 className="text-xl font-bold mb-6 border-b border-red-600 pb-2 inline-block">Available Packages</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PACKAGES.map(pkg => (
              <div key={pkg.id} className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden group hover:border-green-500/50 transition-colors">
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={pkg.image} 
                    alt={pkg.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  <h4 className="absolute bottom-4 left-4 text-xl font-bold">{pkg.name}</h4>
                </div>
                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Min. Amount</span>
                      <span className="font-bold">₦{pkg.minInvestment.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">ROI</span>
                      <span className="font-bold text-green-500">{pkg.roi}%</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Duration</span>
                      <span className="font-bold">{pkg.durationDays} Days</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedPackage(pkg)}
                    className="w-full py-3 bg-[#00A86B] text-white font-bold rounded hover:bg-green-600 transition-colors tracking-wide"
                  >
                    PURCHASE PLAN
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Investment / Payment Modal */}
        {selectedPackage && (
          <div 
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedPackage(null);
                setInvestMessage('');
              }
            }}
          >
            <div 
              className="bg-neutral-900 border border-neutral-700 p-6 sm:p-8 rounded-xl max-w-md w-full relative max-h-[92vh] sm:max-h-[88vh] overflow-y-auto my-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => {
                  setSelectedPackage(null);
                  setInvestMessage('');
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                ✕
              </button>
              <h3 className="text-2xl font-bold mb-2">Buy {selectedPackage.name}</h3>
              <p className="text-gray-400 mb-6 text-sm">Duration: {selectedPackage.durationDays} days • ROI: {selectedPackage.roi}%</p>
              
              <form onSubmit={handleInvest} className="space-y-4">
                
                <div className="bg-neutral-950 border border-neutral-800 p-4 rounded text-sm text-gray-300 space-y-2 mb-4">
                  <p className="text-gray-400 font-semibold mb-2">Please make payment to:</p>
                  <div className="flex justify-between items-center">
                    <span>Bank Name:</span> <span className="font-mono text-white">Moniepoint</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Account No:</span> 
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white text-lg tracking-wider font-semibold">6394899106</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('6394899106');
                          setCopiedAccount(true);
                          setTimeout(() => setCopiedAccount(false), 2000);
                        }}
                        className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-gray-300 flex items-center gap-1 border border-neutral-700 transition-colors"
                        title="Copy Account Number"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedAccount ? <span className="text-green-400 font-medium">Copied!</span> : <span>Copy</span>}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Account Name:</span> <span className="font-mono text-white">Zaru Enterprise Farm</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Amount Paid (₦)</label>
                  <input 
                    type="number" 
                    required
                    min={selectedPackage.minInvestment}
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-[#00A86B]"
                    placeholder={`Min: ${selectedPackage.minInvestment.toLocaleString()}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Upload Proof of Payment</label>
                  <input 
                    type="file" 
                    required
                    accept="image/*,.pdf"
                    onChange={handleProofChange}
                    className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-[#00A86B] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#00A86B] file:text-white hover:file:bg-green-600 cursor-pointer"
                  />
                  {proofFile ? (
                    <div className="mt-2.5 p-2.5 bg-neutral-950 border border-neutral-800 rounded flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {proofPreview ? (
                          <img src={proofPreview} alt="Receipt preview" className="w-12 h-12 object-cover rounded border border-neutral-700 flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-mono text-gray-300 flex-shrink-0">
                            FILE
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-green-400 font-medium truncate">{proofFile.name}</p>
                          <p className="text-[11px] text-gray-400">{(proofFile.size / 1024).toFixed(0)} KB • Ready to submit</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProofFile(null);
                          setProofPreview(null);
                        }}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2">Accepted formats: JPG, PNG, PDF receipts</p>
                  )}
                </div>
                
                {investMessage && (
                  <p className={`text-sm ${investMessage.includes('successful') ? 'text-green-500' : 'text-red-500'}`}>
                    {investMessage}
                  </p>
                )}

                <button 
                  type="submit"
                  disabled={isSubmittingPlan}
                  className="w-full py-3 bg-[#00A86B] disabled:opacity-50 text-white font-bold rounded hover:bg-green-600 transition-colors mt-4 shadow-lg cursor-pointer"
                >
                  {isSubmittingPlan ? 'UPLOADING PROOF...' : 'CONFIRM PLAN'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Request Withdrawal Modal */}
        {isWithdrawModalOpen && (
          <div 
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 overflow-y-auto p-3 sm:p-6 flex items-start sm:items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsWithdrawModalOpen(false);
            }}
          >
            <div 
              className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-lg w-full relative shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] my-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-neutral-800 bg-neutral-900 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#00A86B]/20 rounded-xl text-[#00A86B] border border-[#00A86B]/30">
                    <ArrowDownCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Request Payout</h3>
                    <p className="text-gray-400 text-xs">Direct transfer to your verified Nigerian bank account</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  title="Close modal"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <form id="withdraw-modal-form" onSubmit={handleWithdrawSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Withdrawal Type</label>
                    <select
                      value={withdrawType}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setWithdrawType(val);
                        if (val === 'Plan Dividend') {
                          setWithdrawAmount(totalEstimatedDividend > 0 ? totalEstimatedDividend.toString() : '15000');
                        } else if (val === 'Capital Return' || val === 'Capital + Dividend') {
                          // No extra amount should add to capital while requesting for capital withdrawal
                          // It must be just the amount of the capital user deposited only
                          setWithdrawAmount(totalActiveCapital > 0 ? totalActiveCapital.toString() : '30000');
                        } else if (val === 'Referral Bonus') {
                          setWithdrawAmount(estimatedBonus > 0 ? estimatedBonus.toString() : '3000');
                        }
                      }}
                      className="w-full bg-black border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#00A86B]"
                    >
                      <option value="Plan Dividend" disabled={isDividendMaxedOut}>
                        {isDividendMaxedOut 
                          ? 'Plan Dividend [Stopped: 2/2 Dividends Already Withdrawn]' 
                          : 'Plan Dividend (Matured 14-Day Yield) - Available'}
                      </option>
                      <option value="Capital Return" disabled={!canWithdrawCapital}>
                        Capital Return {!canWithdrawCapital ? '[Locked: At 14 days, you can withdraw only dividend]' : `[Unlocked: Deposited Capital Only (₦${totalActiveCapital.toLocaleString()})]`}
                      </option>
                      <option value="Capital + Dividend" disabled={!canWithdrawCapital || isDividendMaxedOut}>
                        Capital + Dividend {!canWithdrawCapital ? '[Locked: At 14 days, you can withdraw only dividend]' : isDividendMaxedOut ? '[Both Dividends Already Withdrawn - Deposited Capital Only]' : '[Unlocked]'}
                      </option>
                      <option value="Referral Bonus">Referral Bonus (10% per Referral)</option>
                      <option value="General Withdrawal" disabled={!canWithdrawCapital}>
                        General Withdrawal {!canWithdrawCapital ? '[Locked: Only dividend allowed at 14 days]' : ''}
                      </option>
                    </select>
                  </div>

                  {/* 14-Day Dividend Notice when Plan Dividend is Selected */}
                  {withdrawType === 'Plan Dividend' && !isDividendMaxedOut && (
                    <div className="bg-emerald-950/40 border border-emerald-500/40 p-3.5 rounded-xl text-xs text-emerald-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400" /> 14-Day Matured Dividend Payout
                        </span>
                        <span className="text-emerald-400 font-mono font-bold text-sm">₦{totalEstimatedDividend.toLocaleString()}</span>
                      </div>
                      <p className="text-gray-300 text-[11px] leading-relaxed">
                        At the end of 14 days, you are eligible to withdraw <strong>only your dividend</strong>. Your initial capital continues into the farm cycle and can only be withdrawn after completing 2 dividend cycles.
                      </p>
                    </div>
                  )}

                  {/* Notice when dividends are maxed out */}
                  {isDividendMaxedOut && withdrawType === 'Plan Dividend' && (
                    <div className="bg-amber-950/40 border border-amber-500/40 p-3.5 rounded-xl text-xs text-amber-200 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span>Dividends Stopped (2 of 2 Withdrawn)</span>
                      </div>
                      <p className="text-gray-300 text-[11px] leading-relaxed">
                        You have already completed both of your 14-day dividend withdrawals (2 of 2). Dividends have stopped adding up. Please select <strong>Capital Return</strong> to withdraw your deposited capital.
                      </p>
                    </div>
                  )}

                  {/* Capital Policy Guidance Notice */}
                  {(withdrawType === 'Capital + Dividend' || withdrawType === 'Capital Return' || withdrawType === 'General Withdrawal') && (
                    !canWithdrawCapital ? (
                      <div className="bg-amber-950/40 border border-amber-500/40 p-4 rounded-xl text-xs text-amber-200 space-y-2.5">
                        <div className="flex items-center gap-2 font-bold text-amber-300">
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>14-Day Policy: Dividend Only</span>
                        </div>
                        <p className="text-gray-300 leading-relaxed">
                          At the end of 14 days, you can withdraw <strong>only your dividend</strong>. Capital withdrawal requires having withdrawn your dividend twice (that is 14 days and another 14 days).
                        </p>
                        <div className="bg-black/60 p-3 rounded-lg border border-neutral-800 space-y-2 font-mono text-[11px]">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">1st Dividend (14 Days):</span>
                            <span className={`px-2 py-0.5 rounded font-bold ${cycle1Done ? 'bg-green-500/20 text-green-400' : 'bg-neutral-800 text-gray-400'}`}>
                              {cycle1Done ? 'Withdrawn ✓' : 'Pending Cycle 1'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">2nd Dividend (Another 14 Days):</span>
                            <span className={`px-2 py-0.5 rounded font-bold ${cycle2Done ? 'bg-green-500/20 text-green-400' : 'bg-neutral-800 text-gray-400'}`}>
                              {cycle2Done ? 'Withdrawn ✓' : 'Pending Cycle 2'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                            <span className="text-gray-300 font-semibold">Capital Return Status:</span>
                            <span className="text-amber-400 font-bold">LOCKED ({dividendWithdrawalsCount} of 2 Dividends Withdrawn)</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-amber-400/90 italic">
                          Please select "Plan Dividend" above to withdraw your 14-day dividend.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-purple-950/40 border border-purple-500/40 p-4 rounded-xl text-xs text-purple-200 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-purple-300">
                          <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          <span>Capital Return Unlocked (Exact Deposited Capital Only)</span>
                        </div>
                        <p className="text-gray-300 leading-relaxed">
                          You have successfully completed both 14-day dividend cycles ({dividendWithdrawalsCount} of 2 dividends withdrawn). Dividends have stopped adding up. You can now withdraw <strong>just the exact amount of capital you deposited only: ₦{totalActiveCapital.toLocaleString()}</strong>. No extra amount will be added.
                        </p>
                      </div>
                    )
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-300">Amount (₦)</label>
                      <span className="text-xs text-gray-400 font-mono">
                        {withdrawType === 'Plan Dividend' && `Max 14-Day Dividend: ₦${totalEstimatedDividend.toLocaleString()}`}
                        {(withdrawType === 'Capital Return' || withdrawType === 'Capital + Dividend') && `Deposited Capital: ₦${totalActiveCapital.toLocaleString()} (Exact Capital Deposited Only)`}
                        {withdrawType === 'Referral Bonus' && `Eligible Bonus: ₦${estimatedBonus.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        required
                        min="1000"
                        max={
                          withdrawType === 'Plan Dividend'
                            ? (totalEstimatedDividend > 0 ? totalEstimatedDividend : 0)
                            : (withdrawType === 'Capital Return' || withdrawType === 'Capital + Dividend')
                            ? totalActiveCapital
                            : undefined
                        }
                        step="500"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className={`w-full bg-black border rounded-lg p-3 pr-28 text-white focus:outline-none font-mono font-semibold ${
                          (withdrawType === 'Plan Dividend' && totalEstimatedDividend > 0 && Number(withdrawAmount) > totalEstimatedDividend) ||
                          ((withdrawType === 'Capital Return' || withdrawType === 'Capital + Dividend') && Number(withdrawAmount) > totalActiveCapital)
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-neutral-700 focus:border-[#00A86B]'
                        }`}
                        placeholder="Enter amount in ₦"
                      />
                      {withdrawType === 'Plan Dividend' && totalEstimatedDividend > 0 && (
                        <button
                          type="button"
                          onClick={() => setWithdrawAmount(totalEstimatedDividend.toString())}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 text-[11px] font-mono font-bold rounded transition-colors"
                        >
                          Max ₦{totalEstimatedDividend.toLocaleString()}
                        </button>
                      )}
                      {(withdrawType === 'Capital Return' || withdrawType === 'Capital + Dividend') && totalActiveCapital > 0 && (
                        <button
                          type="button"
                          onClick={() => setWithdrawAmount(totalActiveCapital.toString())}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 text-[11px] font-mono font-bold rounded transition-colors"
                        >
                          Capital ₦{totalActiveCapital.toLocaleString()}
                        </button>
                      )}
                    </div>
                    {withdrawType === 'Plan Dividend' && totalEstimatedDividend > 0 && Number(withdrawAmount) > totalEstimatedDividend && (
                      <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Amount exceeds your 14-day dividend of ₦${totalEstimatedDividend.toLocaleString()}. You can withdraw only dividend at the end of 14 days.
                      </p>
                    )}
                    {withdrawType === 'Plan Dividend' && isDividendMaxedOut && (
                      <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Dividends have stopped adding up after your second withdrawal. Please select Capital Return to withdraw your deposited capital.
                      </p>
                    )}
                    {(withdrawType === 'Capital Return' || withdrawType === 'Capital + Dividend') && Number(withdrawAmount) > totalActiveCapital && (
                      <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Amount exceeds your deposited capital of ₦${totalActiveCapital.toLocaleString()}. No extra amount can be added to your capital withdrawal.
                      </p>
                    )}
                  </div>

                  {/* Verified Payout Destination */}
                  <div className="bg-black/60 border border-neutral-800 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#00A86B] uppercase tracking-wider">
                      <Building2 className="w-4 h-4" /> Destination Bank Account
                    </div>
                    <div className="flex justify-between text-xs text-gray-300">
                      <span className="text-gray-500">Bank Name:</span>
                      <span className="font-medium text-white">{user.bankName}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-300">
                      <span className="text-gray-500">Account Number:</span>
                      <span className="font-mono text-white text-sm font-bold">{user.accountNumber}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-300">
                      <span className="text-gray-500">Account Name:</span>
                      <span className="font-medium text-white">{user.accountName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400 bg-neutral-800/40 p-3 rounded-lg border border-neutral-800">
                    <ShieldCheck className="w-4 h-4 text-[#00A86B] flex-shrink-0" />
                    <span>Withdrawal requests are processed within 24 to 48 hours directly to your registered bank account.</span>
                  </div>
                </form>
              </div>

              {/* Modal Footer - Fixed at bottom */}
              <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/95 flex gap-3 flex-shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-3 bg-neutral-800 text-white font-medium rounded-lg hover:bg-neutral-700 transition-colors text-sm"
                >
                  Cancel
                </button>
                {(() => {
                  const isDividendOverMax = withdrawType === 'Plan Dividend' && totalEstimatedDividend > 0 && Number(withdrawAmount) > totalEstimatedDividend;
                  const isCapitalOverMax = (withdrawType === 'Capital Return' || withdrawType === 'Capital + Dividend') && Number(withdrawAmount) > totalActiveCapital;
                  const isDividendBlocked = withdrawType === 'Plan Dividend' && isDividendMaxedOut;
                  const isCapitalBlocked = !canWithdrawCapital && withdrawType !== 'Plan Dividend' && withdrawType !== 'Referral Bonus';
                  const isSubmitDisabled = withdrawSubmitting || isDividendOverMax || isCapitalOverMax || isDividendBlocked || isCapitalBlocked;

                  return (
                    <button 
                      type="submit"
                      form="withdraw-modal-form"
                      disabled={isSubmitDisabled}
                      className={`flex-1 py-3 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-lg ${
                        isSubmitDisabled
                          ? 'bg-neutral-800 text-gray-500 cursor-not-allowed border border-neutral-700'
                          : withdrawType === 'Capital + Dividend' || withdrawType === 'Capital Return'
                          ? 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
                          : 'bg-[#00A86B] hover:bg-green-600 cursor-pointer'
                      }`}
                    >
                      {isDividendBlocked
                        ? 'Dividends Stopped (2/2 Withdrawn)'
                        : isDividendOverMax
                        ? `Exceeds 14-Day Dividend (Max: ₦${totalEstimatedDividend.toLocaleString()})`
                        : isCapitalOverMax
                        ? `Exceeds Deposited Capital (Max: ₦${totalActiveCapital.toLocaleString()})`
                        : isCapitalBlocked
                        ? 'Only Dividend Allowed at 14 Days'
                        : withdrawSubmitting 
                        ? 'Submitting...' 
                        : withdrawType === 'Plan Dividend'
                        ? `Confirm Dividend Payout (₦${Number(withdrawAmount || 0).toLocaleString()})`
                        : withdrawType === 'Capital Return' || withdrawType === 'Capital + Dividend'
                        ? `Confirm Capital Return (₦${Number(withdrawAmount || 0).toLocaleString()})`
                        : 'Confirm Withdrawal'}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* User Proof Viewer Modal */}
        {viewingUserProof && (
          <ProofViewerModal
            investment={viewingUserProof}
            user={user}
            onClose={() => setViewingUserProof(null)}
          />
        )}

      </div>
    </div>
  );
}
