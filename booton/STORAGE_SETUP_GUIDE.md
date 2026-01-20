# Supabase Storage Setup Guide

This guide explains how to create and configure the required storage buckets for BootOn.

## Required Buckets

The application uses 3 storage buckets for file management:

### 1. **profile-images**
- **Purpose**: Store coach profile pictures
- **Access**: Public (images should be accessible via public URLs)
- **Used by**: CoachEditProfileScreen.js

### 2. **chat-images**
- **Purpose**: Store images shared in real-time chat
- **Access**: Public 
- **Used by**: ChatScreen.js

### 3. **chat-files**
- **Purpose**: Store files and voice recordings shared in chat
- **Access**: Public
- **Used by**: ChatScreen.js

## How to Create Storage Buckets

### Method 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Project Dashboard
2. Click **Storage** in the left sidebar
3. Click **Create a new bucket** button
4. For each bucket:
   - Enter the bucket name (e.g., `profile-images`)
   - **Uncheck** "Private bucket" to make it PUBLIC
   - Click **Create bucket**

### Method 2: SQL Command (Alternative)

Run this SQL in your Supabase SQL Editor if buckets don't exist:

```sql
-- These commands create public storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT DO NOTHING;
```

## Bucket Policies (RLS)

Public buckets should allow authenticated users to upload and read files.

### Default Policy for Public Buckets:

If you need to set custom policies, go to **Storage → Policies** and add:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow public reads
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id IN (SELECT id FROM storage.buckets WHERE public = true));
```

## Testing Storage Upload

1. Login as a coach
2. Go to **Edit Profile**
3. Click **Upload Photo** to select an image
4. Click **Save Profile**
5. Check the console logs for upload confirmation

If upload fails with "Network request failed":
- Verify the bucket exists and is PUBLIC
- Check that Supabase API is responding
- Try again - it may be a temporary connection issue

## Troubleshooting

### Error: "Network request failed"
- Ensure the storage bucket is created and set to PUBLIC
- Check your Supabase project URL and API key in supabaseClient.js
- Verify you have internet connectivity

### Error: "Bucket not found"
- Check that the bucket name is spelled correctly
- Verify the bucket exists in your Supabase dashboard
- Try creating the bucket manually via the dashboard

### Uploaded images not showing
- Ensure the bucket is PUBLIC (not Private)
- Check that the image URL is correct in the database
- Verify the image was actually uploaded (check Storage browser in Supabase)

## Application Image Upload Flow

```
User selects image
    ↓
Image picker displays (with crop option)
    ↓
User confirms selection
    ↓
App converts local file URI to Blob
    ↓
App uploads to Supabase Storage bucket
    ↓
App gets public URL from storage
    ↓
App saves URL to database (users.profile_image)
    ↓
Image is accessible across all devices
```

## Notes

- Images are stored with timestamp: `{userId}-profile-{timestamp}.jpg`
- Old images are overwritten with `upsert: true` option
- Public buckets can be accessed by anyone with the URL
- For security-sensitive data, use Private buckets with proper RLS policies
