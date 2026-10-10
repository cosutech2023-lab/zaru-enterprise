import { User, Investment, SiteSettings, DEFAULT_SITE_SETTINGS, Withdrawal, PACKAGES, SupportMessage, AdminNotification, getPackageImage } from './types';
import { db } from './lib/firebase';
import { collection, doc, setDoc, getDocs, getDoc, updateDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';

const USERS_COL = 'users';
const SETTINGS_COL = 'siteSettings';
const SETTINGS_DOC = 'main';
const NOTIFS_COL = 'adminNotifications';

// --- Site Settings ---
export const getSiteSettings = (): SiteSettings => {
  try {
    const cached = localStorage.getItem('zaru_settings_cache');
    if (cached) return JSON.parse(cached);
  } catch {}
  return DEFAULT_SITE_SETTINGS;
};

export const getSiteSettingsAsync = async (): Promise<SiteSettings> => {
  try {
    const snap = await getDoc(doc(db, SETTINGS_COL, SETTINGS_DOC));
    if (snap.exists()) {
      const data = snap.data() as SiteSettings;
      localStorage.setItem('zaru_settings_cache', JSON.stringify(data));
      return data;
    }
  } catch(e){ console.log("settings error", e) }
  return DEFAULT_SITE_SETTINGS;
}

export const saveSiteSettings = async (settings: SiteSettings) => {
  localStorage.setItem('zaru_settings_cache', JSON.stringify(settings));
  await setDoc(doc(db, SETTINGS_COL, SETTINGS_DOC), settings);
};

// --- Users - FULLY CLOUD NOW ---
export const getStoreUsers = (): User[] => {
  try {
    const cached = localStorage.getItem('zaru_users_cache');
    if (cached) return JSON.parse(cached);
  } catch {}
  return [];
};

export const getStoreUsersAsync = async (): Promise<User[]> => {
  const snap = await getDocs(collection(db, USERS_COL));
  const users = snap.docs.map(d => d.data() as User);
  localStorage.setItem('zaru_users_cache', JSON.stringify(users));
  return users;
};

// THIS IS THE KEY FIX - now checks Firestore, not localStorage
export const findStoreUserByEmail = async (email: string): Promise<User | undefined> => {
  const q = query(collection(db, USERS_COL), where("email", "==", email.toLowerCase()));
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].data() as User;

  // fallback check lowercase
  const all = await getStoreUsersAsync();
  return all.find(u => u.email.toLowerCase() === email.toLowerCase());
};

export const findStoreUserByEmailSync = (email: string): User | undefined => {
  return getStoreUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
};

export const saveStoreUsers = async (users: User[]) => {
  localStorage.setItem('zaru_users_cache', JSON.stringify(users));
  // batch save
  for (const u of users) {
    await setDoc(doc(db, USERS_COL, u.id), u, { merge: true });
  }
};

export const createStoreUser = async (userData: any): Promise<User> => {
  const id = doc(collection(db, USERS_COL)).id; // proper firebase id
  const newUser: User = {
   ...userData,
    id,
    email: userData.email.toLowerCase(),
    referralCode: 'ZARU-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    referralCount: 0,
    commitmentProgress: 0,
    canWithdraw: true,
    adminMessage: '',
    investments: [],
    withdrawals: [],
    supportMessages: [],
    createdAt: new Date().toISOString(),
  };
  delete (newUser as any).referredBy;

  await setDoc(doc(db, USERS_COL, id), newUser);

  if (userData.referredBy) {
    const q = query(collection(db, USERS_COL), where("referralCode", "==", userData.referredBy));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const refDoc = snap.docs[0];
      const refUser = refDoc.data() as User;
      await updateDoc(doc(db, USERS_COL, refUser.id), {
        referralCount: (refUser.referralCount || 0) + 1
      });
    }
  }

  const current = getStoreUsers();
  localStorage.setItem('zaru_users_cache', JSON.stringify([...current, newUser]));
  return newUser;
};

export const updateStoreUser = async (updatedUser: User) => {
  // update cache instantly
  const current = getStoreUsers();
  localStorage.setItem('zaru_users_cache', JSON.stringify(
    current.map(u => u.id === updatedUser.id? updatedUser : u)
  ));
  await setDoc(doc(db, USERS_COL, updatedUser.id), updatedUser, { merge: true });
};

export const deleteStoreUser = async (userId: string) => {
  localStorage.setItem('zaru_users_cache', JSON.stringify(
    getStoreUsers().filter(u => u.id!== userId)
  ));
  await deleteDoc(doc(db, USERS_COL, userId));
};

// --- Admin Notifications ---
export const getAdminNotifications = (): AdminNotification[] => {
  const str = localStorage.getItem('zaru_admin_notifs_cache');
  if (!str) return [];
  try { return JSON.parse(str); } catch { return []; }
};

