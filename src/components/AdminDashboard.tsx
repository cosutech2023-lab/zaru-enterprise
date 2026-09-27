import React, { useState, useEffect } from 'react';
import { User, Withdrawal, Investment } from '../types';
import { getStoreUsers, updateStoreUser, deleteStoreUser, calculateUserProgress, approveUserInvestment, updateWithdrawalStatus, fastForwardInvestmentDays, getDividendCycleStatus, setUserCommitmentProgress, syncStoreWithSupabase } from '../store';
import { Users, ShieldAlert, CheckCircle, XCircle, Search, Edit2, Trash2, AlertCircle, Settings, ArrowDownCircle, Clock, Copy, Check, Building2, Wallet, DollarSign, Filter, RefreshCw, FileText, Eye, Lock, Unlock, FastForward, TrendingUp, Sliders, RotateCcw, MessageSquare, ArrowRight, Database } from 'lucide-react';
import SiteSettingsEditor from './SiteSettingsEditor';
import ProofViewerModal from './ProofViewerModal';
import AdminSupportChat from './AdminSupportChat';
import AdminNotificationBell from './AdminNotificationBell';

interface Props {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<'users' | 'investments' | 'withdrawals' | 'settings' | 'messages'>('users');
  const [chatSelectedUserId, setChatSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [messageForm, setMessageForm] = useState('');

  const [progressEditingUser, setProgressEditingUser] = useState<User | null>(null);
  const [customProgressVal, setCustomProgressVal] = useState<number>(0);

  const [withdrawalSearchTerm, setWithdrawalSearchTerm] = useState('');
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('ALL');
  const [withdrawalTypeFilter, setWithdrawalTypeFilter] = useState<string>('ALL');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const [selectedProof, setSelectedProof] = useState<{ investment: Investment; user: User } | null>(null);
  const [investmentSearch, setInvestmentSearch] = useState('');
  const [investmentStatusFilter, setInvestmentStatusFilter] = useState<'ALL' | 'Pending' | 'Active' | 'Completed'>('ALL');

  useEffect(() => {
    setUsers(getStoreUsers());

    const handleSynced = () => {
      setUsers(getStoreUsers());
    };
    window.addEventListener('saposa_store_synced', handleSynced);
    return () => {
      window.removeEventListener('saposa_store_synced', handleSynced);
    };
  }, []);

  const handleUpdateUser = () => {
    if (!editingUser) return;
    
    const updatedUser = {
      ...editingUser,
      adminMessage: messageForm
    };
    
    updateStoreUser(updatedUser);
    setUsers(getStoreUsers());
    setEditingUser(null);
  };

  const handleApprovePlanGlobal = (userId: string, investmentId: string) => {
    const updatedUser = approveUserInvestment(userId, investmentId);
    if (updatedUser) {
      setUsers(getStoreUsers());
      if (editingUser && editingUser.id === userId) {
        setEditingUser(updatedUser);
      }
      if (selectedProof && selectedProof.investment.id === investmentId) {
        setSelectedProof({
          user: updatedUser,
          investment: { ...selectedProof.investment, status: 'Active' }
        });
      }
    }
  };

  const handleApprovePlan = (investmentId: string) => {
    if (!editingUser) return;
    handleApprovePlanGlobal(editingUser.id, investmentId);
  };

  const handleFastForwardPlan = (investmentId: string, daysAgo: number) => {
    if (!editingUser) return;
    const updated = fastForwardInvestmentDays(editingUser.id, investmentId, daysAgo);
    if (updated) {
      setEditingUser(updated);
      setUsers(getStoreUsers());
    }
  };

  const handleSetUserProgress = (userId: string, progress: number | null) => {
    const updated = setUserCommitmentProgress(userId, progress);
    if (updated) {
      setUsers(getStoreUsers());
      if (editingUser && editingUser.id === userId) {
        setEditingUser(updated);
      }
      if (progressEditingUser && progressEditingUser.id === userId) {
        setProgressEditingUser(updated);
        setCustomProgressVal(progress ?? calculateUserProgress(updated));
      }
    }
  };

  const toggleWithdrawal = (user: User) => {
    const updatedUser = { ...user, canWithdraw: !user.canWithdraw };
    updateStoreUser(updatedUser);
    setUsers(getStoreUsers());
  };

  const handleUpdateWithdrawalStatus = (userId: string, withdrawalId: string, status: 'Pending' | 'Approved' | 'Rejected', note?: string) => {
    const updatedUser = updateWithdrawalStatus(userId, withdrawalId, status, note);
    if (updatedUser) {
      setUsers(getStoreUsers());
      if (editingUser && editingUser.id === userId) {
        setEditingUser(updatedUser);
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(id);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const toggleReferralBonus = (user: User) => {
    // When approving/toggling, also clear the requested flag so it's no longer pending
    const isApproving = !user.referralBonusApproved;
    const updatedUser = { 
      ...user, 
      referralBonusApproved: isApproving,
      referralBonusRequested: false,
      ...(isApproving ? { referralCount: 0 } : {})
    };
    updateStoreUser(updatedUser);
    setUsers(getStoreUsers());
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    // Simulate network delay for UI responsiveness
    await new Promise(resolve => setTimeout(resolve, 800));
    
    deleteStoreUser(userToDelete.id);
    setUsers(getStoreUsers());
    setIsDeleting(false);
    setUserToDelete(null);
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.accountNumber.includes(searchTerm) ||
    u.phone.includes(searchTerm)
  );

  const allWithdrawals = users.flatMap(u => 
    (u.withdrawals || []).map(w => ({
      ...w,
      userId: u.id,
      userName: w.userName || u.accountName,
      userEmail: w.userEmail || u.email,
      phone: u.phone,
      bankName: w.bankName || u.bankName,
      accountNumber: w.accountNumber || u.accountNumber,
      accountName: w.accountName || u.accountName
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pendingWithdrawalsCount = allWithdrawals.filter(w => w.status === 'Pending').length;
  const totalWithdrawnAmount = allWithdrawals.filter(w => w.status === 'Approved').reduce((sum, w) => sum + w.amount, 0);
  const totalPendingAmount = allWithdrawals.filter(w => w.status === 'Pending').reduce((sum, w) => sum + w.amount, 0);

  const allInvestments = users.flatMap(u => 
    (u.investments || []).map(inv => ({
      ...inv,
      user: u
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pendingInvestmentsCount = allInvestments.filter(i => i.status === 'Pending').length;
  const totalInvestedAmount = allInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalUnreadMessages = users.reduce((acc, u) => {
    return acc + (u.supportMessages || []).filter(m => m.sender === 'user' && !m.read).length;
  }, 0);

  const filteredInvestments = allInvestments.filter(item => {
    const matchesStatus = investmentStatusFilter === 'ALL' || item.status === investmentStatusFilter;
    const search = investmentSearch.toLowerCase();
    const matchesSearch = !investmentSearch ||
      item.user.accountName.toLowerCase().includes(search) ||
      item.user.email.toLowerCase().includes(search) ||
      item.packageName.toLowerCase().includes(search) ||
      (item.proofFileName && item.proofFileName.toLowerCase().includes(search)) ||
      item.amount.toString().includes(search);
    return matchesStatus && matchesSearch;
  });

  const filteredWithdrawals = allWithdrawals.filter(w => {
    const matchesSearch = 
      w.reference.toLowerCase().includes(withdrawalSearchTerm.toLowerCase()) ||
      w.userName.toLowerCase().includes(withdrawalSearchTerm.toLowerCase()) ||
      w.userEmail.toLowerCase().includes(withdrawalSearchTerm.toLowerCase()) ||
      w.accountNumber.includes(withdrawalSearchTerm) ||
      w.bankName.toLowerCase().includes(withdrawalSearchTerm.toLowerCase());
    
    const matchesStatus = withdrawalStatusFilter === 'ALL' || w.status === withdrawalStatusFilter;
    const matchesType = withdrawalTypeFilter === 'ALL' || w.type === withdrawalTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleNavigateFromNotification = (tab: 'users' | 'investments' | 'withdrawals' | 'settings' | 'messages', extraData?: any) => {
    setActiveTab(tab);
    if (tab === 'investments') {
      if (extraData?.investorName) {
        setInvestmentSearch(extraData.investorName);
      }
      setInvestmentStatusFilter('ALL');
    }
    if (tab === 'withdrawals') {
      if (extraData?.investorName) {
        setWithdrawalSearchTerm(extraData.investorName);
      }
      setWithdrawalStatusFilter('ALL');
    }
    if (tab === 'messages' && extraData?.userId) {
      setChatSelectedUserId(extraData.userId);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-red-600 pb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShieldAlert className="text-red-600 w-8 h-8" />
              Admin Portal
            </h1>
            <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
              <p className="text-gray-400 text-sm">Manage users, dividends, and withdrawals.</p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950/80 border border-emerald-500/50 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Database className="w-3 h-3 text-emerald-400" />
                <span>Supabase Live</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={async () => {
                await syncStoreWithSupabase();
                setUsers(getStoreUsers());
              }}
              className="px-3 py-2 bg-neutral-900 border border-neutral-700 hover:border-neutral-500 rounded-xl text-xs font-medium text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Pull latest live records from Supabase PostgreSQL database"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Sync DB</span>
            </button>
            <AdminNotificationBell onNavigateTab={handleNavigateFromNotification} />
            <button 
              onClick={onLogout}
              className="px-6 py-2 border border-red-600 text-red-600 rounded hover:bg-red-600 hover:text-white transition-colors font-medium tracking-wide cursor-pointer"
            >
              LOGOUT ADMIN
            </button>
          </div>
        </div>

        {/* Live Payment Alert Banner */}
        {pendingInvestmentsCount > 0 && activeTab !== 'investments' && (
          <div className="bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-amber-950/80 border border-amber-500/60 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-400 text-black rounded-lg font-bold flex-shrink-0 animate-bounce">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-amber-300 text-sm sm:text-base">
                    {pendingInvestmentsCount === 1 ? 'New Plan Payment Received!' : `${pendingInvestmentsCount} New Plan Payments Received!`}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-black animate-pulse">
                    VERIFICATION PENDING
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-0.5">
                  An investor has completed payment and submitted their transfer receipt. Review and approve the payment to activate the plan.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab('investments');
                setInvestmentStatusFilter('Pending');
              }}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-md self-start sm:self-auto cursor-pointer"
            >
              <span>Review Payment Proof</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b border-neutral-800 pb-2 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 font-bold rounded transition-colors whitespace-nowrap ${activeTab === 'users' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-neutral-800'}`}
          >
            <Users size={18} /> USER MANAGEMENT
          </button>
          <button 
            onClick={() => setActiveTab('investments')}
            className={`flex items-center gap-2 px-4 py-2 font-bold rounded transition-colors whitespace-nowrap ${activeTab === 'investments' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-neutral-800'}`}
          >
            <FileText size={18} /> INVESTMENTS & PAYMENT PROOFS
            {pendingInvestmentsCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-black animate-pulse">
                {pendingInvestmentsCount} PENDING
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('withdrawals')}
            className={`flex items-center gap-2 px-4 py-2 font-bold rounded transition-colors whitespace-nowrap ${activeTab === 'withdrawals' ? 'bg-[#00A86B] text-white' : 'text-gray-400 hover:text-white hover:bg-neutral-800'}`}
          >
            <ArrowDownCircle size={18} /> WITHDRAWALS & TRANSACTIONS
            {pendingWithdrawalsCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-black animate-pulse">
                {pendingWithdrawalsCount} PENDING
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-4 py-2 font-bold rounded transition-colors whitespace-nowrap ${activeTab === 'messages' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white hover:bg-neutral-800'}`}
          >
            <MessageSquare size={18} /> USER MESSAGES & INQUIRIES
            {totalUnreadMessages > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
                {totalUnreadMessages} NEW
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 font-bold rounded transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-neutral-800'}`}
          >
            <Settings size={18} /> SITE SETTINGS
          </button>
        </div>

        {activeTab === 'users' ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm font-medium mb-1">Total Users</div>
            <div className="text-3xl font-bold">{users.length}</div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm font-medium mb-1">Total Active Plans</div>
            <div className="text-3xl font-bold text-green-500">
              {users.reduce((acc, user) => acc + user.investments.length, 0)}
            </div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
             <div className="text-gray-400 text-sm font-medium mb-1">Blocked Accounts</div>
             <div className="text-3xl font-bold text-red-500">
               {users.filter(u => !u.canWithdraw).length}
             </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search users by name, account name, email, phone, or bank details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-12 pr-4 py-4 text-white focus:outline-none focus:border-red-600 transition-colors"
          />
        </div>

        {/* Users Table */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-950 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Investor</th>
                  <th className="px-6 py-4 font-medium">Bank & Account Details</th>
                  <th className="px-6 py-4 font-medium">Plans</th>
                  <th className="px-6 py-4 font-medium">Referrals</th>
                  <th className="px-6 py-4 font-medium">Dividend %</th>
                  <th className="px-6 py-4 font-medium">Withdrawals</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-neutral-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-100">{user.accountName}</div>
                        <div className="text-gray-400 text-xs">{user.email}</div>
                        <div className="text-gray-500 text-xs font-mono">{user.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-200 font-medium text-xs">{user.bankName}</div>
                        <div className="flex items-center gap-1 font-mono text-xs text-white font-bold my-0.5">
                          <span>{user.accountNumber}</span>
                          <button 
                            onClick={() => handleCopy(user.accountNumber, `user-acc-${user.id}`)}
                            className="text-gray-500 hover:text-white"
                            title="Copy Account Number"
                          >
                            {copiedRef === `user-acc-${user.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="text-xs text-emerald-400 font-medium mt-1">
                          <span className="text-gray-400 text-[10px] uppercase font-semibold block">Account Name:</span>
                          <span className="text-gray-100 font-semibold">{user.accountName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-neutral-800 px-2.5 py-1 rounded-full text-xs border border-neutral-700 inline-block mb-2 w-max">
                          {user.investments.filter(i => i.status === 'Active').length} Active
                        </span>
                        <div className="text-green-400 font-bold text-sm mb-2">
                          ₦{user.investments.filter(i => i.status === 'Active').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                        </div>
                        {user.investments.length > 0 && (
                          <div className="flex flex-col gap-1.5 max-w-[200px]">
                            {user.investments.map(inv => (
                              <div key={inv.id} className="text-[10px] bg-neutral-950 text-gray-400 border border-neutral-800 px-2 py-1.5 rounded flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-gray-300 truncate" title={inv.packageName}>
                                    {inv.packageName}
                                  </span>
                                  {inv.proofOfPayment && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProof({ investment: inv, user });
                                      }}
                                      className="text-[9px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-medium"
                                      title="View Uploaded Payment Proof"
                                    >
                                      <Eye className="w-2.5 h-2.5" /> Proof
                                    </button>
                                  )}
                                </div>
                                <div className="flex justify-between items-center opacity-80 text-[9px]">
                                  <span>₦{inv.amount.toLocaleString()}</span>
                                  <span className={
                                    inv.status === 'Pending' ? 'text-amber-400 font-semibold' : 
                                    inv.status === 'Completed' ? 'text-blue-400 font-medium' : 
                                    'text-emerald-400'
                                  }>
                                    {inv.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-bold text-gray-300">{user.referralCount || 0} Referrals</div>
                          {user.referralBonusRequested && !user.referralBonusApproved && (
                            <span className="flex h-2 w-2 relative" title="Bonus withdrawal requested">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => toggleReferralBonus(user)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors mb-2 ${
                            user.referralBonusApproved 
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20' 
                              : user.referralBonusRequested
                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20 ring-1 ring-yellow-500/50'
                                : 'bg-neutral-800 text-gray-400 border-neutral-700 hover:bg-neutral-700'
                          }`}
                        >
                          {user.referralBonusApproved ? <CheckCircle className="w-3 h-3" /> : user.referralBonusRequested ? <AlertCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {user.referralBonusApproved ? 'Bonus Apprvd' : user.referralBonusRequested ? 'Review Req' : 'No Bonus'}
                        </button>
                        {user.lastBonusWithdrawalDate && (
                          <div className="text-[10px] text-gray-400">
                            <span className="block text-gray-500">Last Req:</span>
                            {new Date(user.lastBonusWithdrawalDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 min-w-[130px]">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-neutral-800 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500" style={{ width: `${calculateUserProgress(user)}%` }}></div>
                            </div>
                            <span className="text-xs text-green-400 font-mono font-bold">{calculateUserProgress(user)}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setProgressEditingUser(user);
                                setCustomProgressVal(calculateUserProgress(user));
                              }}
                              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-[10px] font-medium border border-neutral-700 flex items-center gap-1 transition-colors"
                              title="Control Dividend Commitment Progress"
                            >
                              <Sliders className="w-2.5 h-2.5 text-[#00A86B]" /> Set %
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetUserProgress(user.id, 100)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                calculateUserProgress(user) === 100 
                                  ? 'bg-green-600 text-white border-green-500' 
                                  : 'bg-green-950/60 hover:bg-green-900 text-green-400 border-green-800'
                              }`}
                              title="Instant set to 100% (Matured / Ready to Withdraw)"
                            >
                              100%
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => toggleWithdrawal(user)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors mb-1.5 ${
                            user.canWithdraw 
                              ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' 
                              : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                          }`}
                        >
                          {user.canWithdraw ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {user.canWithdraw ? 'Allowed' : 'Blocked'}
                        </button>
                        {(user.withdrawals || []).some(w => w.status === 'Pending') && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] font-bold animate-pulse mb-1">
                            <Clock className="w-3 h-3" /> Pending Payout
                          </div>
                        )}
                        <div className="text-[11px] text-gray-400">
                          {(user.withdrawals || []).length} {(user.withdrawals || []).length === 1 ? 'transaction' : 'transactions'}
                        </div>
                        {user.lastWithdrawalDate && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            Last: {new Date(user.lastWithdrawalDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setChatSelectedUserId(user.id);
                              setActiveTab('messages');
                            }}
                            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-amber-400 hover:text-white rounded transition-colors inline-flex items-center justify-center relative"
                            title={`Chat with ${user.accountName}`}
                          >
                            <MessageSquare className="w-4 h-4" />
                            {(user.supportMessages || []).filter(m => m.sender === 'user' && !m.read).length > 0 && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full flex items-center justify-center text-[9px] text-white font-bold animate-pulse">
                                {(user.supportMessages || []).filter(m => m.sender === 'user' && !m.read).length}
                              </span>
                            )}
                          </button>
                          <button 
                            onClick={() => {
                              setEditingUser(user);
                              setMessageForm(user.adminMessage);
                            }}
                            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-gray-300 rounded transition-colors inline-flex items-center justify-center"
                            title="Edit User State"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setUserToDelete(user)}
                            className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-500 rounded transition-colors inline-flex items-center justify-center border border-red-900/50"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 p-8 rounded-xl max-w-4xl w-full relative max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => setEditingUser(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                ✕
              </button>
              <h3 className="text-2xl font-bold mb-1">Manage Investor: {editingUser.accountName}</h3>
              <p className="text-gray-400 mb-6 text-sm">Email: {editingUser.email} • Account Name: <span className="text-emerald-400 font-semibold">{editingUser.accountName}</span></p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Left Column: User Dashboard Details */}
                <div className="space-y-6 bg-black p-5 rounded-lg border border-neutral-800">
                  <h4 className="text-lg font-bold border-b border-neutral-800 pb-2 mb-4 text-[#00A86B]">User Dashboard Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="col-span-2 bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex justify-between items-center">
                      <div>
                        <span className="block text-gray-500 text-xs mb-0.5">Bank Account Name</span>
                        <span className="text-emerald-400 font-bold text-base">{editingUser.accountName}</span>
                      </div>
                      <button 
                        onClick={() => handleCopy(editingUser.accountName, `modal-accname-${editingUser.id}`)}
                        className="px-2 py-1 bg-neutral-850 hover:bg-neutral-800 text-gray-400 hover:text-white text-xs rounded border border-neutral-700 flex items-center gap-1 transition-colors"
                        title="Copy Account Name"
                      >
                        {copiedRef === `modal-accname-${editingUser.id}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Bank Name</span>
                      <span className="text-gray-200 font-medium">{editingUser.bankName}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Account Number</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-200 font-mono font-bold">{editingUser.accountNumber}</span>
                        <button 
                          onClick={() => handleCopy(editingUser.accountNumber, `modal-accnum-${editingUser.id}`)}
                          className="text-gray-500 hover:text-white"
                          title="Copy Account Number"
                        >
                          {copiedRef === `modal-accnum-${editingUser.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Phone Number</span>
                      <span className="text-gray-200">{editingUser.phone}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 mb-1">Referral Code</span>
                      <span className="text-gray-200 font-mono">{editingUser.referralCode}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Total Referrals</span>
                      <span className="font-bold text-white">{editingUser.referralCount || 0}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Active Capital</span>
                      <span className="font-bold text-green-400">₦{editingUser.investments.filter(i => i.status === 'Active').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}</span>
                    </div>
                    {(() => {
                      const cycle = getDividendCycleStatus(editingUser);
                      return (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400">Dividends Withdrawn</span>
                            <span className="font-bold text-white font-mono">{cycle.dividendWithdrawalsCount} / 2</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400">Capital Return Status</span>
                            <span className={`font-bold ${cycle.canWithdrawCapital ? 'text-purple-400' : 'text-amber-400'}`}>
                              {cycle.canWithdrawCapital ? 'Eligible ✓' : 'Locked (Requires 2 Dividends)'}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">Withdrawal Status</span>
                      <span className={`font-bold ${editingUser.canWithdraw ? 'text-green-500' : 'text-red-500'}`}>
                        {editingUser.canWithdraw ? 'Allowed' : 'Blocked'}
                      </span>
                    </div>
                  </div>

                  {/* Dividend Commitment Progress Admin Controller */}
                  <div className="pt-4 border-t border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5 uppercase tracking-wider">
                        <TrendingUp className="w-3.5 h-3.5 text-[#00A86B]" /> Dividend Progress Control
                      </label>
                      <div className="flex items-center gap-1.5">
                        {typeof editingUser.commitmentProgress === 'number' && editingUser.commitmentProgress >= 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                            Manual
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-gray-400 border border-neutral-700 font-mono">
                            Auto
                          </span>
                        )}
                        <span className="text-sm font-bold text-[#00A86B] font-mono">
                          {calculateUserProgress(editingUser)}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Display */}
                    <div className="w-full bg-neutral-900 rounded-full h-2.5 overflow-hidden border border-neutral-800">
                      <div 
                        className="h-full bg-[#00A86B] transition-all duration-300"
                        style={{ width: `${calculateUserProgress(editingUser)}%` }}
                      ></div>
                    </div>

                    {/* Range Slider */}
                    <div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={calculateUserProgress(editingUser)}
                        onChange={(e) => handleSetUserProgress(editingUser.id, Number(e.target.value))}
                        className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#00A86B]"
                      />
                      <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                        <span>0% (Started)</span>
                        <span>50%</span>
                        <span>100% (Ready to Withdraw)</span>
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0, 25, 50, 75, 100].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleSetUserProgress(editingUser.id, val)}
                          className={`py-1 rounded text-[11px] font-mono font-bold transition-all border ${
                            calculateUserProgress(editingUser) === val 
                              ? 'bg-[#00A86B] text-white border-green-500 shadow-sm' 
                              : 'bg-neutral-900 hover:bg-neutral-800 text-gray-300 border-neutral-700'
                          }`}
                        >
                          {val}%
                        </button>
                      ))}
                    </div>

                    {/* Number Input & Reset Auto button */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handleSetUserProgress(editingUser.id, null)}
                        className="px-2 py-1 text-[10px] rounded bg-neutral-900 hover:bg-neutral-800 text-gray-400 hover:text-white transition-colors flex items-center gap-1 border border-neutral-700"
                        title="Reset to dynamic calculation based on farm cycle days"
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Reset to Auto Days
                      </button>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-400">Set exact:</span>
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          value={calculateUserProgress(editingUser)}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                            handleSetUserProgress(editingUser.id, val);
                          }}
                          className="w-14 bg-black border border-neutral-700 rounded px-1.5 py-0.5 text-xs text-center font-mono font-bold text-white focus:outline-none focus:border-[#00A86B]"
                        />
                        <span className="text-xs text-gray-400 font-mono">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Admin Controls */}
                <div className="space-y-5">
                  <div className="max-h-60 overflow-y-auto pr-2 space-y-3">
                    <label className="block text-sm font-medium text-gray-300 mb-2">User Plans</label>
                    {editingUser.investments.length === 0 ? (
                      <p className="text-gray-500 text-sm">No plans found for this user.</p>
                    ) : (
                      editingUser.investments.map(inv => (
                        <div key={inv.id} className="bg-neutral-800 p-3 rounded border border-neutral-700 space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-bold text-sm text-gray-200">{inv.packageName}</div>
                              <div className="text-xs text-gray-400">
                                ₦{inv.amount.toLocaleString()} • {inv.status} • {new Date(inv.date).toLocaleDateString()}
                              </div>
                              {inv.proofOfPayment && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedProof({ investment: inv, user: editingUser })}
                                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 mt-1 underline"
                                >
                                  <Eye className="w-3 h-3" /> View Uploaded Proof
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {inv.proofOfPayment && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedProof({ investment: inv, user: editingUser })}
                                  className="p-1.5 bg-neutral-900 hover:bg-neutral-700 text-gray-300 hover:text-white rounded border border-neutral-700 transition-colors"
                                  title="Inspect Payment Proof"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {inv.status === 'Pending' ? (
                                <button
                                  onClick={() => handleApprovePlan(inv.id)}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors"
                                >
                                  Approve
                                </button>
                              ) : inv.status === 'Completed' ? (
                                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded border border-blue-500/20">
                                  Completed
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded border border-green-500/20">
                                  Active
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Admin Simulation shortcuts */}
                          {inv.status === 'Active' && (
                            <div className="flex items-center gap-2 pt-2 border-t border-neutral-700/60 text-[10px]">
                              <span className="text-gray-400 flex items-center gap-1">
                                <FastForward className="w-3 h-3 text-emerald-400" /> Simulate:
                              </span>
                              <button
                                type="button"
                                onClick={() => handleFastForwardPlan(inv.id, 14)}
                                className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-700 text-emerald-300 rounded border border-neutral-700 transition-colors font-mono"
                                title="Set approval date to 14 days ago so Cycle 1 is ready"
                              >
                                +14d (Cycle 1 Ready)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFastForwardPlan(inv.id, 28)}
                                className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-700 text-purple-300 rounded border border-neutral-700 transition-colors font-mono"
                                title="Set approval date to 28 days ago so Cycle 2 is ready"
                              >
                                +28d (Cycle 2 Ready)
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* User Withdrawal Requests */}
                  <div className="max-h-60 overflow-y-auto pr-2 space-y-3">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Withdrawal History ({(editingUser.withdrawals || []).length})
                      </label>
                      <span className="text-xs text-[#00A86B] font-mono">
                        {editingUser.bankName} • {editingUser.accountNumber} • {editingUser.accountName}
                      </span>
                    </div>
                    {(!editingUser.withdrawals || editingUser.withdrawals.length === 0) ? (
                      <p className="text-gray-500 text-xs italic bg-black/40 p-3 rounded border border-neutral-800">
                        No withdrawal requests logged yet for this investor.
                      </p>
                    ) : (
                      editingUser.withdrawals.map(wd => (
                        <div key={wd.id} className="bg-neutral-800 p-3 rounded flex justify-between items-center border border-neutral-700">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-200">{wd.reference}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-gray-400 border border-neutral-700">{wd.type}</span>
                            </div>
                            <div className="text-xs text-green-400 font-mono font-bold mt-0.5">
                              ₦{wd.amount.toLocaleString()} • <span className="text-gray-400 font-normal">{new Date(wd.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {wd.status === 'Pending' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateWithdrawalStatus(editingUser.id, wd.id, 'Approved', 'Approved in investor editor')}
                                  className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors"
                                >
                                  Pay
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateWithdrawalStatus(editingUser.id, wd.id, 'Rejected', 'Declined in investor editor')}
                                  className="px-2 py-1 bg-red-900/60 hover:bg-red-800 text-red-300 text-xs rounded transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className={`px-2 py-0.5 text-[11px] font-medium rounded border ${
                                wd.status === 'Approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {wd.status}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-300">Direct Message / Support Chat</label>
                      <button
                        type="button"
                        onClick={() => {
                          setChatSelectedUserId(editingUser.id);
                          setEditingUser(null);
                          setActiveTab('messages');
                        }}
                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold hover:underline cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Open Full Chat Thread ({((editingUser.supportMessages || []).length)})
                      </button>
                    </div>
                    <textarea 
                      value={messageForm}
                      onChange={(e) => setMessageForm(e.target.value)}
                      className="w-full bg-black border border-neutral-700 rounded p-3 text-white focus:outline-none focus:border-red-600 min-h-[100px]"
                      placeholder="Drop a message for this user to see on their dashboard..."
                    />
                  </div>

                  <div className="pt-4 border-t border-neutral-800 flex gap-3">
                    <button 
                      onClick={() => setEditingUser(null)}
                      className="flex-1 py-3 bg-neutral-800 text-white font-medium rounded hover:bg-neutral-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleUpdateUser}
                      className="flex-1 py-3 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {userToDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 p-8 rounded-xl max-w-sm w-full relative text-center">
              <div className="w-16 h-16 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-900/50">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Delete User?</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to delete <strong className="text-white">{userToDelete.accountName}</strong>? This action cannot be undone and will erase all their plans.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-neutral-800 text-white font-medium rounded hover:bg-neutral-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex justify-center items-center"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Deleting
                    </>
                  ) : (
                    'Delete User'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        </>
        ) : activeTab === 'investments' ? (
          <div className="space-y-6">
            {/* Header & Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
                <div className="flex items-center justify-between text-gray-400 text-sm font-medium mb-1">
                  <span>Total Capital Placed</span>
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
                  ₦{totalInvestedAmount.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {allInvestments.length} total plan subscriptions
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
                <div className="flex items-center justify-between text-gray-400 text-sm font-medium mb-1">
                  <span>Pending Approvals</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono">
                  {pendingInvestmentsCount}
                </div>
                <div className="text-xs text-amber-500/80 mt-1 font-semibold">
                  ₦{allInvestments.filter(i => i.status === 'Pending').reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()} awaiting verification
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
                <div className="flex items-center justify-between text-gray-400 text-sm font-medium mb-1">
                  <span>Active Plans</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-green-400 font-mono">
                  {allInvestments.filter(i => i.status === 'Active').length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Currently running in farm cycle
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
                <div className="flex items-center justify-between text-gray-400 text-sm font-medium mb-1">
                  <span>Proofs Attached</span>
                  <FileText className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-indigo-400 font-mono">
                  {allInvestments.filter(i => !!i.proofOfPayment).length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Receipts available for inspection
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by investor name, email, plan name, or amount..."
                  value={investmentSearch}
                  onChange={(e) => setInvestmentSearch(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5" /> Status:
                </span>
                {(['ALL', 'Pending', 'Active', 'Completed'] as const).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setInvestmentStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      investmentStatusFilter === status
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-gray-400 hover:text-white'
                    }`}
                  >
                    {status}
                    {status === 'Pending' && pendingInvestmentsCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 bg-amber-400 text-black text-[10px] rounded-full font-bold">
                        {pendingInvestmentsCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Investments & Proofs Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                {filteredInvestments.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-950 text-gray-400 uppercase text-xs">
                      <tr>
                        <th className="px-6 py-4 font-medium">Investor</th>
                        <th className="px-6 py-4 font-medium">Package / Plan</th>
                        <th className="px-6 py-4 font-medium">Amount (₦)</th>
                        <th className="px-6 py-4 font-medium">Date Submitted</th>
                        <th className="px-6 py-4 font-medium">Payment Proof</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {filteredInvestments.map(inv => (
                        <tr key={inv.id} className="hover:bg-neutral-800/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-100">{inv.user.accountName}</div>
                            <div className="text-gray-400 text-xs">{inv.user.email}</div>
                            <div className="text-gray-500 text-xs font-mono">{inv.user.phone}</div>
                            <div className="text-xs text-emerald-400 font-medium mt-1">
                              <span className="text-gray-400 text-[10px] uppercase font-semibold block">Account Name:</span>
                              <span className="text-gray-200 font-semibold">{inv.user.accountName}</span>
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                              {inv.user.bankName} • {inv.user.accountNumber}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-200">{inv.packageName}</div>
                            <div className="text-xs text-gray-500">Matures: {inv.withdrawalDate ? new Date(inv.withdrawalDate).toLocaleDateString() : '14 days'}</div>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                            ₦{inv.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400">
                            <div>{new Date(inv.date).toLocaleDateString()}</div>
                            <div className="text-gray-500 text-[11px]">{new Date(inv.date).toLocaleTimeString()}</div>
                          </td>
                          <td className="px-6 py-4">
                            {inv.proofOfPayment ? (
                              <div className="flex items-center gap-2">
                                {inv.proofOfPayment.startsWith('data:image/') ? (
                                  <img 
                                    src={inv.proofOfPayment} 
                                    alt="Receipt" 
                                    className="w-10 h-10 object-cover rounded border border-neutral-700 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setSelectedProof({ investment: inv, user: inv.user })}
                                  />
                                ) : (
                                  <div 
                                    onClick={() => setSelectedProof({ investment: inv, user: inv.user })}
                                    className="w-10 h-10 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] text-gray-400 cursor-pointer hover:bg-neutral-700"
                                  >
                                    <FileText className="w-5 h-5 text-emerald-400" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedProof({ investment: inv, user: inv.user })}
                                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View Proof</span>
                                  </button>
                                  <p className="text-[10px] text-gray-500 truncate max-w-[120px]" title={inv.proofFileName || 'receipt'}>
                                    {inv.proofFileName || 'receipt.jpg'}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500 italic">No receipt attached</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                inv.status === 'Pending'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                                  : inv.status === 'Active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              }`}>
                                {inv.status === 'Pending' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                {inv.status === 'Pending' ? 'Awaiting Confirmation' : inv.status}
                              </span>
                              {inv.status === 'Pending' && (
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                  Dividend paused until confirmed
                                </p>
                              )}
                              {inv.status === 'Active' && inv.approvedAt && (
                                <p className="text-[10px] text-emerald-400 mt-0.5 font-mono">
                                  Started: {new Date(inv.approvedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {inv.proofOfPayment && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedProof({ investment: inv, user: inv.user })}
                                  className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-xs font-medium rounded border border-neutral-700 transition-colors flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Inspect</span>
                                </button>
                              )}
                              {inv.status === 'Pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleApprovePlanGlobal(inv.user.id, inv.id)}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded transition-colors shadow flex items-center gap-1 cursor-pointer"
                                  title="Confirm payment and start 14-day dividend countdown immediately"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Confirm Payment</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-40 text-emerald-400" />
                    <p className="font-semibold text-gray-400">No investment records found</p>
                    <p className="text-xs mt-1 text-gray-500">
                      When investors purchase agricultural packages, their uploaded payment proofs and transactions will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'withdrawals' ? (
          <div className="space-y-6">
            {/* Header & Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
                <div className="flex items-center justify-between text-gray-400 text-sm font-medium mb-1">
                  <span>Total Paid Out</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-green-400 font-mono">
                  ₦{totalWithdrawnAmount.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {allWithdrawals.filter(w => w.status === 'Approved').length} completed payouts
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
                <div className="flex items-center justify-between text-gray-400 text-sm font-medium mb-1">
                  <span>Pending Volume</span>
                  <Clock className="w-4 h-4 text-yellow-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-yellow-400 font-mono">
                  ₦{totalPendingAmount.toLocaleString()}
                </div>
                <div className="text-xs text-yellow-500/80 mt-1 font-semibold">
                  {pendingWithdrawalsCount} awaiting review & payment
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
                <div className="flex items-center justify-between text-gray-400 text-sm font-medium mb-1">
                  <span>Total Requests</span>
                  <FileText className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white">
                  {allWithdrawals.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Across all registered investors
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg">
                <div className="flex items-center justify-between text-gray-400 text-sm font-medium mb-1">
                  <span>Rejected Requests</span>
                  <XCircle className="w-4 h-4 text-red-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-red-400">
                  {allWithdrawals.filter(w => w.status === 'Rejected').length}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Declined transactions
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input 
                  type="text"
                  placeholder="Search by investor name, email, ref code, bank name, or account no..."
                  value={withdrawalSearchTerm}
                  onChange={(e) => setWithdrawalSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black border border-neutral-700 rounded text-sm text-white focus:outline-none focus:border-[#00A86B]"
                />
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                {/* Status Pills */}
                <div className="flex bg-black p-1 rounded border border-neutral-800 text-xs">
                  {(['ALL', 'Pending', 'Approved', 'Rejected'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setWithdrawalStatusFilter(status)}
                      className={`px-3 py-1 rounded transition-colors font-medium ${
                        withdrawalStatusFilter === status 
                          ? 'bg-[#00A86B] text-white font-bold' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {status === 'ALL' ? 'All Status' : status}
                    </button>
                  ))}
                </div>

                {/* Type Filter */}
                <select
                  value={withdrawalTypeFilter}
                  onChange={(e) => setWithdrawalTypeFilter(e.target.value)}
                  className="bg-black border border-neutral-800 text-xs text-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-[#00A86B]"
                >
                  <option value="ALL">All Types</option>
                  <option value="Plan Dividend">Plan Dividend</option>
                  <option value="Capital + Dividend">Capital + Dividend</option>
                  <option value="Capital Return">Capital Return</option>
                  <option value="Referral Bonus">Referral Bonus</option>
                  <option value="General Withdrawal">General Withdrawal</option>
                </select>
              </div>
            </div>

            {/* Withdrawals Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/40">
                <div className="flex items-center gap-2">
                  <ArrowDownCircle className="w-5 h-5 text-[#00A86B]" />
                  <span className="font-semibold text-gray-200">Transaction History Log</span>
                  <span className="text-xs text-gray-500">({filteredWithdrawals.length} entries)</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                {filteredWithdrawals.length > 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-950 text-gray-400 uppercase text-xs">
                      <tr>
                        <th className="px-6 py-4 font-medium">Ref Code</th>
                        <th className="px-6 py-4 font-medium">Date & Time</th>
                        <th className="px-6 py-4 font-medium">Investor</th>
                        <th className="px-6 py-4 font-medium">Bank & Account Details</th>
                        <th className="px-6 py-4 font-medium">Type</th>
                        <th className="px-6 py-4 font-medium">Amount (₦)</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {filteredWithdrawals.map(wd => (
                        <tr key={wd.id} className="hover:bg-neutral-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 font-mono text-xs text-gray-200 font-bold">
                              <span>{wd.reference}</span>
                              <button
                                onClick={() => handleCopy(wd.reference, wd.id)}
                                className="text-gray-500 hover:text-white transition-colors"
                                title="Copy Reference"
                              >
                                {copiedRef === wd.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400">
                            <div>{new Date(wd.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                            <div className="text-[11px] text-gray-500">{new Date(wd.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-100">{wd.accountName || wd.userName}</div>
                            <div className="text-xs text-gray-400">{wd.userEmail}</div>
                            {wd.phone && <div className="text-[11px] text-gray-500 font-mono">{wd.phone}</div>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-xs text-gray-200">{wd.bankName}</div>
                            <div className="flex items-center gap-1 font-mono text-xs text-white font-bold my-0.5">
                              <span>{wd.accountNumber}</span>
                              <button 
                                onClick={() => handleCopy(wd.accountNumber, `acc-${wd.id}`)}
                                className="text-gray-500 hover:text-white"
                                title="Copy Account Number"
                              >
                                {copiedRef === `acc-${wd.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                            <div className="text-xs text-emerald-400 font-medium mt-1">
                              <span className="text-gray-400 text-[10px] uppercase font-semibold block">Account Name:</span>
                              <span className="text-gray-100 font-semibold">{wd.accountName || wd.userName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded text-xs border ${
                              wd.type === 'Plan Dividend' ? 'bg-green-950/40 text-green-400 border-green-800' :
                              wd.type === 'Referral Bonus' ? 'bg-blue-950/40 text-blue-400 border-blue-800' :
                              (wd.type === 'Capital + Dividend' || wd.type === 'Capital Return') ? 'bg-purple-950/40 text-purple-400 border-purple-800' :
                              'bg-neutral-800 text-gray-300 border-neutral-700'
                            }`}>
                              {wd.type}
                            </span>
                            {(wd.type === 'Capital + Dividend' || wd.type === 'Capital Return') && (
                              <div className="mt-1">
                                {(() => {
                                  const userDivCount = (wd.user?.withdrawals || []).filter(w => w.type === 'Plan Dividend' && w.status !== 'Rejected').length;
                                  return userDivCount >= 2 ? (
                                    <span className="text-[10px] text-green-400 font-mono flex items-center gap-1">
                                      <CheckCircle className="w-2.5 h-2.5" /> 2/2 Divs Paid
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                                      <AlertCircle className="w-2.5 h-2.5" /> {userDivCount}/2 Divs
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-green-400 text-sm">
                            ₦{wd.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              wd.status === 'Approved'
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : wd.status === 'Rejected'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse'
                            }`}>
                              {wd.status === 'Approved' ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : wd.status === 'Rejected' ? (
                                <XCircle className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              {wd.status === 'Approved' ? 'Paid & Approved' : wd.status === 'Rejected' ? 'Rejected' : 'Pending Review'}
                            </span>
                            {wd.adminNote && (
                              <div className="text-[10px] text-gray-400 mt-1 italic">Note: {wd.adminNote}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {wd.status === 'Pending' ? (
                                <>
                                  <button
                                    onClick={() => handleUpdateWithdrawalStatus(wd.userId, wd.id, 'Approved', 'Payout disbursed by admin')}
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors flex items-center gap-1 shadow-sm"
                                    title="Approve and mark payout as disbursed"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Approve & Pay
                                  </button>
                                  <button
                                    onClick={() => {
                                      const reason = prompt('Optional rejection note (e.g. invalid account details):', 'Account details could not be verified');
                                      if (reason !== null) {
                                        handleUpdateWithdrawalStatus(wd.userId, wd.id, 'Rejected', reason);
                                      }
                                    }}
                                    className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800 text-xs font-medium rounded transition-colors"
                                    title="Reject withdrawal"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : wd.status === 'Approved' ? (
                                <button
                                  onClick={() => handleUpdateWithdrawalStatus(wd.userId, wd.id, 'Pending')}
                                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-gray-400 hover:text-white text-xs rounded transition-colors"
                                  title="Revert status to pending"
                                >
                                  Revert to Pending
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateWithdrawalStatus(wd.userId, wd.id, 'Pending')}
                                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-gray-400 hover:text-white text-xs rounded transition-colors"
                                  title="Re-open request"
                                >
                                  Re-open Request
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40 text-[#00A86B]" />
                    <p className="font-semibold text-gray-400">No withdrawal records matching current filters</p>
                    <p className="text-xs mt-1 text-gray-500">
                      When users request dividend or bonus withdrawals, their transactions will appear here for review and disbursement.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'messages' ? (
          <AdminSupportChat 
            users={users} 
            onUsersUpdated={() => setUsers(getStoreUsers())} 
            initialSelectedUserId={chatSelectedUserId}
          />
        ) : (
          <SiteSettingsEditor />
        )}

        {/* Quick Progress Modal from Users Table */}
        {progressEditingUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-2xl max-w-md w-full relative shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#00A86B]/20 rounded-xl text-[#00A86B] border border-[#00A86B]/30">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Adjust Dividend Progress</h3>
                    <p className="text-xs text-gray-400 truncate max-w-[240px]">{progressEditingUser.accountName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setProgressEditingUser(null)}
                  className="text-gray-400 hover:text-white text-lg p-1"
                >
                  ✕
                </button>
              </div>

              <div className="text-center py-2 bg-black/40 rounded-xl border border-neutral-800/80">
                <span className="text-4xl font-extrabold text-[#00A86B] font-mono">
                  {customProgressVal}%
                </span>
                <span className="text-xs text-gray-400 block mt-1 font-medium">
                  {customProgressVal >= 100 
                    ? '✓ Matured: User can immediately request dividend payout' 
                    : 'In Progress: Farming harvest cycle underway'}
                </span>
              </div>

              {/* Progress Bar Visual */}
              <div className="w-full bg-black rounded-full h-3 overflow-hidden border border-neutral-800">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-600 to-[#00A86B] transition-all duration-200"
                  style={{ width: `${customProgressVal}%` }}
                ></div>
              </div>

              {/* Range Slider */}
              <div className="space-y-1">
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={customProgressVal}
                  onChange={(e) => setCustomProgressVal(Number(e.target.value))}
                  className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#00A86B]"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>0% (Started)</span>
                  <span>50%</span>
                  <span>100% (Ready)</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 25, 50, 75, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCustomProgressVal(val)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                      customProgressVal === val 
                        ? 'bg-[#00A86B] text-white border-green-500 shadow-md' 
                        : 'bg-black hover:bg-neutral-800 text-gray-300 border-neutral-800'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    handleSetUserProgress(progressEditingUser.id, null);
                    setProgressEditingUser(null);
                  }}
                  className="py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-xs font-medium rounded-lg border border-neutral-700 flex items-center gap-1.5 transition-colors"
                  title="Reset to dynamic calculation based on real cycle days"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Auto Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSetUserProgress(progressEditingUser.id, customProgressVal);
                    setProgressEditingUser(null);
                  }}
                  className="flex-1 py-2.5 bg-[#00A86B] hover:bg-green-600 text-white font-bold rounded-lg transition-colors text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Save & Apply {customProgressVal}%
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Uploaded Payment Proof Viewer Modal */}
        {selectedProof && (
          <ProofViewerModal
            investment={selectedProof.investment}
            user={selectedProof.user}
            onClose={() => setSelectedProof(null)}
            onApprove={(userId, investmentId) => {
              handleApprovePlanGlobal(userId, investmentId);
            }}
          />
        )}

      </div>
    </div>
  );
}
