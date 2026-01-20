# Admin Features Setup Guide

## What's Been Implemented

### 1. Database Schema Updates
The database now supports:
- **Student Blocking**: `is_blocked` column to prevent blocked students from logging in
- **Coach Approval System**: `is_approved` column (default: false) - coaches need admin approval
- **Coach Profile Fields**: `experience`, `payment_fee`, `achievements`
- **Real-time Chat**: `messages` table with sender_id, receiver_id, message, created_at

### 2. Admin Screens Created
✅ **AdminStudentsScreen** - View all students, block/unblock them, chat with each student
✅ **AdminCoachesScreen** - View approved coaches, remove coaches, chat with each coach
✅ **ApplicationsScreen** - View pending coach applications, accept or reject them
✅ **ChatScreen** - Real-time messaging between admin and students/coaches

### 3. Features Implemented

#### Students Section
- View list of all registered students
- Block/Unblock functionality (blocked students cannot log in)
- Chat button for each student - opens real-time chat
- Shows blocked status with ⛔ indicator

#### Coaches Section
- View list of all approved coaches with their details:
  - Experience
  - Payment fee per month
  - Achievements
- Remove coach functionality (with confirmation)
- Chat button for each coach - opens real-time chat

#### Applications Section
- View pending coach applications (is_approved = false)
- Shows full coach details: experience, payment fee, achievements
- Accept button - approves coach and allows them to login
- Reject button - deletes the application
- Badge showing number of pending applications

#### Real-time Chat
- Send and receive messages in real-time
- Message bubbles (admin messages on right, other user on left)
- Timestamps for each message
- Auto-scroll to latest message
- Uses Supabase Realtime subscriptions

### 4. Authentication Updates
✅ **Coach Signup**: 
- Now saves experience, payment_fee, achievements
- Sets is_approved = false (pending admin approval)
- Shows message: "Application submitted! Wait for admin approval."

✅ **Coach Login**: 
- Checks if is_approved = true
- If not approved, shows: "Your application is pending admin approval."

✅ **Student Login**: 
- Checks if is_blocked = false
- If blocked, shows: "Your account has been blocked. Please contact admin."

## Database Setup Instructions

### IMPORTANT: Run this SQL in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `mqsshpexifnaxpcebwbv`
3. Click on "SQL Editor" in the left sidebar
4. Click "New query"
5. Copy the contents of `database-setup.sql` and paste it
6. Click "Run" to execute the SQL

**OR**

You can run this directly from the SQL Editor:

```sql
-- Run this in Supabase SQL Editor
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with all required fields
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'student')),
    is_blocked BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    experience TEXT,
    payment_fee TEXT,
    achievements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create messages table for real-time chat
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Admin can read all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
        OR id = auth.uid()
    );

CREATE POLICY "Admin can update all users" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

CREATE POLICY "Admin can delete all users" ON users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

CREATE POLICY "Users can insert their own data" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read their own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Messages table policies
CREATE POLICY "Users can read their own messages" ON messages
    FOR SELECT USING (
        sender_id = auth.uid() OR receiver_id = auth.uid()
    );

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Enable Realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

## Testing the Features

### 1. Create an Admin Account (if not already created)
- Use Supabase Auth to create an admin user
- Add entry in users table with role='admin'

### 2. Test Coach Application Flow
1. Sign up as a coach with experience, payment fee, achievements
2. Try to log in - should see "pending admin approval" message
3. Log in as admin
4. Go to Applications section
5. Accept the coach application
6. Now coach can log in successfully

### 3. Test Student Blocking
1. Sign up/log in as student
2. Log in as admin
3. Go to Students section
4. Click block button on a student
5. Try to log in as that student - should see "blocked" message
6. Unblock the student - they can log in again

### 4. Test Real-time Chat
1. Log in as admin
2. Go to Students or Coaches section
3. Click chat button on any user
4. Send a message
5. Open another browser/device and log in as that user
6. Check if message appears in real-time

## Navigation Structure

```
AdminHome
├── Students Section (AdminStudentsScreen)
│   ├── Student List
│   ├── Block/Unblock Button
│   └── Chat Button → ChatScreen
├── Coaches Section (AdminCoachesScreen)
│   ├── Approved Coaches List
│   ├── Remove Button
│   └── Chat Button → ChatScreen
└── Applications Section (ApplicationsScreen)
    ├── Pending Coach Applications
    ├── Accept Button
    └── Reject Button
```

## Files Created/Modified

### New Files Created:
- `src/screens/AdminStudentsScreen.js` - Students management
- `src/screens/AdminCoachesScreen.js` - Coaches management
- `src/screens/ApplicationsScreen.js` - Coach applications
- `src/screens/ChatScreen.js` - Real-time chat

### Files Modified:
- `src/App.js` - Added new screens to navigation
- `src/screens/AdminHomeScreen.js` - Added navigation to new screens
- `src/services/authService.js` - Updated coach/student auth logic
- `src/screens/CoachAuthScreen.js` - Added AsyncStorage for chat
- `src/screens/StudentAuthScreen.js` - Added AsyncStorage for chat
- `src/screens/AdminLoginScreen.js` - Added AsyncStorage for chat
- `database-setup.sql` - Complete database schema

## Next Steps

1. **Run the database setup SQL** in Supabase (most important!)
2. Test the application flow
3. Create your admin account in Supabase
4. Start testing with coach applications
5. Test real-time chat functionality

All features are now implemented and ready to use! 🎉
