-- ==============================================================================
-- ZARU ENTERPRISE - COMPLETE SUPABASE DATABASE SCHEMA & RLS POLICIES
-- ==============================================================================

-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. PROFILES TABLE (Linked with Supabase Auth)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    bank_name TEXT,
    account_number TEXT,
    account_name TEXT,
    referral_code TEXT UNIQUE,
    referral_count INTEGER DEFAULT 0,
    referred_by TEXT,
    commitment_progress INTEGER DEFAULT 0,
    can_withdraw BOOLEAN DEFAULT FALSE,
    referral_bonus_approved BOOLEAN DEFAULT FALSE,
    referral_bonus_requested BOOLEAN DEFAULT FALSE,
    last_bonus_withdrawal_date TIMESTAMPTZ,
    admin_message TEXT DEFAULT '',
    last_withdrawal_date TIMESTAMPTZ,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for referral code lookup
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- ==============================================================================
-- 3. INVESTMENTS TABLE (Plans & Payments)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.investments (
    id TEXT PRIMARY KEY DEFAULT ('inv_' || substr(md5(random()::text), 1, 10)),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL,
    package_name TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Active', 'Completed')),
    date TIMESTAMPTZ DEFAULT NOW(),
    withdrawal_date TIMESTAMPTZ NOT NULL,
    approved_at TIMESTAMPTZ,
    proof_of_payment TEXT,
    proof_file_name TEXT,
    proof_file_type TEXT,
    proof_file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON public.investments(status);

-- ==============================================================================
-- 4. WITHDRAWALS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id TEXT PRIMARY KEY DEFAULT ('wd_' || substr(md5(random()::text), 1, 10)),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Plan Dividend', 'Capital + Dividend', 'Capital Return', 'Referral Bonus', 'General Withdrawal')),
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    reference TEXT NOT NULL,
    admin_note TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);

-- ==============================================================================
-- 5. SUPPORT MESSAGES (Live Support Chat)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.support_messages (
    id TEXT PRIMARY KEY DEFAULT ('msg_' || substr(md5(random()::text), 1, 10)),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'admin')),
    text TEXT,
    image TEXT,
    image_name TEXT,
    read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON public.support_messages(user_id);

