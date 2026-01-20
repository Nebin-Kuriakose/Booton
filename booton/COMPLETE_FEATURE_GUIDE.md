# BootOn App - Complete Feature Guide

## APP STRUCTURE

```
BootOn Football Coaching Platform
├── 3 User Roles: Admin, Coach, Student
├── Role-based Authentication & Dashboards
└── Real-time Chat & Progress Tracking
```

---

## ADMIN FEATURES

### Main Functions:
1. **Manage Students**
   - View all students
   - Block/Unblock students (blocked can't login)
   - Real-time chat with students

2. **Manage Coaches**
   - View approved coaches with details
   - Remove coaches
   - Real-time chat with coaches

3. **Coach Applications**
   - View pending coach applications
   - Accept (approve) or Reject applications
   - New coaches need approval to login

4. **Real-time Chat**
   - Chat separately with students and coaches
   - Message history
   - Timestamps

---

## COACH FEATURES

### Main Functions:

1. **Dashboard**
   - Edit profile (experience, fee, achievements)
   - See all students who paid for coaching
   - Payment status for each student
   - Quick chat access to each student

2. **Students Section**
   - List of paid students
   - Real-time chat with each student
   - Share images and files
   - Students can download files

3. **Admin Chat**
   - Direct communication with admin
   - Real-time messaging

4. **Progress Tracking**
   - Mark weekly performance points for each student (0-100)
   - Students see this as bar chart in their Progress section
   - Track progress week by week

---

## STUDENT FEATURES

### Main Functions:

1. **Dashboard**
   - Browse all available coaches
   - See coach ratings (e.g., 4.5 stars)
   - View coach experience, fees, achievements
   - Click "View Profile" for details

2. **Coach Profile**
   - Full coach details
   - Sample reviews from other students
   - "Pay & Chat" button to purchase coaching
   - After payment, "Chat with Coach" button appears

3. **Coaches Section**
   - Shows only coaches student has paid for
   - Quick access to chat with each coach
   - Real-time messaging
   - Share images and files with coach
   - Download files from coach

4. **Admin Chat**
   - Direct support channel with admin
   - Real-time messaging

5. **Progress Tracking**
   - See bar charts from each coach separately
   - Each bar = one week of performance
   - Understand weekly progress based on coach's tracking

---

## HOW TO USE

### For Admin:
1. Create admin account in Supabase (email: admin@gmail.com, password: 123456)
2. Login with credentials
3. Accept pending coach applications
4. Monitor students and coaches
5. Chat with users as needed

### For Coach:
1. Sign up with name, experience, payment fee, achievements
2. Wait for admin approval
3. Login once approved
4. Edit profile on Dashboard
5. Chat with students who paid
6. Track student progress weekly

### For Student:
1. Sign up with name, email, password
2. Browse available coaches
3. Pay for a coach
4. Start real-time chat with coach
5. Share files and images
6. View weekly progress charts

---

## KEY SCREENS & NAVIGATION

### Admin Home
```
Bottom Navigation:
- Students → AdminStudentsScreen
- Coaches → AdminCoachesScreen  
- Applications → ApplicationsScreen
```

### Coach Home
```
Bottom Navigation:
- Dashboard → CoachDashboardScreen (Edit profile, View students)
- Students → CoachStudentsScreen (Chat with students)
- Admin → AdminChat (Chat with admin)
- Progress → CoachProgressScreen (Track student progress)
```

### Student Home
```
Bottom Navigation:
- Dashboard → StudentDashboardScreen (Browse all coaches)
- Coach → StudentCoachesScreen (Chat with paid coaches)
- Admin → StudentAdminChat (Chat with admin)
- Progress → StudentProgressScreen (View progress charts)
```

---

## DATABASE TABLES

### Users Table
- id, email, name, role
- is_blocked (for students)
- is_approved (for coaches)
- experience, payment_fee, achievements (for coaches)

### Messages Table
- sender_id, receiver_id, message, created_at
- Real-time chat storage

### Coach Students Table
- coach_id, student_id
- payment_amount, payment_status, payment_date
- Tracks who paid for whom

### Progress Tracking Table
- coach_id, student_id
- week (1-52), points (0-100)
- Weekly performance tracking

---

## AUTHENTICATION FLOW

### Admin:
- Email: admin@gmail.com
- Password: 123456
- Created in Supabase manually
- Role: 'admin' in database

### Coach:
- Signup with all details
- is_approved = false initially
- Cannot login until admin approves
- is_approved = true → can login

### Student:
- Simple signup (name, email, password)
- can login immediately
- is_blocked prevents login

---

## PAYMENT SYSTEM

1. Student views coach profile
2. Clicks "Pay & Chat"
3. Payment is recorded in `coach_students` table
4. payment_status = 'completed'
5. Coach sees student in their list
6. Both can chat

---

## PROGRESS TRACKING

### Coach Side:
1. Click Progress in bottom nav
2. Select student
3. Enter weekly points (0-100)
4. System auto-assigns week number

### Student Side:
1. Click Progress in bottom nav
2. See all coaches student paid for
3. Each coach shows mini bar chart
4. Click "View Details" for full chart
5. Visual representation of all weeks tracked

---

## FILE SHARING

**Planned for Chat:**
- Share images and documents
- Real-time preview
- Download capability
- Uses Supabase Storage (to be configured)

---

## FEATURES CHECKLIST

✅ Authentication (Admin, Coach, Student)
✅ Role-based access control
✅ Real-time chat with Supabase Realtime
✅ Block/Unblock students
✅ Coach approval system
✅ Payment tracking
✅ Progress tracking with bar charts
✅ Profile management
✅ User management (Admin)
✅ Coach application workflow
✅ Bottom navigation for all roles

⏳ File sharing in chat (to implement)
⏳ Payment integration (currently simulated)
⏳ Coach ratings/reviews (UI ready, backend optional)

---

## TECH STACK

- React Native + Expo SDK 52
- Supabase (PostgreSQL + Auth + Realtime)
- React Navigation (Native Stack)
- AsyncStorage for local data
- Ionicons for UI icons

---

## QUICK SETUP

1. **Update Database:**
   - Run entire `database-setup.sql` in Supabase SQL Editor

2. **Create Admin User:**
   - In Supabase Auth, create user: admin@gmail.com / 123456
   - In users table, insert: role='admin', is_approved=true

3. **Test Flow:**
   - Sign up as Coach (wait for approval)
   - Login as Admin, approve coach
   - Login as Coach, edit profile
   - Sign up as Student
   - Student browses and pays for coach
   - Both start chatting

Ready to launch! 🚀
