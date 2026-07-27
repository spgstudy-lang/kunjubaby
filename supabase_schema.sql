-- ============================================================
-- Kunju Baby Tracker - Complete Supabase Schema
-- Run this entire script in Supabase SQL Editor (safe to re-run)
-- ============================================================

-- 1. Users Auth Table
CREATE TABLE IF NOT EXISTS public.users_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users Profile Table
CREATE TABLE IF NOT EXISTS public.users_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_auth(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'wife', -- 'husband' | 'wife' | 'admin'
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Scans Table
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_auth(id) ON DELETE CASCADE,
    scan_date TEXT NOT NULL,
    weeks INT DEFAULT 0,
    days INT DEFAULT 0,
    crl_measurement NUMERIC DEFAULT 0,
    heart_rate INT DEFAULT 0,
    estimated_due_date TEXT,
    notes TEXT,
    image_url TEXT,
    image_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_auth(id) ON DELETE CASCADE,
    doctor_name TEXT,
    clinic_hospital_name TEXT,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT,
    purpose TEXT,
    notes TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Finances Table
CREATE TABLE IF NOT EXISTS public.finances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_auth(id) ON DELETE CASCADE,
    expense_type TEXT,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    expense_date TEXT NOT NULL,
    category TEXT,
    payment_method TEXT,
    notes TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Shopping List Table
CREATE TABLE IF NOT EXISTS public.shopping_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_auth(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category TEXT,
    estimated_cost NUMERIC DEFAULT 0,
    priority TEXT DEFAULT 'medium',
    is_purchased BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Hospital Bag Checklist Table
CREATE TABLE IF NOT EXISTS public.hospital_bag_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_auth(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    is_packed BOOLEAN DEFAULT FALSE,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Journal Notes Table
CREATE TABLE IF NOT EXISTS public.journal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_auth(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    mood TEXT,
    symptoms JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Reminders Table
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_auth(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    reminder_date TEXT NOT NULL,
    reminder_time TEXT,
    category TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name TEXT,
    user_role TEXT,
    activity_type TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Baby Gallery Table
CREATE TABLE IF NOT EXISTS public.baby_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_auth(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    caption TEXT,
    photo_url TEXT NOT NULL,
    storage_path TEXT,
    storage_provider TEXT DEFAULT 'supabase',
    milestone_week TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. General Folders Table
CREATE TABLE IF NOT EXISTS public.general_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_auth(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT 'teal',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. General Notes Table
CREATE TABLE IF NOT EXISTS public.general_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_auth(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.general_folders(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    color TEXT DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.users_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_bag_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baby_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_notes ENABLE ROW LEVEL SECURITY;

-- Full public access policies (server uses service role key - bypasses RLS anyway)
DROP POLICY IF EXISTS "Allow public full access" ON public.users_auth;
CREATE POLICY "Allow public full access" ON public.users_auth FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access" ON public.users_profile;
CREATE POLICY "Allow public full access" ON public.users_profile FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access" ON public.scans;
CREATE POLICY "Allow public full access" ON public.scans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access" ON public.appointments;
CREATE POLICY "Allow public full access" ON public.appointments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access" ON public.finances;
CREATE POLICY "Allow public full access" ON public.finances FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access" ON public.shopping_list;
CREATE POLICY "Allow public full access" ON public.shopping_list FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access" ON public.hospital_bag_checklist;
CREATE POLICY "Allow public full access" ON public.hospital_bag_checklist FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access" ON public.journal_notes;
CREATE POLICY "Allow public full access" ON public.journal_notes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access" ON public.reminders;
CREATE POLICY "Allow public full access" ON public.reminders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access" ON public.activity_logs;
CREATE POLICY "Allow public full access" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access" ON public.baby_gallery;
CREATE POLICY "Allow public full access" ON public.baby_gallery FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access" ON public.general_folders;
CREATE POLICY "Allow public full access" ON public.general_folders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public full access" ON public.general_notes;
CREATE POLICY "Allow public full access" ON public.general_notes FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Seed Admin User (safe to re-run)
-- Email: syam@gmail.com | Password: 225500
-- SHA256 hash of "225500"
-- ============================================================
DO $$
DECLARE
    v_admin_user_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
    v_admin_profile_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
BEGIN
    -- Insert admin auth if not exists
    IF NOT EXISTS (SELECT 1 FROM public.users_auth WHERE id = v_admin_user_id) THEN
        INSERT INTO public.users_auth (id, email, password_hash)
        VALUES (v_admin_user_id, 'syam@gmail.com', '7fbc2867851978eb32c4bca2e05a80530ffbe1f1bbfed12521c7c9071a9a8385');
    END IF;

    -- Insert admin profile if not exists
    IF NOT EXISTS (SELECT 1 FROM public.users_profile WHERE id = v_admin_profile_id) THEN
        INSERT INTO public.users_profile (id, user_id, name, role, email)
        VALUES (v_admin_profile_id, v_admin_user_id, 'Syam (Admin)', 'admin', 'syam@gmail.com');
    END IF;
END $$;