-- ==============================================================================
-- 6. ADMIN NOTIFICATIONS TABLE (Real-time Payment & Withdrawal Alerts)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id TEXT PRIMARY KEY DEFAULT ('notif_' || substr(md5(random()::text), 1, 10)),
    type TEXT NOT NULL CHECK (type IN ('NEW_PAYMENT', 'NEW_WITHDRAWAL', 'NEW_MESSAGE', 'NEW_USER')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    investor_name TEXT NOT NULL,
    investor_email TEXT NOT NULL,
    investor_phone TEXT,
    amount NUMERIC(15, 2),
    package_name TEXT,
    investment_id TEXT,
    user_id UUID,
    read BOOLEAN DEFAULT FALSE,
    link_tab TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON public.admin_notifications(read);

-- ==============================================================================
-- 7. SITE SETTINGS TABLE (Dynamic Hero, Content & Packages)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    hero_tagline TEXT NOT NULL,
    hero_title1 TEXT NOT NULL,
    hero_title_highlight TEXT NOT NULL,
    hero_subtitle TEXT NOT NULL,
    hero_image TEXT NOT NULL,
    about_text TEXT NOT NULL,
    packages JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Site Settings
INSERT INTO public.site_settings (
    id,
    hero_tagline,
    hero_title1,
    hero_title_highlight,
    hero_subtitle,
    hero_image,
    about_text,
    packages
) VALUES (
    'current',
    'SECURE AGRICULTURAL PLANS IN NIGERIA',
    'Grow Your Wealth\nWith ',
    'Nature.',
    'ZARU ENTERPRISE offers high-yield, secure, and transparent agricultural plan opportunities designed for the modern Nigerian investor.',
    'https://images.unsplash.com/photo-1592982537447-6f2334208f34?auto=format&fit=crop&q=80',
    'We believe in the power of agriculture to transform lives and communities. By connecting capital to carefully managed farming operations, we ensure food security while providing our users with consistent, reliable returns. Our expert team handles everything from cultivation to market sales.',
    '[
      {"id": "snail", "name": "Snail Plan", "minInvestment": 30000, "roi": 15, "durationDays": 14, "description": "High-yield snail farming with low mortality rate and high market demand."},
      {"id": "fish", "name": "Fish Plan", "minInvestment": 100000, "roi": 15, "durationDays": 14, "description": "Catfish and Tilapia aquaculture in controlled environments for maximum growth."},
      {"id": "poultry", "name": "Poultry Plan", "minInvestment": 200000, "roi": 20, "durationDays": 14, "description": "Broiler production cycles optimized for rapid returns and food security."}
    ]'::JSONB
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 8. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    gen_referral TEXT;
BEGIN
    gen_referral := 'ZARU-' || UPPER(substr(md5(random()::text), 1, 6));

    INSERT INTO public.profiles (
        id,
        email,
        phone,
        bank_name,
        account_number,
        account_name,
        referral_code,
        referred_by,
        is_admin
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'bankName', ''),
        COALESCE(NEW.raw_user_meta_data->>'accountNumber', ''),
        COALESCE(NEW.raw_user_meta_data->>'accountName', ''),
        gen_referral,
        NEW.raw_user_meta_data->>'referredBy',
        COALESCE((NEW.raw_user_meta_data->>'isAdmin')::BOOLEAN, FALSE)
    );

    -- Increment referral count if referred
    IF NEW.raw_user_meta_data->>'referredBy' IS NOT NULL AND NEW.raw_user_meta_data->>'referredBy' <> '' THEN
        UPDATE public.profiles
        SET referral_count = referral_count + 1
        WHERE referral_code = NEW.raw_user_meta_data->>'referredBy';
    END IF;

    -- Add notification for admin
    INSERT INTO public.admin_notifications (
        type,
        title,
        message,
        investor_name,
        investor_email,
        investor_phone,
        user_id,
        link_tab
    ) VALUES (
        'NEW_USER',
        'New Investor Registered',
        COALESCE(NEW.raw_user_meta_data->>'accountName', NEW.email) || ' just joined the platform.',
        COALESCE(NEW.raw_user_meta_data->>'accountName', 'New Investor'),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        NEW.id,
        'users'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- INVESTMENTS POLICIES
CREATE POLICY "Users can view own investments" ON public.investments
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create own investment" ON public.investments
    FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admin can update investments (confirm payment)" ON public.investments
    FOR UPDATE USING (public.is_admin());

-- WITHDRAWALS POLICIES
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can request withdrawal" ON public.withdrawals
    FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admin can update withdrawals" ON public.withdrawals
    FOR UPDATE USING (public.is_admin());

-- SUPPORT MESSAGES POLICIES
CREATE POLICY "Users can read own messages" ON public.support_messages
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users and admin can insert messages" ON public.support_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ADMIN NOTIFICATIONS POLICIES
CREATE POLICY "Admin can read notifications" ON public.admin_notifications
    FOR SELECT USING (public.is_admin());

CREATE POLICY "System and users can insert admin notifications" ON public.admin_notifications
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admin can update notifications" ON public.admin_notifications
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin can delete notifications" ON public.admin_notifications
    FOR DELETE USING (public.is_admin());

-- SITE SETTINGS POLICIES
CREATE POLICY "Public can view site settings" ON public.site_settings
    FOR SELECT USING (TRUE);

CREATE POLICY "Only Admin can update site settings" ON public.site_settings
    FOR ALL USING (public.is_admin());

-- ==============================================================================
-- 10. REAL-TIME REPLICATION SETUP
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.investments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- ==============================================================================
-- 11. STORAGE BUCKET CONFIGURATION (Payment Receipts & Proofs)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload payment proofs" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Public or Authenticated can view payment proofs" ON storage.objects
    FOR SELECT USING (bucket_id = 'payment-proofs');
