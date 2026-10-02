import snailImg from './assets/images/snail_investment_1788965586330.jpg';
import fishImg from './assets/images/fish_investment_1788965609287.jpg';
import poultryImg from './assets/images/poultry_investment_1788965621357.jpg';

export { snailImg, fishImg, poultryImg };

export const PACKAGE_IMAGES: Record<string, string> = {
  snail: snailImg,
  fish: fishImg,
  poultry: poultryImg,
};

export const getPackageImage = (packageId?: string, fallbackUrl?: string): string => {
  if (packageId) {
    const normalized = packageId.toLowerCase();
    if (normalized.includes('snail') || normalized === 'snail') {
      return (fallbackUrl && fallbackUrl.startsWith('data:image')) ? fallbackUrl : snailImg;
    }
    if (normalized.includes('fish') || normalized === 'fish') {
      return (fallbackUrl && fallbackUrl.startsWith('data:image')) ? fallbackUrl : fishImg;
    }
    if (normalized.includes('poultry') || normalized.includes('bird') || normalized === 'poultry') {
      return (fallbackUrl && fallbackUrl.startsWith('data:image')) ? fallbackUrl : poultryImg;
    }
  }
  if (fallbackUrl && fallbackUrl.trim().length > 0 && !fallbackUrl.includes('undefined')) {
    return fallbackUrl;
  }
  return snailImg;
};

export interface SupportMessage {
  id: string;
  sender: 'user' | 'admin';
  text?: string;
  image?: string;
  imageName?: string;
  timestamp: string;
  read?: boolean;
}

export interface AdminNotification {
  id: string;
  type: 'NEW_PAYMENT' | 'NEW_WITHDRAWAL' | 'NEW_MESSAGE' | 'NEW_USER';
  title: string;
  message: string;
  investorName: string;
  investorEmail: string;
  investorPhone?: string;
  amount?: number;
  packageName?: string;
  investmentId?: string;
  userId?: string;
  timestamp: string;
  read: boolean;
  linkTab?: 'investments' | 'withdrawals' | 'messages' | 'users';
}

export interface User {
  id: string;
  email: string;
  password?: string;
  phone: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  referralCode: string;
  referralCount: number;
  commitmentProgress: number;
  canWithdraw: boolean;
  referralBonusApproved?: boolean;
  referralBonusRequested?: boolean;
  lastBonusWithdrawalDate?: string;
  adminMessage: string;
  investments: Investment[];
  createdAt: string;
  lastWithdrawalDate?: string;
  withdrawals?: Withdrawal[];
  supportMessages?: SupportMessage[];
}

export interface Withdrawal {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  type: 'Plan Dividend' | 'Capital + Dividend' | 'Capital Return' | 'Referral Bonus' | 'General Withdrawal';
  bankName: string;
  accountNumber: string;
  accountName: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reference: string;
  adminNote?: string;
}

export interface Investment {
  id: string;
  packageId: string;
  packageName: string;
  amount: number;
  date: string;
  withdrawalDate: string;
  proofOfPayment?: string;
  proofFileName?: string;
  proofFileType?: string;
  proofFileSize?: number;
  status: 'Pending' | 'Active' | 'Completed';
  approvedAt?: string;
}

export interface Package {
  id: string;
  name: string;
  minInvestment: number;
  roi: number;
  durationDays: number;
  image: string;
  description: string;
}

export const PACKAGES: Package[] = [
  {
    id: 'snail',
    name: 'Snail Plan',
    minInvestment: 30000,
    roi: 15,
    durationDays: 14,
    image: snailImg,
    description: 'High-yield snail farming with low mortality rate and high market demand.'
  },
  {
    id: 'fish',
    name: 'Fish Plan',
    minInvestment: 100000,
    roi: 15,
    durationDays: 14,
    image: fishImg,
    description: 'Catfish and Tilapia aquaculture in controlled environments for maximum growth.'
  },
  {
    id: 'poultry',
    name: 'Poultry Plan',
    minInvestment: 200000,
    roi: 20,
    durationDays: 14,
    image: poultryImg,
    description: 'Broiler production cycles optimized for rapid returns and food security.'
  }
];

export interface SiteSettings {
  heroTagline: string;
  heroTitle1: string;
  heroTitleHighlight: string;
  heroSubtitle: string;
  heroImage: string;
  aboutText: string;
  packages: Package[];
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  heroTagline: "SECURE AGRICULTURAL PLANS IN NIGERIA",
  heroTitle1: "Grow Your Wealth\nWith ",
  heroTitleHighlight: "Nature.",
  heroSubtitle: "ZARU ENTERPRISE offers high-yield, secure, and transparent agricultural plan opportunities designed for the modern Nigerian investor.",
  heroImage: "https://images.unsplash.com/photo-1592982537447-6f2334208f34?auto=format&fit=crop&q=80",
  aboutText: "We believe in the power of agriculture to transform lives and communities. By connecting capital to carefully managed farming operations, we ensure food security while providing our users with consistent, reliable returns. Our expert team handles everything from cultivation to market sales.",
  packages: PACKAGES
};
