import { User, Investment, SiteSettings, DEFAULT_SITE_SETTINGS, Withdrawal, PACKAGES, SupportMessage, AdminNotification, getPackageImage } from './types';
// Firebase replaces Supabase - dummy functions to make build pass
const fetchAllDataFromSupabase = async () => { return null }
const saveUserProfileToSupabase = async (data: any) => {}
const saveInvestmentToSupabase = async (data: any) => {}
const saveWithdrawalToSupabase = async (data: any) => {}
const saveSupportMessageToSupabase = async (data: any) => {}
const saveAdminNotificationToSupabase = async (data: any) => {}
const setupSupabaseRealtimeSubscriptions = () => { return () => {} }

const USERS_KEY = 'saposa_users';
const SETTINGS_KEY = 'saposa_site_settings';
const ADMIN_NOTIFICATIONS_KEY = 'saposa_admin_notifications';

export const getSiteSettings = (): SiteSettings => {
  const settings = localStorage.getItem(SETTINGS_KEY);
  if (!settings) return DEFAULT_SITE_SETTINGS;
  try {
    const parsed: SiteSettings = JSON.parse(settings);
    const packages = (parsed.packages && parsed.packages.length > 0 ? parsed.packages : PACKAGES).map(pkg => ({
      ...pkg,
      image: getPackageImage(pkg.id, pkg.image)
    }));
    return {
      ...DEFAULT_SITE_SETTINGS,
      ...parsed,
      packages
    };
  } catch (e) {
    return DEFAULT_SITE_SETTINGS;
  }
};

export const saveSiteSettings = (settings: SiteSettings) => {
  const normalizedPackages = (settings.packages || PACKAGES).map(pkg => ({
    ...pkg,
    image: getPackageImage(pkg.id, pkg.image)
  }));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, packages: normalizedPackages }));
};

export const getStoreUsers = (): User[] => {
  const usersStr = localStorage.getItem(USERS_KEY);
  if (!usersStr) return [];
  try {
    const users: User[] = JSON.parse(usersStr);
    return users.map(u => {
      const user: User = {
        ...u,
        withdrawals: Array.isArray(u.withdrawals) ? u.withdrawals : [],
        supportMessages: Array.isArray(u.supportMessages) ? u.supportMessages : []
      };
      // If user previously completed a capital withdrawal and then bought a new plan,
      // ensure older investments before capital withdrawal are Completed and old commitmentProgress is wiped
      const capWds = user.withdrawals.filter(
        w => (w.type === 'Capital + Dividend' || w.type === 'Capital Return') && w.status !== 'Rejected'
      );
      if (capWds.length > 0) {
        const lastCapTime = Math.max(...capWds.map(w => new Date(w.date).getTime()));
        const hasNewPlan = (user.investments || []).some(inv => new Date(inv.date).getTime() > lastCapTime);
        if (hasNewPlan) {
          const newDivs = user.withdrawals.filter(
            w => w.type === 'Plan Dividend' && w.status !== 'Rejected' && new Date(w.date).getTime() > lastCapTime
          );
          if (newDivs.length === 0 && user.commitmentProgress === 100) {
            delete (user as any).commitmentProgress;
          }
        }
      }
      return user;
    });
  } catch (e) {
    return [];
  }
};

