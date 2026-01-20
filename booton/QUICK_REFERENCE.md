# ⚡ Quick Reference Card - BootOn App

## 🚀 START THE APP
```bash
cd d:\REACT\booton
npx expo start
```

---

## 📋 BEFORE TESTING - REQUIRED SETUP

### 1. Database Schema
```
Go to: https://supabase.com/dashboard
→ SQL Editor → New query
→ Copy entire database-setup.sql
→ Click Run
```

### 2. Create Admin User
```
Supabase Dashboard → Authentication → Users
→ Add user
  Email: admin@gmail.com
  Password: 123456
  Auto Confirm: ON
→ Copy the UUID
```

### 3. Insert Admin Record
```sql
INSERT INTO public.users (id, email, name, role, is_approved) 
VALUES ('PASTE_ADMIN_UUID_HERE', 'admin@gmail.com', 'Admin', 'admin', TRUE);
```

### 4. Enable Realtime
```
Supabase Dashboard → Replication
Enable for: messages, coach_students, progress_tracking
```

---

## 🎯 TEST SCENARIOS

### Scenario 1: Admin Approving Coach
```
1. Select COACH role
2. Sign up: Name, Experience, Fee, Achievements
3. Error: "Pending approval"
4. Select ADMIN role
5. Login: admin@gmail.com / 123456
6. Click Applications
7. Click Accept
✓ Coach approved!
```

### Scenario 2: Coach to Student Payment & Chat
```
1. Coach: Login (now approved)
2. Go to Dashboard section
3. (Empty - no students yet)
4. Select STUDENT role
5. Sign up as Student
6. Dashboard: Explore coaches
7. Click "View Profile"
8. Click "Pay & Chat"
9. Chat opens! ✓
10. Coach sees in Dashboard ✓
```

### Scenario 3: Weekly Progress Tracking
```
Coach:
1. Go to Progress section
2. Click on student
3. Enter 75 (points)
4. Submit

Student:
1. Go to Progress section
2. See coach with bar chart
3. New bar shows 75 pts ✓
```

---

## 📱 SCREEN LOCATIONS

### Admin
```
AdminHome
├── Students (AdminStudentsScreen)
├── Coaches (AdminCoachesScreen)
└── Applications (ApplicationsScreen)
```

### Coach
```
CoachHome (Bottom Nav)
├── Dashboard → CoachDashboardScreen
├── Students → Chat
├── Admin → Chat
└── Progress → CoachProgressScreen
```

### Student
```
StudentHome (Bottom Nav)
├── Dashboard → StudentDashboardScreen
├── Coaches → Paid coaches + Chat
├── Admin → Chat
└── Progress → StudentProgressScreen
```

---

## 🔑 KEY DATABASE OPERATIONS

### Check Users
```sql
SELECT id, email, role, is_approved, is_blocked FROM public.users;
```

### Check Messages
```sql
SELECT * FROM public.messages 
WHERE sender_id = 'USER_ID' OR receiver_id = 'USER_ID';
```

### Check Payments
```sql
SELECT * FROM public.coach_students 
WHERE student_id = 'STUDENT_ID';
```

### Check Progress
```sql
SELECT * FROM public.progress_tracking 
WHERE student_id = 'STUDENT_ID' 
ORDER BY week;
```

---

## ⚙️ TROUBLESHOOTING

### Issue: Can't login
**Solution:** Check is_approved (coach) or is_blocked (student) in database

### Issue: No real-time messages
**Solution:** Enable Realtime in Supabase for messages table

### Issue: Table doesn't exist
**Solution:** Re-run database-setup.sql

### Issue: Auth error
**Solution:** Verify .env.local has correct Supabase URL and key

---

## 📲 NAVIGATION COMMANDS

```javascript
// Go to screen
navigation.navigate('ScreenName')

// Go back
navigation.goBack()

// Replace (logout)
navigation.replace('RoleSelect')

// Pass params
navigation.navigate('Screen', { param: value })
```

---

## 🗄️ TABLES AT A GLANCE

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| users | User accounts | id, email, role, is_approved, is_blocked |
| messages | Chat history | sender_id, receiver_id, message, created_at |
| coach_students | Payment tracking | coach_id, student_id, payment_status |
| progress_tracking | Weekly scores | coach_id, student_id, week, points |

---

## 🎨 COLOR SCHEME

| Role | Color | Hex |
|------|-------|-----|
| Admin | Blue | #2196F3 |
| Coach | Green | #4CAF50 |
| Student | Orange | #FF9800 |

---

## ✅ FEATURE CHECKLIST

- ✓ Admin login with approval system
- ✓ Coach approval workflow
- ✓ Student sign up (no approval)
- ✓ Block/unblock students
- ✓ Real-time chat (all roles)
- ✓ Payment tracking (coach-student)
- ✓ Progress tracking (weekly points)
- ✓ Profile management
- ✓ Applications management
- ✓ Coach removal
- ✓ Bottom navigation (all roles)
- ✓ RLS security

---

## 🚨 IMPORTANT NOTES

1. **Database must be set up first** - nothing works without schema
2. **Admin account required** - create before testing other roles
3. **Realtime must be enabled** - for real-time chat to work
4. **RLS policies are strict** - users only see their own data
5. **Coach needs approval** - can't login until admin approves
6. **Payment simulation** - simulated, not connected to actual gateway

---

## 📞 SUPPORT DOCS

Read these for detailed help:
1. `SETUP_CHECKLIST.md` - Step-by-step setup
2. `COMPLETE_FEATURE_GUIDE.md` - All features explained
3. `ARCHITECTURE_DIAGRAM.md` - System design
4. `IMPLEMENTATION_COMPLETE.md` - Full summary

---

## 🎯 QUICK WINS

**Fastest test (5 min):**
1. Run database-setup.sql
2. Create admin account
3. Login as admin
4. See Applications (empty)
✓ System works!

**Full test (15 min):**
1. Setup complete
2. Coach signs up
3. Admin approves
4. Student signs up
5. Student pays coach
6. Both chat
7. Coach marks progress
8. Student views chart
✓ Everything works!

---

Made with ❤️ for BootOn
Last Updated: Jan 2026
Status: ✅ READY FOR TESTING
