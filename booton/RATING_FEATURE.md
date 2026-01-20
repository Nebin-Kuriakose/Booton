# Student Rating Feature Guide

## Overview

Students who have paid for a coach can now rate and review the coach. This feature helps build trust in the community and provides valuable feedback to coaches.

## Features Implemented

### 1. **RateCoachScreen** (`src/screens/RateCoachScreen.js`)
- **Purpose**: Allow students to submit and update coach ratings
- **Key Features**:
  - Interactive 5-star rating system (tap to select)
  - Optional written review (up to 500 characters)
  - Update existing ratings
  - Visual feedback with star display
  - Character counter for reviews
  - Benefits section showing why feedback matters

### 2. **ReviewsScreen** (`src/screens/ReviewsScreen.js`)
- **Purpose**: Display all reviews for a coach
- **Key Features**:
  - Shows average rating (e.g., 4.5 ⭐)
  - Total review count
  - Individual review cards with:
    - Star rating display
    - Review text
    - Review date
  - Empty state when no reviews exist
  - Organized by most recent first

### 3. **Updated CoachProfileScreen**
- **New Features**:
  - Displays real average rating instead of hardcoded 4.5
  - Shows actual review count
  - "View all reviews" link when reviews exist
  - "Rate Coach" button for paid students (blue button)
  - "Chat with Coach" button for paid students (green button)
  - Professional dual-button layout

### 4. **Updated StudentDashboardScreen**
- **New Features**:
  - Fetches actual coach ratings from database
  - Displays real average ratings in coach cards
  - Shows accurate review counts
  - Falls back to 4.5 stars if no reviews exist

## User Flow

### For Students

1. **Browse Coaches**
   - View all available coaches on Student Dashboard
   - See each coach's real average rating and review count

2. **View Coach Profile**
   - Click "View Profile" on any coach card
   - See detailed coach information
   - View all existing reviews (with "View all reviews" link)
   - If NOT paid: See "Pay & Chat" button
   - If PAID: See "Chat with Coach" and "Rate Coach" buttons

3. **Submit Rating** (After Payment)
   - Click "Rate Coach" button
   - Select 1-5 stars (tap to select)
   - Optionally write a review (max 500 characters)
   - Submit rating
   - View success message
   - Can update rating later

4. **View All Reviews**
   - Click "View all reviews" link on coach profile
   - See all student reviews with ratings and dates
   - View average rating summary

### For Coaches

1. **Monitor Ratings**
   - Check CoachProfileScreen in coach app to see own ratings
   - Monitor average rating as more students rate

2. **Respond to Feedback**
   - Use student ratings to improve coaching quality
   - Address common feedback points

## Database Schema

### Ratings Table

```sql
CREATE TABLE public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    rating DECIMAL(3, 1) CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coach_id, student_id)
);
```

### Key Features:
- **UNIQUE Constraint**: One rating per student per coach
- **Rating Validation**: DECIMAL(3,1) ensures 1.0 to 5.0 range
- **Cascading Delete**: When coach or student deleted, ratings deleted too
- **Timestamps**: Tracks when review was created

### Row Level Security (RLS) Policies:

1. **"Users can read ratings"** (SELECT)
   - Everyone can read ratings (public visibility)
   - Enables coaches to see their ratings

2. **"Students can insert own ratings"** (INSERT)
   - Only students can create ratings
   - Can only rate coaches they've paid for (UNIQUE constraint + app logic)

3. **"Students can update own ratings"** (UPDATE)
   - Students can update their own ratings
   - Cannot modify other students' ratings

## How Ratings Work

### Rating Display

- **Coach Profile**: Shows average rating and review count
- **Coach List**: Shows average rating in coach cards
- **Reviews Screen**: Shows all reviews with individual ratings

### Rating Calculation

```javascript
Average Rating = Sum of all ratings / Total number of ratings
Example: (5 + 4 + 5 + 3) / 4 = 4.25
```

### Data Validation

- Rating must be between 1.0 and 5.0
- Review text is optional but capped at 500 characters
- Each student can only have one active rating per coach
- Updating an existing rating overwrites the previous one

## Integration Points

### Screen Connections:

1. **StudentDashboardScreen** ↓
   - Displays coach list with ratings
   - Navigates to CoachProfileScreen

2. **CoachProfileScreen** ↓
   - Shows coach details and ratings
   - Routes to RateCoachScreen (after payment)
   - Routes to ReviewsScreen (view all)
   - Routes to ChatScreen (after payment)

3. **RateCoachScreen** ↓
   - Allows rating submission
   - Returns to previous screen after submission