export const saveStoreUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const createStoreUser = (user: Omit<User, 'id' | 'referralCode' | 'referralCount' | 'commitmentProgress' | 'canWithdraw' | 'adminMessage' | 'investments' | 'createdAt'> & { referredBy?: string }): User => {
  const users = getStoreUsers();
  
  if (user.referredBy) {
    const referrerIndex = users.findIndex(u => u.referralCode === user.referredBy);
    if (referrerIndex !== -1) {
      users[referrerIndex].referralCount = (users[referrerIndex].referralCount || 0) + 1;
    }
  }

  const { referredBy, ...userWithoutReferredBy } = user;

  const newUser: User = {
    ...userWithoutReferredBy,
    id: Math.random().toString(36).substr(2, 9),
    referralCode: 'SAP-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    referralCount: 0,
    commitmentProgress: 0,
    canWithdraw: true,
    adminMessage: '',
    investments: [],
    withdrawals: [],
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveStoreUsers(users);
  saveUserProfileToSupabase(newUser, user.password);
  return newUser;
};

export const updateStoreUser = (updatedUser: User) => {
  const users = getStoreUsers();
  const index = users.findIndex(u => u.id === updatedUser.id);
  if (index !== -1) {
    users[index] = updatedUser;
    saveStoreUsers(users);
    saveUserProfileToSupabase(updatedUser);
  }
};

export const deleteStoreUser = (userId: string) => {
  const users = getStoreUsers();
  const filteredUsers = users.filter(u => u.id !== userId);
  saveStoreUsers(filteredUsers);
};

export const findStoreUserByEmail = (email: string): User | undefined => {
  const users = getStoreUsers();
  return users.find(u => u.email === email);
};

export interface DividendCycleStatus {
  dividendWithdrawalsCount: number;
  approvedDividendWithdrawalsCount: number;
  canWithdrawCapital: boolean;
  cycle1Done: boolean;
  cycle2Done: boolean;
  isDividendMaxedOut: boolean;
  currentCycle: 1 | 2 | 3; // 1 = first 14 days, 2 = second 14 days, 3 = both completed / capital unlocked
  cycle1Progress: number;
  cycle2Progress: number;
  activeProgress: number;
  daysElapsed: number;
}

export const getLatestCapitalWithdrawal = (user: User): Withdrawal | null => {
  const capitalWithdrawals = (user.withdrawals || []).filter(
    w => (w.type === 'Capital + Dividend' || w.type === 'Capital Return') && w.status !== 'Rejected'
  );
  if (capitalWithdrawals.length === 0) return null;
  return capitalWithdrawals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
};

export const getUserDividendWithdrawals = (user: User): Withdrawal[] => {
  const allDivWithdrawals = (user.withdrawals || []).filter(
    w => w.type === 'Plan Dividend' && w.status !== 'Rejected'
  );
  const lastCapitalWd = getLatestCapitalWithdrawal(user);
  if (!lastCapitalWd) {
    return allDivWithdrawals;
  }
  const lastCapitalTime = new Date(lastCapitalWd.date).getTime();
  // Only dividend withdrawals that were requested AFTER the latest capital withdrawal
  // belong to the new plan / current cycle
  return allDivWithdrawals.filter(w => new Date(w.date).getTime() > lastCapitalTime);
};

export const getUserCurrentActiveInvestments = (user: User): Investment[] => {
  const lastCapitalWd = getLatestCapitalWithdrawal(user);
  const lastCapitalTime = lastCapitalWd ? new Date(lastCapitalWd.date).getTime() : 0;
  
  return (user.investments || []).filter(inv => {
    if (inv.status !== 'Active') return false;
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
  const approvedDividendWithdrawalsCount = divWithdrawals.filter(w => w.status === 'Approved').length;
  const cycle1Done = dividendWithdrawalsCount >= 1;
  const cycle2Done = dividendWithdrawalsCount >= 2;
  const isDividendMaxedOut = dividendWithdrawalsCount >= 2;
  const canWithdrawCapital = cycle2Done;
  const currentCycle: 1 | 2 | 3 = cycleCountToCycle(dividendWithdrawalsCount);

  const activeInvestments = getUserCurrentActiveInvestments(user);
  
  if (activeInvestments.length === 0) {
    const manualProg = typeof user.commitmentProgress === 'number' && user.commitmentProgress >= 0 
      ? user.commitmentProgress 
      : 0;
    return {
      dividendWithdrawalsCount,
      approvedDividendWithdrawalsCount,
      canWithdrawCapital,
      cycle1Done,
      cycle2Done,
      isDividendMaxedOut,
      currentCycle,
      cycle1Progress: cycle1Done ? 100 : manualProg,
      cycle2Progress: cycle2Done ? 100 : (cycle1Done ? manualProg : 0),
      activeProgress: manualProg,
      daysElapsed: 0,
    };
  }

  // Calculate max days elapsed since admin confirmation for current active investments
  let maxDaysElapsed = 0;
  for (const inv of activeInvestments) {
    // Dividend countdown strictly begins once admin confirms payment (approvedAt)
    const approvedTime = inv.approvedAt ? new Date(inv.approvedAt).getTime() : new Date(inv.date).getTime();
    const days = Math.max(0, (Date.now() - approvedTime) / (1000 * 3600 * 24));
    if (days > maxDaysElapsed) {
      maxDaysElapsed = days;
    }
  }

  const manualProg = typeof user.commitmentProgress === 'number' && user.commitmentProgress >= 0 
    ? user.commitmentProgress 
    : null;

  // Cycle 1: First 14 days (0 to 14 days)
  let cycle1Progress = cycle1Done ? 100 : Math.min(100, Math.max(0, Math.floor((maxDaysElapsed / 14) * 100)));
  if (!cycle1Done && manualProg !== null) {
    cycle1Progress = manualProg;
  }

  // Cycle 2: Second 14 days (another 14 days)
  let cycle2Progress = 0;
  if (cycle2Done) {
    cycle2Progress = 100;
  } else if (cycle1Done) {
    // If cycle 1 is done, days in cycle 2 can be measured from the 1st dividend withdrawal or days elapsed - 14
    const firstWd = divWithdrawals[0];
    const firstWdTime = firstWd ? new Date(firstWd.date).getTime() : 0;
    const daysSinceFirstWd = firstWdTime ? (Date.now() - firstWdTime) / (1000 * 3600 * 24) : 0;
    const effectiveDays = Math.max(daysSinceFirstWd, maxDaysElapsed - 14, 0);
    cycle2Progress = Math.min(100, Math.max(0, Math.floor((effectiveDays / 14) * 100)));
    if (manualProg !== null) {
      cycle2Progress = manualProg;
    }
  }

  let activeProgress = 0;
  if (manualProg !== null) {
    activeProgress = manualProg;
  } else if (dividendWithdrawalsCount === 0) {
    activeProgress = cycle1Progress;
  } else if (dividendWithdrawalsCount === 1) {
    activeProgress = cycle2Progress;
  } else {
    activeProgress = 100;
  }

  return {
    dividendWithdrawalsCount,
    approvedDividendWithdrawalsCount,
    canWithdrawCapital,
    cycle1Done,
    cycle2Done,
    isDividendMaxedOut,
    currentCycle,
    cycle1Progress,
    cycle2Progress,
    activeProgress,
    daysElapsed: maxDaysElapsed,
  };
};

export const getUserAvailableDividend = (user: User): number => {
  const status = getDividendCycleStatus(user);
  // Dividend must stop adding up after the second withdrawal
  if (status.isDividendMaxedOut) {
    return 0;
  }
  const activeInvestments = getUserCurrentActiveInvestments(user);
  return activeInvestments.reduce((sum, i) => {
    const pkg = PACKAGES.find(p => p.id === i.packageId);
    const roi = pkg ? pkg.roi : 15;
    return sum + Math.round((i.amount * roi) / 100);
  }, 0);
};

function cycleCountToCycle(count: number): 1 | 2 | 3 {
  if (count === 0) return 1;
  if (count === 1) return 2;
  return 3;
}

export const calculateUserProgress = (user: User): number => {
  if (typeof user.commitmentProgress === 'number' && user.commitmentProgress >= 0) {
    return user.commitmentProgress;
  }
  const status = getDividendCycleStatus(user);
  return status.activeProgress;
};

export const setUserCommitmentProgress = (userId: string, progress: number | null): User | null => {
  const users = getStoreUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    if (progress === null) {
      delete (user as any).commitmentProgress;
    } else {
      user.commitmentProgress = Math.min(100, Math.max(0, Math.round(progress)));
    }
    saveStoreUsers(users);
    return user;
  }
  return null;
};

export const fastForwardInvestmentDays = (userId: string, investmentId: string, daysAgo: number): User | null => {
  const users = getStoreUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    const inv = user.investments.find(i => i.id === investmentId);
    if (inv) {
      const pastTime = new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();
      inv.approvedAt = pastTime;
      inv.date = pastTime;
      if (inv.status === 'Pending') {
        inv.status = 'Active';
      }
      saveStoreUsers(users);
      return user;
    }
  }
  return null;
};

export const approveUserInvestment = (userId: string, investmentId: string) => {
  const users = getStoreUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    const investment = user.investments.find(i => i.id === investmentId);
    if (investment && investment.status === 'Pending') {
      const confirmationTime = new Date();
      investment.status = 'Active';
      investment.approvedAt = confirmationTime.toISOString();

      // Recalculate 14-day duration strictly starting from this confirmation timestamp
      const pkg = PACKAGES.find(p => p.id === investment.packageId);
      const durationDays = pkg ? pkg.durationDays : 14;
      const maturity = new Date(confirmationTime.getTime() + durationDays * 24 * 3600 * 1000);
      investment.withdrawalDate = maturity.toISOString();

      // Reset any manual progress override so dynamic 14-day cycle starts freshly from confirmation
      delete (user as any).commitmentProgress;

      // Send support message notification to investor
      if (!Array.isArray(user.supportMessages)) {
        user.supportMessages = [];
      }
      user.supportMessages.push({
        id: Math.random().toString(36).substring(2, 10),
        sender: 'admin',
        text: `Payment Confirmed! Your payment of ₦${investment.amount.toLocaleString()} for ${investment.packageName} has been verified and confirmed. Your 14-day dividend cycle has officially started counting today!`,
        timestamp: confirmationTime.toISOString(),
        read: false
      });
      user.adminMessage = `Payment confirmed for ${investment.packageName}! Your 14-day dividend cycle is active and now counting.`;

      saveStoreUsers(users);
      saveInvestmentToSupabase(investment, user.id);
      saveUserProfileToSupabase(user);
      return user;
    }
  }
  return null;
};

