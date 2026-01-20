# Quick Start: Student Rating Feature

## What's New?

The BootOn platform now includes a **complete student rating system** that allows students to rate and review coaches after payment.

## Key Files Added/Modified

### New Files:
1. **[RateCoachScreen.js](src/screens/RateCoachScreen.js)** - Rating submission interface
2. **[ReviewsScreen.js](src/screens/ReviewsScreen.js)** - Display all reviews
3. **[RATING_FEATURE.md](RATING_FEATURE.md)** - Complete feature documentation

### Modified Files:
1. **[CoachProfileScreen.js](src/screens/CoachProfileScreen.js)** - Added real ratings + Rate button
2. **[StudentDashboardScreen.js](src/screens/StudentDashboardScreen.js)** - Fetch real ratings
3. **[App.js](src/App.js)** - Registered new screens
4. **[database-setup.sql](database-setup.sql)** - Added ratings table with RLS

## How to Test

### 1. Setup (First Time Only)

```bash
# In Supabase SQL Editor, run:
```sql
-- Drop existing ratings table if any
DROP TABLE IF EXISTS public.ratings CASCADE;

-- Create ratings table
CREATE TABLE public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    rating DECIMAL(3, 1) CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coach_id, student_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read ratings" ON public.ratings
    FOR SELECT USING (true);

CREATE POLICY "Students can insert own ratings" ON public.ratings
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own ratings" ON public.ratings
    FOR UPDATE USING (auth.uid() = student_id);
```

### 2. Test Workflow

**Step 1: Login as Student**
```
Email: any@email.com
Password: any password
```

**Step 2: Browse Coaches**
- See the Student Dashboard
- Notice coaches now show **real average ratings** instead of hardcoded 4.5
- Review count is accurate

**Step 3: Select a Coach**
- Click "View Profile" on any coach
- See coach details and real reviews section

**Step 4: Pay for Coach**
- Click "Pay & Chat" button
- Simulated payment completes
- Two new buttons appear:
  - 💬 "Chat with Coach" (green)
  - ⭐ "Rate Coach" (blue)

**Step 5: Rate the Coach**
- Click "Rate Coach" button
- Select rating: tap stars to select 1-5
- Add optional review (max 500 characters)
- Click "Submit Rating"
- Success message confirms

**Step 6: View Ratings**
- Go back to coach profile
- Scroll to reviews section
- See your rating now appears
- Click "View all reviews" to see all ratings

**Step 7: Update Rating**
- Click "Rate Coach" again
- System says "You've already rated this coach"
- Change rating or review
- Click "Update Rating"
- Success confirms update

## Features Checklist

- ✅ Interactive 5-star rating selector
- ✅ Optional written reviews (0-500 chars)
- ✅ Update existing ratings
- ✅ Real-time rating display
- ✅ Average rating calculation
- ✅ Review count tracking
- ✅ One rating per coach per student (UNIQUE constraint)
- ✅ Public review visibility
- ✅ Secure (RLS) database access
- ✅ Professional UI with role-specific colors
- ✅ Empty state for new coaches
- ✅ Loading indicators

## User Flows

### Student Perspective:
```
Student Login
    ↓
Browse Coaches (see real ratings)
    ↓
Click Coach Profile
    ↓
View Existing Reviews
    ↓
Pay for Coach
    ↓
Rate Coach (submit/update)
    ↓
See Rating on Coach Profile
    ↓
Other Students See Your Review
```

### Coach Perspective:
```
Coach Approved
    ↓
Appears in Student List
    ↓
Students Can View Profile
    ↓
Rating Shows on Profile
    ↓
Can See Average Rating
    ↓
Can View All Reviews
    ↓
Uses Feedback to Improve
```

### Admin Perspective:
```
Admin Dashboard
    ↓
Can View All Coaches
    ↓
Can See Coach Ratings
    ↓
Monitor Platform Quality
    ↓
Can Remove Low-Rated Coaches (policy decision)
```

## Important Notes

### Database Notes:
- Ratings table has UNIQUE constraint: one rating per coach per student
- DECIMAL(3,1) ensures ratings are in 1.0-5.0 range
- Cascading deletes: if coach/student deleted, ratings deleted
- RLS policies ensure security:
  - Everyone can **READ** ratings (public reviews)
  - Only students can **INSERT** ratings
  - Students can only **UPDATE** their own ratings

### API Calls Used:
```javascript
// Fetch ratings for a coach
supabase
  .from('ratings')
  .select('rating')
  .eq('coach_id', coachId)

