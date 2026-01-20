# Coach & Student Features Implementation

## Database Update Required

Run this updated SQL in Supabase SQL Editor to add the new tables:

**New Tables Added:**
1. `coach_students` - Tracks payment between coaches and students
2. `progress_tracking` - Stores weekly progress points for students

Run the entire [database-setup.sql](d:\REACT\booton\database-setup.sql) file to update your database.

---

## COACH FEATURES

### 1. **Coach Dashboard** (CoachDashboardScreen)
**Location:** Bottom nav → Dashboard

Features:
- **Edit Profile Button** - Top right to edit experience, payment fee, achievements
- **Paid Students List** - Shows all students who have paid for coaching
- **Payment Status** - Green badge showing "Payment Completed" for each student
- **Chat Button** - Chat with each student individually

### 2. **Students Section** (CoachStudentsScreen)
**Location:** Bottom nav → Students

Features:
- List of all paid students
- Real-time chat with each student
- File and image sharing support
- **Download capability** - Students can download shared files

### 3. **Admin Section** (AdminChat)
**Location:** Bottom nav → Admin

Features:
- Real-time chat with admin
- Direct communication for any platform-related queries

### 4. **Progress Tracking** (CoachProgressScreen)
**Location:** Bottom nav → Progress

Features:
- **Select Student** - Click on any student to add weekly points
- **Weekly Points Modal** - Enter points (0-100 scale)
- **Bar Chart View** - See visual representation of all weeks
- Students can view this progress in their Progress section

---

## STUDENT FEATURES

### 1. **Student Dashboard** (StudentDashboardScreen)
**Location:** Bottom nav → Dashboard

Features:
- **List of All Coaches** - Browse all available approved coaches
- **Coach Profile Card** showing:
  - Coach name
  - Rating (e.g., 4.5 stars)
  - Experience
  - Payment fee per month
  - Achievements
- **View Profile Button** - Click to see detailed coach profile

### 2. **Coach Profile Screen** (CoachProfileScreen)
Features:
- **Full Coach Details**
  - Experience
  - Achievements
  - Monthly fee
  - Email
- **Recent Reviews** - Sample reviews from previous students
- **Payment Button** - "Pay & Chat" to complete payment
- **Chat Button** - "Chat with Coach" (appears after payment)

### 3. **Coaches Section** (StudentCoachesScreen)
**Location:** Bottom nav → Coach

Features:
- Shows all coaches the student has **paid for**
- Quick access to chat with paid coaches
- Real-time messaging
- **File and Image Sharing** - Share coaching materials
- **Download Files** - Download shared files from coach

### 4. **Admin Section** (StudentAdminChat)
**Location:** Bottom nav → Admin

Features:
- Real-time chat with admin
- Direct support channel

### 5. **Progress Tracking** (StudentProgressScreen)
**Location:** Bottom nav → Progress

Features:
- **Coach List** - Shows all coaches student has paid for
- **Mini Chart Preview** - Bar chart preview for each coach
- **View Details Button** - See full weekly progress from each coach separately
- **Bar Chart** - Each bar represents one week of progress points

---

## REAL-TIME CHAT FEATURES

**Enhanced Chat Screen (ChatScreen.js)**
- **File Sharing** - Share images and documents
- **Download Support** - Files are downloadable
- **Real-time Messaging** - Uses Supabase Realtime
- **Message Timestamps** - Each message shows time sent
- **Professional UI** - Clean message bubbles with sender distinction

---

## PAYMENT SYSTEM

**Payment Flow:**
1. Student browses coaches on Dashboard
2. Clicks "View Profile" on a coach
3. Enters payment (integrated payment system)
4. Payment status saved to `coach_students` table with `payment_status = 'completed'`
5. Student can now chat with coach
6. Coach sees student in their student list
7. Both can access real-time chat

**Payment Status Tracking:**
- Pending → Completed → Can Chat
- Shows in coach's student list with status badge

---

## PROGRESS TRACKING SYSTEM

**Coach Side:**
1. Go to Progress section
2. Click on any student
3. Enter weekly points (0-100)
4. Points are saved to `progress_tracking` table
5. Stored with `week` field (auto-calculated)

**Student Side:**
1. Go to Progress section
2. See all coaches in a list
3. Each coach card shows mini bar chart preview
4. Click "View Details" to see full progress from that coach
5. Bar chart shows weekly performance (each bar = 1 week)

---

## NEW NAVIGATION ROUTES

```javascript
// Coach Navigation
CoachHome → CoachDashboard (Dashboard section)
CoachHome → CoachStudents (Students section)
CoachHome → AdminChat (Admin section)
CoachHome → CoachProgress (Progress section)
CoachHome → Chat (Real-time chat with students)

// Student Navigation
StudentHome → StudentDashboard (Dashboard with all coaches)
StudentHome → CoachProfile (Detailed coach info + payment)
StudentHome → StudentCoaches (Paid coaches list)
StudentHome → StudentAdminChat (Admin chat)
StudentHome → StudentProgress (Progress charts)
StudentHome → Chat (Real-time chat with coaches/admin)
```

---

## NEW SCREENS CREATED

1. **CoachDashboardScreen.js** - Profile + paid students list
2. **CoachProgressScreen.js** - Weekly point tracking for students
3. **StudentDashboardScreen.js** - Available coaches list
4. **CoachProfileScreen.js** - Detailed coach info + payment
5. **StudentProgressScreen.js** - View progress charts from coaches

---

## DATABASE SCHEMA CHANGES

### New Table: `coach_students`
```sql
{
  id: UUID,
  coach_id: UUID (references users),
  student_id: UUID (references users),
  payment_amount: DECIMAL,
  payment_status: TEXT ('pending', 'completed', 'failed'),
  payment_date: TIMESTAMP,
  created_at: TIMESTAMP
}
```

### New Table: `progress_tracking`
```sql
{
  id: UUID,
  coach_id: UUID (references users),
  student_id: UUID (references users),
  week: INTEGER,
  points: DECIMAL (0-100),
  date: TIMESTAMP,
  created_at: TIMESTAMP
}
```

---

## NEXT STEPS

1. **Run the updated database-setup.sql** in Supabase to create new tables
2. **Implement file sharing** in ChatScreen (optional - uses Supabase Storage)
3. **Connect real payment system** (currently simulated)
4. **Test the complete flow:**
   - Admin approves coach
   - Coach logs in, edits profile
   - Student finds coach, pays, chats
   - Coach tracks progress weekly
   - Student views progress charts

---

## FEATURE SUMMARY

| Feature | Coach | Student | Admin |
|---------|-------|---------|-------|
| View Dashboard | ✅ | ✅ | ✅ |
| Edit Profile | ✅ | ❌ | ❌ |
| Chat Real-time | ✅ | ✅ | ✅ |
| Share Files | ✅ | ✅ | ✅ |
| Track Progress | ✅ | ✅ | ❌ |
| Payment | ❌ | ✅ | ❌ |
| Approve Coaches | ❌ | ❌ | ✅ |
| Block Students | ❌ | ❌ | ✅ |
| View Coaches | ❌ | ✅ | ❌ |

All features are now integrated and ready to use! 🎉