export const addInvestmentToUser = (userId: string, investment: Omit<Investment, 'id'>) => {
  const users = getStoreUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    // Check if user previously withdrew capital (completing 1st & 2nd dividend + capital cycle)
    const lastCapitalWd = getLatestCapitalWithdrawal(user);

    // If user previously withdrew their capital, wipe the old dividend commitment progress information
    if (lastCapitalWd) {
      delete (user as any).commitmentProgress;
      // Mark all prior investments as Completed so they do not bleed into the new plan
      if (Array.isArray(user.investments)) {
        user.investments.forEach(inv => {
          if (inv.status === 'Active') {
            inv.status = 'Completed';
          }
        });
      }
    }

    const newInvestment: Investment = {
      ...investment,
      id: Math.random().toString(36).substr(2, 9),
    };
    if (!Array.isArray(user.investments)) {
      user.investments = [];
    }
    user.investments.push(newInvestment);
    saveStoreUsers(users);
    saveInvestmentToSupabase(newInvestment, user.id);
    saveUserProfileToSupabase(user);

    // Notify Admin of new payment submission
    addAdminNotification({
      type: 'NEW_PAYMENT',
      title: 'New Plan Payment Received',
      message: `${user.accountName} made a payment of ₦${newInvestment.amount.toLocaleString()} for ${newInvestment.packageName}. Proof of payment has been uploaded and is waiting for your verification.`,
      investorName: user.accountName,
      investorEmail: user.email,
      investorPhone: user.phone,
      amount: newInvestment.amount,
      packageName: newInvestment.packageName,
      investmentId: newInvestment.id,
      userId: user.id,
      linkTab: 'investments'
    });

    return user;
  }
  return null;
};