4. **ReviewsScreen** ↓
   - Shows all reviews for coach
   - Returns to CoachProfileScreen

### Navigation Params:

```javascript
// To RateCoachScreen
navigation.navigate('RateCoach', {
    coachId: 'uuid',
    coachName: 'Coach Name'
});

// To ReviewsScreen
navigation.navigate('Reviews', {
    coachId: 'uuid',
    coachName: 'Coach Name'
});
```

## Implementation Details

### RateCoachScreen Functions:

- **getCurrentUser()**: Fetches student ID from AsyncStorage
- **fetchExistingRating()**: Checks if student already rated this coach
- **submitRating()**: Inserts or updates rating in database
- **renderStars()**: Creates interactive star selection interface

### ReviewsScreen Functions:

- **fetchReviews()**: Gets all ratings for a coach
- **Calculates**: Average rating from fetched data
- **renderReviewItem()**: Formats individual review cards

## Testing Guide

### Test Scenario 1: Submit New Rating

1. Login as Student
2. Navigate to a coach profile
3. Complete payment
4. Click "Rate Coach"
5. Select 4 stars
6. Write: "Great coaching! Very helpful."
7. Click "Submit Rating"
8. Verify success message

### Test Scenario 2: View Ratings

1. Login as any user
2. Go to Student Dashboard
3. Verify coaches show real ratings
4. Click "View Profile" on a coach
5. Click "View all reviews"
6. Verify average rating and reviews display correctly

### Test Scenario 3: Update Rating

1. Submit a rating (4 stars)
2. Go back to that coach's profile
3. Click "Rate Coach" again
4. Note it says "You've already rated this coach"
5. Change to 5 stars
6. Click "Update Rating"
7. Verify update succeeds

### Test Scenario 4: No Ratings

1. Choose a new coach (no ratings)
2. View profile
3. Verify "No reviews yet" message
4. Verify "Be the first to review!" prompt

## Styling & Colors

- **Header**: Orange (#FF9800) - Student theme
- **Star Color**: Gold (#FFB800) - for ratings
- **Buttons**: 
  - "Rate Coach": Blue (#2196F3)
  - "Chat": Green (#4CAF50)
- **Card Background**: White with shadows
- **Text**: Dark gray for content, light gray for secondary

## Performance Considerations

1. **Lazy Loading**: Ratings are fetched on demand
2. **Caching**: Coach ratings cached in component state
3. **Batch Queries**: ReviewsScreen fetches all reviews in one query
4. **Optimized Queries**: Only necessary columns selected

## Security

1. **RLS Policies**: Only students can insert/update ratings
2. **UNIQUE Constraint**: Prevents duplicate ratings
3. **Validation**: Rating values checked in database and UI
4. **Authentication**: AsyncStorage verifies current user

## Future Enhancements

1. **Sorting Options**: Most helpful, recent, highest rated
2. **Filtering**: Filter reviews by rating (5 star, 4 star, etc.)
3. **Helpful Counter**: Vote if review was helpful
4. **Coach Response**: Allow coaches to reply to reviews
5. **Star Distribution**: Show breakdown (15% 5-star, 20% 4-star, etc.)
6. **Photo Uploads**: Allow students to attach images to reviews
7. **Verified Purchase Badge**: Show only students who paid rated

## Files Modified

1. **RateCoachScreen.js** (NEW)
   - Student rating submission interface

2. **ReviewsScreen.js** (NEW)
   - Display all coach reviews

3. **CoachProfileScreen.js** (UPDATED)
   - Show real ratings
   - Add Rate Coach button
   - Link to Reviews screen

4. **StudentDashboardScreen.js** (UPDATED)
   - Fetch real coach ratings
   - Display in coach cards

5. **App.js** (UPDATED)
   - Add RateCoach and Reviews screens to navigation

6. **database-setup.sql** (UPDATED)
   - Ratings table definition
   - RLS policies

## Troubleshooting

### Ratings not displaying

1. Verify ratings table exists in Supabase
2. Check RLS policies are enabled
3. Ensure coach_id and student_id are valid UUIDs
4. Check browser console for errors

### Cannot update rating

1. Verify student is logged in correctly
2. Check AsyncStorage has correct user ID
3. Verify rating exists in database first
4. Check RLS UPDATE policy is correct

### Stars not clickable

1. Ensure TouchableOpacity wrapper is working
2. Check for overlapping components
3. Verify onPress handler is not disabled

## Support

For issues or questions:
1. Check error messages in Alert boxes
2. Review browser console for API errors
3. Verify Supabase connection in supabaseClient.js
4. Check RLS policies in Supabase dashboard
