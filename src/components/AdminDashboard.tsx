import React, { useState, useEffect } from 'react';
import { User, Withdrawal, Investment, getPackageImage, PACKAGES } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Users, ShieldAlert, CheckCircle, XCircle, Search, Edit2, Trash2, AlertCircle, Settings, ArrowDownCircle, Clock, Copy, Check, DollarSign, Filter, RefreshCw, FileText, Eye, TrendingUp, Sliders, RotateCcw, MessageSquare, ArrowRight, Database, Building2, Wallet, FastForward } from 'lucide-react';
import SiteSettingsEditor from './SiteSettingsEditor';
import ProofViewerModal from './ProofViewerModal';
import AdminSupportChat from './AdminSupportChat';
import AdminNotificationBell from './AdminNotificationBell';

interface Props { onLogout: () => void; }

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

  // 🔥 LIVE FIRESTORE - FIXES MULTI-DEVICE
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const liveUsers = snap.docs.map(d => ({ id: d.id,...d.data() } as User));
      setUsers(liveUsers);
      // Update editingUser live too
      if (editingUser) {
        const fresh = liveUsers.find(u => u.id === editingUser.id);
        if (fresh) setEditingUser(fresh);
      }
    });
    return () => unsub();
  }, []);

  // --- Helpers (from your old store.ts) ---
  const calculateUserProgress = (user: User): number => {
    if (typeof user.commitmentProgress === 'number' && user.commitmentProgress >=0) return user.commitmentProgress;
    return 0;
  };
  const getDividendCycleStatus = (user: User) => {
    const divs = (user.withdrawals || []).filter(w => w.type === 'Plan Dividend' && w.status!== 'Rejected');
    return { dividendWithdrawalsCount: divs.length, canWithdrawCapital: divs.length >=2 };
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(id);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // --- Firestore Actions ---
  const handleUpdateUser = async () => {
    if (!editingUser) return;
    await updateDoc(doc(db, 'users', editingUser.id), { adminMessage: messageForm } as any);
    setEditingUser(null);
  };
  const handleApprovePlanGlobal = async (userId: string, investmentId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const newInvestments = user.investments.map(inv => inv.id === investmentId? {...inv, status: 'Active' as const, approvedAt: new Date().toISOString() } : inv);
    await updateDoc(doc(db, 'users', userId), { investments: newInvestments } as any);
  };
  const handleApprovePlan = (id: string) => { if (editingUser) handleApprovePlanGlobal(editingUser.id, id); };
  const handleFastForwardPlan = async (investmentId: string, daysAgo: number) => {
    if (!editingUser) return;
    const newInvestments = editingUser.investments.map(inv => {
      if (inv.id === investmentId) {
        const past = new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();
        return {...inv, approvedAt: past, date: past, status: 'Active' as const };
      }
      return inv;
    });
    await updateDoc(doc(db, 'users', editingUser.id), { investments: newInvestments } as any);
  };
  const handleSetUserProgress = async (userId: string, progress: number | null) => {
    await updateDoc(doc(db, 'users', userId), { commitmentProgress: progress?? 0 } as any);
  };
  const toggleWithdrawal = async (user: User) => {
    await updateDoc(doc(db, 'users', user.id), { canWithdraw:!user.canWithdraw } as any);
  };
  const handleUpdateWithdrawalStatus = async (userId: string, withdrawalId: string, status: any) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const newWithdrawals = user.withdrawals.map(w => w.id === withdrawalId? {...w, status } : w);
    await updateDoc(doc(db, 'users', userId), { withdrawals: newWithdrawals } as any);
  };
  const toggleReferralBonus = async (user: User) => {
    const isApproving =!user.referralBonusApproved;
    await updateDoc(doc(db, 'users', user.id), { referralBonusApproved: isApproving, referralBonusRequested: false,...(isApproving? { referralCount: 0 } : {}) } as any);
  };
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    await deleteDoc(doc(db, 'users', userToDelete.id));
    setIsDeleting(false);
    setUserToDelete(null);
  };
  const handleNavigateFromNotification = (tab: 'users' | 'investments' | 'withdrawals' | 'settings' | 'messages', extraData?: any) => {
    setActiveTab(tab);
    if (tab === 'investments' && extraData?.investorName) setInvestmentSearch(extraData.investorName);
    if (tab === 'withdrawals' && extraData?.investorName) setWithdrawalSearchTerm(extraData.investorName);
    if (tab === 'messages' && extraData?.userId) setChatSelectedUserId(extraData.userId);
  };

  // --- Derived data (same as yours) ---
  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase()) || u.accountName.toLowerCase().includes(searchTerm.toLowerCase()) || u.bankName.toLowerCase().includes(searchTerm.toLowerCase()) || u.accountNumber.includes(searchTerm) || u.phone.includes(searchTerm));
  const allWithdrawals = users.flatMap(u => (u.withdrawals || []).map(w => ({...w, userId: u.id, userName: w.userName || u.accountName, userEmail: w.userEmail || u.email, phone: u.phone, bankName: w.bankName || u.bankName, accountNumber: w.accountNumber || u.accountNumber, accountName: w.accountName || u.accountName }))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const allInvestments = users.flatMap(u => (u.investments || []).map(inv => ({...inv, user: u }))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const pendingInvestmentsCount = allInvestments.filter(i => i.status === 'Pending').length;
  const pendingWithdrawalsCount = allWithdrawals.filter(w => w.status === 'Pending').length;
  const totalWithdrawnAmount = allWithdrawals.filter(w => w.status === 'Approved').reduce((sum, w) => sum + w.amount, 0);
  const totalPendingAmount = allWithdrawals.filter(w => w.status === 'Pending').reduce((sum, w) => sum + w.amount, 0);
  const totalInvestedAmount = allInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalUnreadMessages = users.reduce((acc, u) => acc + (u.supportMessages || []).filter(m => m.sender === 'user' &&!m.read).length, 0);
  const filteredInvestments = allInvestments.filter(item => {
    const matchesStatus = investmentStatusFilter === 'ALL' || item.status === investmentStatusFilter;
    const search = investmentSearch.toLowerCase();
    const matchesSearch =!investmentSearch || item.user.accountName.toLowerCase().includes(search) || item.user.email.toLowerCase().includes(search) || item.packageName.toLowerCase().includes(search);
    return matchesStatus && matchesSearch;
  });
  const filteredWithdrawals = allWithdrawals.filter(w => {
    const matchesSearch = w.reference.toLowerCase().includes(withdrawalSearchTerm.toLowerCase()) || w.userName.toLowerCase().includes(withdrawalSearchTerm.toLowerCase());
    const matchesStatus = withdrawalStatusFilter === 'ALL' || w.status === withdrawalStatusFilter;
    const matchesType = withdrawalTypeFilter === 'ALL' || w.type === withdrawalTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-red-600 pb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3"><ShieldAlert className="text-red-600 w-8 h-8" /> Admin Portal <span className="text-emerald-400 text-sm ml-2 flex items-center gap-1"><Database className="w-4 h-4"/> LIVE ({users.length})</span></h1>
            <p className="text-gray-400 text-sm">Firestore Live - Any device will see same users</p>
          </div>
          <div className="flex items-center gap-3">
            <AdminNotificationBell onNavigateTab={handleNavigateFromNotification} />
            <button onClick={onLogout} className="px-6 py-2 border border-red-600 text-red-600 rounded hover:bg-red-600 hover:text-white">LOGOUT ADMIN</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-neutral-800 pb-2 overflow-x-auto">
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-4 py-2 font-bold rounded ${activeTab === 'users'? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-neutral-800'}`}><Users size={18} /> USERS ({users.length})</button>
          <button onClick={() => setActiveTab('investments')} className={`flex items-center gap-2 px-4 py-2 font-bold rounded ${activeTab === 'investments'? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-neutral-800'}`}><FileText size={18} /> INVESTMENTS {pendingInvestmentsCount > 0 && <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-amber-400 text-black animate-pulse">{pendingInvestmentsCount}</span>}</button>
          <button onClick={() => setActiveTab('withdrawals')} className={`flex items-center gap-2 px-4 py-2 font-bold rounded ${activeTab === 'withdrawals'? 'bg-[#00A86B] text-white' : 'text-gray-400 hover:text-white hover:bg-neutral-800'}`}><ArrowDownCircle size={18} /> WITHDRAWALS {pendingWithdrawalsCount > 0 && <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-yellow-400 text-black animate-pulse">{pendingWithdrawalsCount}</span>}</button>
          <button onClick={() => setActiveTab('messages')} className={`flex items-center gap-2 px-4 py-2 font-bold rounded ${activeTab === 'messages'? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white hover:bg-neutral-800'}`}><MessageSquare size={18} /> MESSAGES {totalUnreadMessages > 0 && <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-red-600 text-white animate-pulse">{totalUnreadMessages}</span>}</button>
          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-4 py-2 font-bold rounded ${activeTab === 'settings'? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-neutral-800'}`}><Settings size={18} /> SETTINGS</button>
        </div>

        {activeTab === 'users' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg"><div className="text-gray-400 text-sm mb-1">Total Users</div><div className="text-3xl font-bold">{users.length}</div></div>
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg"><div className="text-gray-400 text-sm mb-1">Total Active Plans</div><div className="text-3xl font-bold text-green-500">{users.reduce((acc, u) => acc + u.investments.length, 0)}</div></div>
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg"><div className="text-gray-400 text-sm mb-1">Blocked Accounts</div><div className="text-3xl font-bold text-red-500">{users.filter(u =>!u.canWithdraw).length}</div></div>
            </div>
            <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" /><input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-12 pr-4 py-4 text-white focus:outline-none focus:border-red-600" /></div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-neutral-950 text-gray-400 uppercase text-xs"><tr><th className="px-6 py-4">Investor</th><th className="px-6 py-4">Bank</th><th className="px-6 py-4">Plans</th><th className="px-6 py-4">Actions</th></tr></thead><tbody className="divide-y divide-neutral-800">{filteredUsers.map(user => (<tr key={user.id} className="hover:bg-neutral-800/50"><td className="px-6 py-4"><div className="font-bold">{user.accountName}</div><div className="text-gray-400 text-xs">{user.email}</div></td><td className="px-6 py-4 text-xs">{user.bankName} - {user.accountNumber}</td><td className="px-6 py-4">{user.investments?.length} plans</td><td className="px-6 py-4 flex gap-2"><button onClick={() => { setEditingUser(user); setMessageForm(user.adminMessage||''); }} className="p-2 bg-neutral-800 rounded"><Edit2 className="w-4 h-4" /></button><button onClick={() => setUserToDelete(user)} className="p-2 bg-red-900/30 text-red-500 rounded"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody></table></div></div>
          </>
        )}

        {activeTab === 'investments' && (
          <div className="space-y-4">
            <input type="text" placeholder="Search investments..." value={investmentSearch} onChange={e=>setInvestmentSearch(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-lg px-4 py-2 text-sm" />
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-neutral-950 text-gray-400 uppercase text-xs"><tr><th className="px-6 py-4">Investor</th><th className="px-6 py-4">Package</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Proof</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-neutral-800">{filteredInvestments.map(inv=> (<tr key={inv.id} className="hover:bg-neutral-800/40"><td className="px-6 py-4"><div className="font-bold">{inv.user.accountName}</div><div className="text-xs text-gray-400">{inv.user.email}</div></td><td className="px-6 py-4">{inv.packageName}</td><td className="px-6 py-4 font-mono text-emerald-400">₦{inv.amount.toLocaleString()}</td><td className="px-6 py-4">{inv.proofUrl || inv.proofOfPayment? <button onClick={()=>setSelectedProof({investment: inv, user: inv.user})} className="text-emerald-400 flex items-center gap-1"><Eye className="w-3.5 h-3.5"/> View</button> : <span className="text-gray-500 italic">No proof</span>}</td><td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs border ${inv.status==='Pending'?'bg-amber-500/10 text-amber-400 border-amber-500/30':'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>{inv.status}</span></td><td className="px-6 py-4 text-right">{inv.status==='Pending' && <button onClick={()=>handleApprovePlanGlobal(inv.user.id, inv.id)} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded">Confirm Payment</button>}</td></tr>))}</tbody></table></div></div>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="space-y-2">
            {filteredWithdrawals.map(wd=> (<div key={wd.id} className="bg-neutral-900 border p-3 rounded flex justify-between items-center"><div className="text-sm"><div className="font-bold">{wd.userName} - ₦{wd.amount.toLocaleString()} - {wd.type} - {wd.status}</div><div className="text-xs text-gray-400">{wd.bankName} {wd.accountNumber}</div></div><div className="flex gap-2">{wd.status==='Pending' && <><button onClick={()=>handleUpdateWithdrawalStatus(wd.userId, wd.id, 'Approved')} className="bg-green-600 px-3 py-1 rounded text-xs">Approve</button><button onClick={()=>handleUpdateWithdrawalStatus(wd.userId, wd.id, 'Rejected')} className="bg-red-600 px-3 py-1 rounded text-xs">Reject</button></>}</div></div>))}
          </div>
        )}

        {activeTab === 'messages' && <AdminSupportChat users={users} onUsersUpdated={()=>{}} initialSelectedUserId={chatSelectedUserId} />}
        {activeTab === 'settings' && <SiteSettingsEditor />}

        {editingUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 p-8 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-4">Manage {editingUser.accountName}</h3>
              <textarea value={messageForm} onChange={e=>setMessageForm(e.target.value)} className="w-full bg-black border border-neutral-700 rounded p-3 min-h-[100px]" placeholder="Message for user" />
              <div className="flex gap-3 mt-4"><button onClick={()=>setEditingUser(null)} className="flex-1 py-3 bg-neutral-800 rounded">Cancel</button><button onClick={handleUpdateUser} className="flex-1 py-3 bg-red-600 rounded">Save</button></div>
            </div>
          </div>
        )}
        {userToDelete && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 border p-6 rounded-xl max-w-sm w-full text-center"><h3 className="text-xl font-bold mb-4">Delete {userToDelete.accountName}?</h3><div className="flex gap-3"><button onClick={()=>setUserToDelete(null)} className="flex-1 py-3 bg-neutral-800 rounded">Cancel</button><button onClick={handleDeleteUser} className="flex-1 py-3 bg-red-600 rounded">{isDeleting?'Deleting...':'Delete'}</button></div></div>
          </div>
        )}
        {selectedProof && <ProofViewerModal investment={selectedProof.investment} user={selectedProof.user} onClose={()=>setSelectedProof(null)} onApprove={(uid,iid)=>{handleApprovePlanGlobal(uid,iid); setSelectedProof(null);}} />}
      </div>
    </div>
  );
}