export const addWithdrawalToUser = (
  userId: string,
  withdrawal: Omit<Withdrawal, 'id' | 'reference' | 'date'>
): { user: User; withdrawal: Withdrawal } | null => {
  const users = getStoreUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return null;

  const newWithdrawal: Withdrawal = {
    ...withdrawal,
    id: Math.random().toString(36).substr(2, 9),
    reference: 'WD-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    date: new Date().toISOString(),
  };

  if (!Array.isArray(user.withdrawals)) {
    user.withdrawals = [];
  }
  user.withdrawals.unshift(newWithdrawal);
  user.lastWithdrawalDate = newWithdrawal.date;

  // When capital is withdrawn, mark all currently active investments as Completed
  if (withdrawal.type === 'Capital + Dividend' || withdrawal.type === 'Capital Return') {
    if (Array.isArray(user.investments)) {
      user.investments.forEach(inv => {
        if (inv.status === 'Active') {
          inv.status = 'Completed';
        }
      });
    }
  }

  saveStoreUsers(users);
  saveWithdrawalToSupabase(newWithdrawal);
  saveUserProfileToSupabase(user);

  // Notify Admin of withdrawal request
  addAdminNotification({
    type: 'NEW_WITHDRAWAL',
    title: 'New Withdrawal Requested',
    message: `${user.accountName} requested a payout of ₦${newWithdrawal.amount.toLocaleString()} (${newWithdrawal.type}) to ${newWithdrawal.bankName}.`,
    investorName: user.accountName,
    investorEmail: user.email,
    investorPhone: user.phone,
    amount: newWithdrawal.amount,
    userId: user.id,
    linkTab: 'withdrawals'
  });

  return { user, withdrawal: newWithdrawal };
};

