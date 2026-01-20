# BootOn - Football Coaching App

A React Native mobile application connecting football coaches with students.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase

1. Create a Supabase account at https://supabase.com
2. Create a new project
3. Copy your project credentials
4. Update `.env.local` with your Supabase URL and anon key:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Set Up Database

Run this SQL in your Supabase SQL Editor:

```sql
-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'student')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Create admin user (after creating the auth user)
-- First create an auth user with email: admin@gmail.com, password: 123456
-- Then insert into users table with the generated UUID:
INSERT INTO users (id, email, name, role)
VALUES ('<YOUR_ADMIN_AUTH_UUID>', 'admin@gmail.com', 'Admin', 'admin');
```

### 4. Create Admin Account

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user"
3. Email: `admin@gmail.com`
4. Password: `123456`
5. Copy the generated UUID
6. Run the INSERT query above with your UUID

### 5. Run the App

```bash
npm start
```

Then scan the QR code with Expo Go app on your phone.

## Features

- **Admin**: Platform management and oversight
- **Coach**: Create profile, manage students, schedule sessions
- **Student**: Browse coaches, book sessions, track progress

## Tech Stack

- React Native
- Expo SDK 52
- Supabase (Authentication & Database)
- React Navigation