export const saveAdminNotifications = async (notifications: AdminNotification[]) => {
  localStorage.setItem('zaru_admin_notifs_cache', JSON.stringify(notifications));
};

export const addAdminNotification = async (notif: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>) => {
  const newNotif: AdminNotification = {
   ...notif,
    id: doc(collection(db, NOTIFS_COL)).id,
    timestamp: new Date().toISOString(),
    read: false
  } as AdminNotification;
  await setDoc(doc(db, NOTIFS_COL, newNotif.id), newNotif);
  const current = getAdminNotifications();
  await saveAdminNotifications([newNotif,...current].slice(0,100));
  return newNotif;
};

export const listenToUsers = (callback: (users: User[]) => void) => {
  return onSnapshot(collection(db, USERS_COL), (snap) => {
    const users = snap.docs.map(d => d.data() as User);
    localStorage.setItem('zaru_users_cache', JSON.stringify(users));
    callback(users);
  });
};

export const listenToNotifications = (callback: (notifs: AdminNotification[]) => void) => {
  return onSnapshot(collection(db, NOTIFS_COL), (snap) => {
    const notifs = snap.docs.map(d => d.data() as AdminNotification).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    callback(notifs);
  });
};

// --- Dividend logic - unchanged ---
export interface DividendCycleStatus {
  dividendWithdrawalsCount: number;
  approvedDividendWithdrawalsCount: number;
  canWithdrawCapital: boolean;
  cycle1Done: boolean;
  cycle2Done: boolean;
  isDividendMaxedOut: boolean;
  currentCycle: 1 | 2 | 3;
  cycle1Progress: number;
  cycle2Progress: number;
  activeProgress: number;
  daysElapsed: number;
}
export const getLatestCapitalWithdrawal = (user: User): Withdrawal | null => {
  const capitalWithdrawals = (user.withdrawals || []).filter(w => (w.type === 'Capital + Dividend' || w.type === 'Capital Return') && w.status!== 'Rejected');
  if (capitalWithdrawals.length === 0) return null;
  return capitalWithdrawals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
};
export const getUserDividendWithdrawals = (user: User): Withdrawal[] => {
  const allDivWithdrawals = (user.withdrawals || []).filter(w => w.type === 'Plan Dividend' && w.status!== 'Rejected');
  const lastCapitalWd = getLatestCapitalWithdrawal(user);
  if (!lastCapitalWd) return allDivWithdrawals;
  const lastCapitalTime = new Date(lastCapitalWd.date).getTime();
  return allDivWithdrawals.filter(w => new Date(w.date).getTime() > lastCapitalTime);
};
export const getUserCurrentActiveInvestments = (user: User): Investment[] => {
  const lastCapitalWd = getLatestCapitalWithdrawal(user);
  const lastCapitalTime = lastCapitalWd? new Date(lastCapitalWd.date).getTime() : 0;
  return (user.investments || []).filter(inv => {
    if (inv.status!== 'Active') return false;
    if (lastCapitalTime > 0) {
      const invTime = new Date(inv.approvedAt || inv.date).getTime();
      return invTime > lastCapitalTime;
    }
    return true;
  });
};
export const getDividendCycleStatus = (user: User): DividendCycleStatus => {
  const divWithdrawals = getUserDividendWithdrawals(user);
  const dividendWithdrawalsCount = divWithdrawals.length;
  const cycle1Done = dividendWithdrawalsCount >= 1;
  const cycle2Done = dividendWithdrawalsCount >= 2;
  const currentCycle = (dividendWithdrawalsCount === 0? 1 : dividendWithdrawalsCount === 1? 2 : 3) as 1|2|3;
  return {
    dividendWithdrawalsCount,
    approvedDividendWithdrawalsCount: divWithdrawals.filter(w => w.status === 'Approved').length,
    canWithdrawCapital: cycle2Done,
    cycle1Done, cycle2Done,
    isDividendMaxedOut: dividendWithdrawalsCount >= 2,
    currentCycle,
    cycle1Progress: 0, cycle2Progress: 0, activeProgress: user.commitmentProgress || 0, daysElapsed: 0
  };
};
export const getUserAvailableDividend = (user: User): number => {
  const status = getDividendCycleStatus(user);
  if (status.isDividendMaxedOut) return 0;
  return getUserCurrentActiveInvestments(user).reduce((sum, i) => {
    const pkg = PACKAGES.find(p => p.id === i.packageId);
    const roi = pkg? pkg.roi : 15;
    return sum + Math.round((i.amount * roi) / 100);
  }, 0);
};
export const calculateUserProgress = (user: User): number => user.commitmentProgress || 0;

// TEMP FIX FOR VERCEL BUILD - so old AdminSupportChat imports work
export const archiveMessageAsRead = async () => {};
export const addAdminSupportMessage = async () => {};
export const markUserMessageAsRead = async () => {};
export const markMessageAsRead = async () => {};
export const addUserSupportMessage = async () => {};