export const updateWithdrawalStatus = (
  userId: string,
  withdrawalId: string,
  status: 'Pending' | 'Approved' | 'Rejected',
  adminNote?: string
): User | null => {
  const users = getStoreUsers();
  const user = users.find(u => u.id === userId);
  if (!user || !Array.isArray(user.withdrawals)) return null;

  const withdrawal = user.withdrawals.find(w => w.id === withdrawalId);
  if (withdrawal) {
    withdrawal.status = status;
    if (adminNote !== undefined) {
      withdrawal.adminNote = adminNote;
    }
    saveStoreUsers(users);
    saveWithdrawalToSupabase(withdrawal);
    saveUserProfileToSupabase(user);
    return user;
  }
  return null;
};

export const getAllWithdrawals = (): (Withdrawal & { user: User })[] => {
  const users = getStoreUsers();
  const list: (Withdrawal & { user: User })[] = [];
  users.forEach(u => {
    (u.withdrawals || []).forEach(w => {
      list.push({
        ...w,
        userName: w.userName || u.accountName,
        userEmail: w.userEmail || u.email,
        bankName: w.bankName || u.bankName,
        accountNumber: w.accountNumber || u.accountNumber,
        accountName: w.accountName || u.accountName,
        user: u
      });
    });
  });
  return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const ADMIN_CREDENTIALS_KEY = 'zaru_admin_credentials';

export interface AdminCredentials {
  username: string;
  password: string;
  recoveryEmail: string;
  recoveryKey: string;
}

export const DEFAULT_ADMIN_CREDENTIALS: AdminCredentials = {
  username: 'Zaru2026@',
  password: 'Zazaru2026@$',
  recoveryEmail: 'admin@zarufarms.ng',
  recoveryKey: 'ZARU-ADMIN-2026'
};

export const getAdminCredentials = (): AdminCredentials => {
  const data = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
  if (!data) return DEFAULT_ADMIN_CREDENTIALS;
  try {
    return { ...DEFAULT_ADMIN_CREDENTIALS, ...JSON.parse(data) };
  } catch (e) {
    return DEFAULT_ADMIN_CREDENTIALS;
  }
};

export const updateAdminCredentials = (credentials: Partial<AdminCredentials>): AdminCredentials => {
  const current = getAdminCredentials();
  const updated = { ...current, ...credentials };
  localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(updated));
  return updated;
};

