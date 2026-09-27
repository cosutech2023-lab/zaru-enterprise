import { supabase } from './supabase';
import { User, Investment, Withdrawal, SupportMessage, AdminNotification, SiteSettings } from '../types';

/**
 * Maps Supabase database row to User object
 */
export const mapProfileToUser = (
  profile: any,
  investments: Investment[] = [],
  withdrawals: Withdrawal[] = [],
  supportMessages: SupportMessage[] = []
): User => {
  return {
    id: profile.id,
    email: profile.email,
    password: profile.password || '******', // Password handled securely or via Supabase Auth
    phone: profile.phone || '',
    bankName: profile.bank_name || '',
    accountNumber: profile.account_number || '',
    accountName: profile.account_name || '',
    referralCode: profile.referral_code || '',
    referralCount: profile.referral_count || 0,
    commitmentProgress: profile.commitment_progress || 0,
    canWithdraw: profile.can_withdraw ?? true,
    referralBonusApproved: profile.referral_bonus_approved ?? false,
    referralBonusRequested: profile.referral_bonus_requested ?? false,
    lastBonusWithdrawalDate: profile.last_bonus_withdrawal_date || undefined,
    adminMessage: profile.admin_message || '',
    createdAt: profile.created_at || new Date().toISOString(),
    lastWithdrawalDate: profile.last_withdrawal_date || undefined,
    investments: investments.filter(inv => (inv as any).userId === profile.id || (inv as any).user_id === profile.id),
    withdrawals: withdrawals.filter(w => w.userId === profile.id || (w as any).user_id === profile.id),
    supportMessages: supportMessages.filter(m => (m as any).userId === profile.id || (m as any).user_id === profile.id)
  };
};

/**
 * Load all users with their associated investments, withdrawals, and messages from Supabase
 */
export const fetchAllDataFromSupabase = async (): Promise<{
  users: User[];
  notifications: AdminNotification[];
  siteSettings: SiteSettings | null;
}> => {
  try {
    // 1. Fetch profiles
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (pErr) throw pErr;

    // 2. Fetch investments
    const { data: rawInvestments } = await supabase
      .from('investments')
      .select('*')
      .order('date', { ascending: false });

    // 3. Fetch withdrawals
    const { data: rawWithdrawals } = await supabase
      .from('withdrawals')
      .select('*')
      .order('date', { ascending: false });

    // 4. Fetch support messages
    const { data: rawMessages } = await supabase
      .from('support_messages')
      .select('*')
      .order('timestamp', { ascending: true });

    // 5. Fetch admin notifications
    const { data: rawNotifications } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('timestamp', { ascending: false });

    // 6. Fetch site settings
    const { data: rawSettings } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 'current')
      .maybeSingle();

    const formattedInvestments: Investment[] = (rawInvestments || []).map((inv: any) => ({
      id: inv.id,
      packageId: inv.package_id,
      packageName: inv.package_name,
      amount: Number(inv.amount),
      date: inv.date,
      withdrawalDate: inv.withdrawal_date,
      status: inv.status,
      approvedAt: inv.approved_at || undefined,
      proofOfPayment: inv.proof_of_payment || undefined,
      proofFileName: inv.proof_file_name || undefined,
      proofFileType: inv.proof_file_type || undefined,
      proofFileSize: inv.proof_file_size || undefined,
      ...({ userId: inv.user_id } as any)
    }));

    const formattedWithdrawals: Withdrawal[] = (rawWithdrawals || []).map((w: any) => ({
      id: w.id,
      userId: w.user_id,
      userName: w.user_name,
      userEmail: w.user_email,
      amount: Number(w.amount),
      type: w.type,
      bankName: w.bank_name,
      accountNumber: w.account_number,
      accountName: w.account_name,
      status: w.status,
      reference: w.reference,
      adminNote: w.admin_note || undefined,
      date: w.date
    }));

    const formattedMessages: SupportMessage[] = (rawMessages || []).map((m: any) => ({
      id: m.id,
      sender: m.sender,
      text: m.text || undefined,
      image: m.image || undefined,
      imageName: m.image_name || undefined,
      timestamp: m.timestamp,
      read: m.read,
      ...({ userId: m.user_id } as any)
    }));

    const formattedNotifications: AdminNotification[] = (rawNotifications || []).map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      investorName: n.investor_name,
      investorEmail: n.investor_email,
      investorPhone: n.investor_phone || undefined,
      amount: n.amount ? Number(n.amount) : undefined,
      packageName: n.package_name || undefined,
      investmentId: n.investment_id || undefined,
      userId: n.user_id || undefined,
      timestamp: n.timestamp,
      read: n.read,
      linkTab: n.link_tab || undefined
    }));

    const users: User[] = (profiles || []).map(p => 
      mapProfileToUser(p, formattedInvestments, formattedWithdrawals, formattedMessages)
    );

    let siteSettings: SiteSettings | null = null;
    if (rawSettings) {
      siteSettings = {
        heroTagline: rawSettings.hero_tagline,
        heroTitle1: rawSettings.hero_title1,
        heroTitleHighlight: rawSettings.hero_title_highlight,
        heroSubtitle: rawSettings.hero_subtitle,
        heroImage: rawSettings.hero_image,
        aboutText: rawSettings.about_text,
        packages: rawSettings.packages
      };
    }

    return {
      users,
      notifications: formattedNotifications,
      siteSettings
    };
  } catch (err) {
    console.warn('Could not fetch all data from Supabase, relying on local cache:', err);
    return { users: [], notifications: [], siteSettings: null };
  }
};