// Insert a new rating
supabase
  .from('ratings')
  .insert([{ coach_id, student_id, rating, review }])

// Update existing rating
supabase
  .from('ratings')
  .update({ rating, review })
  .eq('id', ratingId)

// Fetch all reviews for a coach
supabase
  .from('ratings')
  .select('*')
  .eq('coach_id', coachId)
  .order('created_at', { ascending: false })
```

## Screen Details

### RateCoachScreen (`/src/screens/RateCoachScreen.js`)
- **Purpose**: Submit or update coach rating
- **Inputs**: 1-5 star rating, optional review text
- **Logic**: Check if rating exists, insert or update
- **Output**: Success message, returns to previous screen
- **Styling**: Orange (#FF9800) header, gold stars (#FFB800)

### ReviewsScreen (`/src/screens/ReviewsScreen.js`)
- **Purpose**: Display all reviews for a coach
- **Shows**: Average rating, total count, individual reviews
- **Sorting**: Most recent first
- **Empty State**: "No reviews yet" message
- **Styling**: Professional card layout with shadows

### Updated CoachProfileScreen
- **New**: Fetch real ratings from database
- **New**: "View all reviews" clickable link
- **New**: "Rate Coach" button for paid students
- **Removed**: Hardcoded sample reviews
- **Better**: Shows actual community feedback

### Updated StudentDashboardScreen
- **New**: Fetch real ratings on component load
- **New**: Display actual average and count in coach cards
- **Better**: Helps students make informed choices
- **Performance**: Caches ratings in state

## Styling Reference

```javascript
// Colors
Student Orange: #FF9800
Success Green: #4CAF50
Admin Blue: #2196F3
Star Gold: #FFB800
Text Dark: #333
Secondary Gray: #999
Light Gray: #ccc
Background: #f5f5f5

// Common Patterns
- Card padding: 16px
- Border radius: 12-16px
- Shadows: elevation 2-3
- Icon + Text gap: 8-12px
- Button height: min 48px
```

## Common Tasks

### Task: Change Star Color
Find in `RateCoachScreen.js` and `ReviewsScreen.js`:
```javascript
color={star <= rating ? '#FFB800' : '#ccc'} // Change #FFB800
```

### Task: Change Max Review Length
Find in `RateCoachScreen.js`:
```javascript
maxLength={500} // Change 500 to desired number
```

### Task: Change Button Colors
Find in `CoachProfileScreen.js` styles:
```javascript
rateButton: {
    backgroundColor: '#2196F3', // Change this color
}
```

### Task: Modify Empty State Text
Find in `ReviewsScreen.js`:
```javascript
<Text style={styles.emptyTitle}>No reviews yet</Text> // Modify text
```

## Troubleshooting

### Reviews Not Showing?
1. Check ratings table exists in Supabase
2. Verify RLS policies enabled
3. Ensure at least one rating submitted
4. Check browser console for SQL errors

### Can't Submit Rating?
1. Verify student is logged in (check AsyncStorage)
2. Ensure payment was completed first
3. Check Supabase auth user matches app user
4. Verify ratings table has INSERT policy enabled

### Average Rating Wrong?
1. Check calculation: Sum / Count
2. Verify all ratings are in 1.0-5.0 range
3. Ensure DECIMAL(3,1) constraint working
4. Test with multiple ratings

### Button Not Showing?
1. Check student is logged in
2. Verify payment status = 'completed'
3. Check navigation.navigate params passed correctly
4. Verify screen registered in App.js

## Next Steps

1. **Test the feature** - Follow test workflow above
2. **Gather feedback** - See what students/coaches think
3. **Customize styling** - Adjust colors/fonts if needed
4. **Plan enhancements**:
   - Review sorting/filtering
   - Photo uploads
   - Helpful counter
   - Coach replies
   - Rating distribution chart

## Support

For issues or questions about the rating system:
1. Check [RATING_FEATURE.md](RATING_FEATURE.md) for detailed docs
2. Review code comments in RateCoachScreen.js
3. Check Supabase dashboard for data
4. Verify network requests in browser DevTools

---

**Status**: ✅ Ready to Test
**Version**: 1.0
**Last Updated**: [Current Date]