// -------------------------------------------------------------
// USER <-> ADMIN COMMUNICATION SUPPORT
// -------------------------------------------------------------

export const addUserSupportMessage = (
  userId: string, 
  text?: string, 
  image?: string, 
  imageName?: string
): User | null => {
  const hasText = !!(text && text.trim().length > 0);
  const hasImage = !!(image && image.trim().length > 0);
  if (!hasText && !hasImage) return null;

  const users = getStoreUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return null;

  if (!Array.isArray(user.supportMessages)) {
    user.supportMessages = [];
  }

  const newMsg: SupportMessage = {
    id: Math.random().toString(36).substring(2, 10),
    sender: 'user',
    text: hasText ? text!.trim() : undefined,
    image: hasImage ? image : undefined,
    imageName: imageName || undefined,
    timestamp: new Date().toISOString(),
    read: false
  };

  user.supportMessages.push(newMsg);
  saveStoreUsers(users);
  saveSupportMessageToSupabase(newMsg, user.id);

  // Notify Admin of message/inquiry
  addAdminNotification({
    type: 'NEW_MESSAGE',
    title: `New Message from ${user.accountName}`,
    message: hasText 
      ? (text!.length > 60 ? text!.substring(0, 60) + '...' : text!) 
      : 'Sent an image attachment',
    investorName: user.accountName,
    investorEmail: user.email,
    investorPhone: user.phone,
    userId: user.id,
    linkTab: 'messages'
  });

  return user;
};

export const addAdminSupportMessage = (
  userId: string, 
  text?: string, 
  image?: string, 
  imageName?: string
): User | null => {
  const hasText = !!(text && text.trim().length > 0);
  const hasImage = !!(image && image.trim().length > 0);
  if (!hasText && !hasImage) return null;

  const users = getStoreUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return null;

  if (!Array.isArray(user.supportMessages)) {
    user.supportMessages = [];
  }

  const newMsg: SupportMessage = {
    id: Math.random().toString(36).substring(2, 10),
    sender: 'admin',
    text: hasText ? text!.trim() : undefined,
    image: hasImage ? image : undefined,
    imageName: imageName || undefined,
    timestamp: new Date().toISOString(),
    read: false
  };

  user.supportMessages.push(newMsg);
  if (hasText) {
    user.adminMessage = text!.trim(); // sync with adminMessage for backwards compatibility
  }
  saveStoreUsers(users);
  saveSupportMessageToSupabase(newMsg, user.id);
  saveUserProfileToSupabase(user);
  return user;
};

export const markUserMessagesAsRead = (userId: string, viewer: 'admin' | 'user'): User | null => {
  const users = getStoreUsers();
  const user = users.find(u => u.id === userId);
  if (!user || !Array.isArray(user.supportMessages)) return null;

  let changed = false;
  user.supportMessages.forEach(msg => {
    // If viewer is admin, mark user messages as read
    if (viewer === 'admin' && msg.sender === 'user' && !msg.read) {
      msg.read = true;
      changed = true;
    }
    // If viewer is user, mark admin messages as read
    if (viewer === 'user' && msg.sender === 'admin' && !msg.read) {
      msg.read = true;
      changed = true;
    }
  });

  if (changed) {
    saveStoreUsers(users);
  }
  return user;
};

export const deleteSupportMessage = (userId: string, messageId: string): User | null => {
  const users = getStoreUsers();
  const user = users.find(u => u.id === userId);
  if (!user || !Array.isArray(user.supportMessages)) return null;

  user.supportMessages = user.supportMessages.filter(m => m.id !== messageId);
  saveStoreUsers(users);
  return user;
};

export const clearUserSupportMessages = (userId: string): User | null => {
  const users = getStoreUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return null;

  user.supportMessages = [];
  saveStoreUsers(users);
  return user;
};