/**
 * Upsert User Profile into Supabase
 */
export const saveUserProfileToSupabase = async (user: User, rawPassword?: string) => {
  try {
    const payload: any = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      bank_name: user.bankName,
      account_number: user.accountNumber,
      account_name: user.accountName,
      referral_code: user.referralCode,
      referral_count: user.referralCount,
      commitment_progress: user.commitmentProgress,
      can_withdraw: user.canWithdraw,
      referral_bonus_approved: user.referralBonusApproved ?? false,
      referral_bonus_requested: user.referralBonusRequested ?? false,
      last_bonus_withdrawal_date: user.lastBonusWithdrawalDate || null,
      admin_message: user.adminMessage || '',
      last_withdrawal_date: user.lastWithdrawalDate || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('profiles').upsert(payload);
    if (error) {
      console.warn('Error saving profile to Supabase:', error.message);
    }
  } catch (e) {
    console.warn('Profile sync error:', e);
  }
};

/**
 * Save new or updated Investment to Supabase
 */
export const saveInvestmentToSupabase = async (investment: Investment, userId: string) => {
  try {
    const payload = {
      id: investment.id,
      user_id: userId,
      package_id: investment.packageId,
      package_name: investment.packageName,
      amount: investment.amount,
      status: investment.status,
      date: investment.date,
      withdrawal_date: investment.withdrawalDate,
      approved_at: investment.approvedAt || null,
      proof_of_payment: investment.proofOfPayment || null,
      proof_file_name: investment.proofFileName || null,
      proof_file_type: investment.proofFileType || null,
      proof_file_size: investment.proofFileSize || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('investments').upsert(payload);
    if (error) {
      console.warn('Error saving investment to Supabase:', error.message);
    }
  } catch (e) {
    console.warn('Investment sync error:', e);
  }
};

/**
 * Save new or updated Withdrawal to Supabase
 */
export const saveWithdrawalToSupabase = async (withdrawal: Withdrawal) => {
  try {
    const payload = {
      id: withdrawal.id,
      user_id: withdrawal.userId,
      user_name: withdrawal.userName,
      user_email: withdrawal.userEmail,
      amount: withdrawal.amount,
      type: withdrawal.type,
      bank_name: withdrawal.bankName,
      account_number: withdrawal.accountNumber,
      account_name: withdrawal.accountName,
      status: withdrawal.status,
      reference: withdrawal.reference,
      admin_note: withdrawal.adminNote || null,
      date: withdrawal.date,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('withdrawals').upsert(payload);
    if (error) {
      console.warn('Error saving withdrawal to Supabase:', error.message);
    }
  } catch (e) {
    console.warn('Withdrawal sync error:', e);
  }
};

/**
 * Save Support Message to Supabase
 */
export const saveSupportMessageToSupabase = async (msg: SupportMessage, userId: string) => {
  try {
    const payload = {
      id: msg.id,
      user_id: userId,
      sender: msg.sender,
      text: msg.text || null,
      image: msg.image || null,
      image_name: msg.imageName || null,
      read: Boolean(msg.read),
      timestamp: msg.timestamp
    };

    const { error } = await supabase.from('support_messages').upsert(payload);
    if (error) {
      console.warn('Error saving message to Supabase:', error.message);
    }
  } catch (e) {
    console.warn('Support message sync error:', e);
  }
};

/**
 * Save Admin Notification to Supabase
 */
export const saveAdminNotificationToSupabase = async (notif: AdminNotification) => {
  try {
    const payload = {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      investor_name: notif.investorName,
      investor_email: notif.investorEmail,
      investor_phone: notif.investorPhone || null,
      amount: notif.amount || null,
      package_name: notif.packageName || null,
      investment_id: notif.investmentId || null,
      user_id: notif.userId || null,
      read: notif.read,
      link_tab: notif.linkTab || null,
      timestamp: notif.timestamp
    };

    const { error } = await supabase.from('admin_notifications').upsert(payload);
    if (error) {
      console.warn('Error saving notification to Supabase:', error.message);
    }
  } catch (e) {
    console.warn('Notification sync error:', e);
  }
};

/**
 * Upload Payment Proof / Attachment to Supabase Storage
 */
export const uploadProofToSupabaseStorage = async (
  fileDataUrl: string,
  fileName: string
): Promise<string | null> => {
  try {
    // Convert base64 data URL to Blob
    const response = await fetch(fileDataUrl);
    const blob = await response.blob();

    const fileExt = fileName.split('.').pop() || 'jpg';
    const filePath = `receipts/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const { error } = await supabase.storage
      .from('payment-proofs')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.warn('Storage upload error (fallback to data URL):', error.message);
      return fileDataUrl;
    }

    const { data } = supabase.storage.from('payment-proofs').getPublicUrl(filePath);
    return data.publicUrl || fileDataUrl;
  } catch (err) {
    console.warn('Failed to upload proof to storage bucket, using data URL fallback:', err);
    return fileDataUrl;
  }
};

/**
 * Set up real-time listener across Supabase tables
 */
export const setupSupabaseRealtimeSubscriptions = (onUpdate: () => void) => {
  try {
    const channel = supabase
      .channel('zaru-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investments' }, () => {
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => {
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => {
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_notifications' }, () => {
        onUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.warn('Realtime subscription not supported in current context:', e);
    return () => {};
  }
};
