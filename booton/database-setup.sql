-- BootOn Database Schema
-- Run this in Supabase SQL Editor

-- Note: This script uses CREATE TABLE IF NOT EXISTS to preserve existing data
-- If you need to reset all tables, manually delete them in Supabase first

-- Create users table with extended fields for coaches
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'student')),
    is_blocked BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE, -- Students: always TRUE, Coaches: require admin approval
    experience TEXT,
    payment_fee TEXT,
    achievements TEXT,
    position TEXT,
    profile_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Admin can update all users" ON public.users;
DROP POLICY IF EXISTS "Admin can delete users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own user record" ON public.users;
DROP POLICY IF EXISTS "Admin can read all users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read users" ON public.users;

-- RLS Policies for users table
-- Allow users to read their own data
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own data
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Allow admins to update any user (for approvals and management)
-- Note: Admin check done at app level to avoid RLS recursion
CREATE POLICY "Admins can update users" ON public.users
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow admins to delete users (for rejecting applications)
-- Note: Admin check done at app level to avoid RLS recursion
CREATE POLICY "Admins can delete users" ON public.users
    FOR DELETE USING (auth.role() = 'authenticated');

-- Allow all authenticated users to read (needed for app logic)
-- Admin-specific permissions checked in app code
CREATE POLICY "Authenticated users can read users" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to create their own account
CREATE POLICY "Users can insert own user record" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create messages table for real-time chat
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON public.messages;

-- Allow authenticated users to read their messages
CREATE POLICY "Users can read their messages" ON public.messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

-- Allow authenticated users to send messages (more permissive for debugging)
CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );

-- Create coach_students table for payment tracking
CREATE TABLE IF NOT EXISTS public.coach_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    payment_amount DECIMAL(10, 2),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coach_id, student_id)
);

ALTER TABLE public.coach_students ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read coach_students records" ON public.coach_students;
DROP POLICY IF EXISTS "Students can insert coach_students records" ON public.coach_students;

CREATE POLICY "Users can read coach_students records" ON public.coach_students
    FOR SELECT USING (
        auth.uid() = coach_id OR auth.uid() = student_id
    );

CREATE POLICY "Students can insert coach_students records" ON public.coach_students
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create progress_tracking table for weekly points
CREATE TABLE IF NOT EXISTS public.progress_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    week INTEGER NOT NULL,
    points DECIMAL(5, 2),
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.progress_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read progress_tracking" ON public.progress_tracking;
DROP POLICY IF EXISTS "Coaches can insert progress_tracking" ON public.progress_tracking;

CREATE POLICY "Users can read progress_tracking" ON public.progress_tracking
    FOR SELECT USING (
        auth.uid() = coach_id OR auth.uid() = student_id
    );

CREATE POLICY "Coaches can insert progress_tracking" ON public.progress_tracking
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create ratings table for coach reviews
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    rating DECIMAL(3, 1) CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coach_id, student_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read ratings" ON public.ratings;
DROP POLICY IF EXISTS "Students can insert own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Students can update own ratings" ON public.ratings;

CREATE POLICY "Users can read ratings" ON public.ratings
    FOR SELECT USING (true);

CREATE POLICY "Students can insert own ratings" ON public.ratings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Students can update own ratings" ON public.ratings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create deleted_coaches table to prevent re-signup
CREATE TABLE IF NOT EXISTS public.deleted_coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.deleted_coaches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can read deleted_coaches" ON public.deleted_coaches;

CREATE POLICY "Admins can read deleted_coaches" ON public.deleted_coaches
    FOR SELECT USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists before recreating
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- STORAGE BUCKET RLS POLICIES
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads to profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to chat-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from chat-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to chat-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from chat-files" ON storage.objects;

-- Profile images bucket policies
CREATE POLICY "Allow authenticated uploads to profile-images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile-images' AND auth.role() = 'authenticated'
    );

CREATE POLICY "Allow public reads from profile-images" ON storage.objects
    FOR SELECT USING (bucket_id = 'profile-images');

-- Chat images bucket policies
CREATE POLICY "Allow authenticated uploads to chat-images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'chat-images' AND auth.role() = 'authenticated'
    );

CREATE POLICY "Allow public reads from chat-images" ON storage.objects
    FOR SELECT USING (bucket_id = 'chat-images');

-- Chat files bucket policies
CREATE POLICY "Allow authenticated uploads to chat-files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'chat-files' AND auth.role() = 'authenticated'
    );

CREATE POLICY "Allow public reads from chat-files" ON storage.objects
    FOR SELECT USING (bucket_id = 'chat-files');

-- STORAGE BUCKETS (Create these manually in Supabase Storage or via Dashboard):
-- 1. chat-images (Public) - for chat image sharing
-- 2. chat-files (Public) - for chat file sharing  
-- 3. profile-images (Public) - for coach profile pictures
-- 
-- To create: Go to Supabase Dashboard → Storage → Create a new bucket
-- Set to Public so images can be accessed via public URL

-- Auto Confirm User: ON
-- Then replace <ADMIN_UUID> below with the UUID from auth.users

-- INSERT INTO public.users (id, email, name, role, is_approved) VALUES
-- ('<ADMIN_UUID>', 'admin@gmail.com', 'Admin', 'admin', TRUE);

-- =============================================================
-- Coach Catalog for Admin Validation Search
-- Stores parsed booton.csv so searches are served by Supabase
-- =============================================================

CREATE TABLE IF NOT EXISTS public.coach_catalog (
    name TEXT PRIMARY KEY,
    teams TEXT,
    achievements TEXT,
    start_year TEXT,
    licensed TEXT,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.coach_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read coach_catalog" ON public.coach_catalog;
DROP POLICY IF EXISTS "Authenticated users can insert coach_catalog" ON public.coach_catalog;

CREATE POLICY "Authenticated users can read coach_catalog" ON public.coach_catalog
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert coach_catalog" ON public.coach_catalog
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