// -------------------------------------------------------------
// ADMIN NOTIFICATIONS HUB
// -------------------------------------------------------------

export const getAdminNotifications = (): AdminNotification[] => {
  const str = localStorage.getItem(ADMIN_NOTIFICATIONS_KEY);
  if (!str) return [];
  try {
    return JSON.parse(str);
  } catch (e) {
    return [];
  }
};

export const saveAdminNotifications = (notifications: AdminNotification[]) => {
  localStorage.setItem(ADMIN_NOTIFICATIONS_KEY, JSON.stringify(notifications));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('saposa_admin_notifications_updated'));
  }
};

export const addAdminNotification = (
  notif: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>
): AdminNotification => {
  const list = getAdminNotifications();
  const newNotif: AdminNotification = {
    ...notif,
    id: Math.random().toString(36).substring(2, 10),
    timestamp: new Date().toISOString(),
    read: false
  };

  list.unshift(newNotif);
  // Keep up to 100 recent notifications
  const trimmed = list.slice(0, 100);
  saveAdminNotifications(trimmed);
  saveAdminNotificationToSupabase(newNotif);

  // If browser notification permission is granted, notify outside browser window too
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`[ZARU ADMIN] ${newNotif.title}`, {
        body: newNotif.message
      });
    } catch (e) {}
  }

  return newNotif;
};

export const markAdminNotificationAsRead = (id: string) => {
  const list = getAdminNotifications();
  const item = list.find(n => n.id === id);
  if (item && !item.read) {
    item.read = true;
    saveAdminNotifications(list);
  }
};

export const markAllAdminNotificationsAsRead = () => {
  const list = getAdminNotifications();
  let changed = false;
  list.forEach(n => {
    if (!n.read) {
      n.read = true;
      changed = true;
    }
  });
  if (changed) {
    saveAdminNotifications(list);
  }
};

export const deleteAdminNotification = (id: string) => {
  const list = getAdminNotifications().filter(n => n.id !== id);
  saveAdminNotifications(list);
};

export const clearAdminNotifications = () => {
  saveAdminNotifications([]);
};

// -------------------------------------------------------------
// SUPABASE FULL HYDRATION & REALTIME SYNC
// -------------------------------------------------------------

export const syncStoreWithSupabase = async () => {
  try {
    const { users, notifications, siteSettings } = await fetchAllDataFromSupabase();

    if (users && users.length > 0) {
      // Merge remote users with local users, preserving passwords
      const localUsers = getStoreUsers();
      const mergedUsers: User[] = [...localUsers];

      users.forEach(remoteUser => {
        const localIndex = mergedUsers.findIndex(u => u.id === remoteUser.id || u.email === remoteUser.email);
        if (localIndex >= 0) {
          mergedUsers[localIndex] = {
            ...remoteUser,
            password: mergedUsers[localIndex].password || remoteUser.password
          };
        } else {
          mergedUsers.push(remoteUser);
        }
      });

      saveStoreUsers(mergedUsers);
    }

    if (notifications && notifications.length > 0) {
      const localNotifs = getAdminNotifications();
      const notifMap = new Map<string, AdminNotification>();
      localNotifs.forEach(n => notifMap.set(n.id, n));
      notifications.forEach(n => notifMap.set(n.id, n));
      const combined = Array.from(notifMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      saveAdminNotifications(combined.slice(0, 100));
    }

    if (siteSettings) {
      saveSiteSettings(siteSettings);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('saposa_store_synced'));
    }
  } catch (err) {
    console.warn('Initial Supabase sync completed with warning:', err);
  }
};

export const initSupabaseSync = () => {
  // 1. Initial fetch from Supabase
  syncStoreWithSupabase();

  // 2. Set up real-time postgres changes listener
  const unsubscribe = setupSupabaseRealtimeSubscriptions(() => {
    syncStoreWithSupabase();
  });

  return unsubscribe;
};


