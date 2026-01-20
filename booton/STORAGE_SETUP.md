# Supabase Storage Setup for Chat Features

## Overview
The chat feature now supports sending images and files. You need to create two storage buckets in Supabase to support this functionality.

## Storage Buckets Required

### 1. Chat Images Bucket
- **Name**: `chat-images`
- **Public**: Yes (to display images in chat)
- **Purpose**: Stores images shared in chat messages

### 2. Chat Files Bucket
- **Name**: `chat-files`
- **Public**: Yes (to download files from chat)
- **Purpose**: Stores document files shared in chat messages

## How to Set Up

### Step 1: Go to Supabase Dashboard
1. Navigate to your Supabase project dashboard
2. Click on **Storage** in the left sidebar

### Step 2: Create Chat Images Bucket
1. Click **New Bucket**
2. Name it: `chat-images`
3. Toggle **Public bucket** to ON
4. Click **Create Bucket**

### Step 3: Create Chat Files Bucket
1. Click **New Bucket**
2. Name it: `chat-files`
3. Toggle **Public bucket** to ON
4. Click **Create Bucket**

### Step 4: Set Up Folder Structure (Optional but Recommended)
Once buckets are created, the app will automatically organize files in this structure:
```
chat-images/
  ├── {userId}/{receiverId}/
  │   └── {timestamp}_image

chat-files/
  ├── {userId}/{receiverId}/
  │   └── {filename}
```

## Storage Policies (Optional - Public Access)

If you want to restrict access, you can add RLS (Row Level Security) policies. For now, public access is fine for MVP.

### Example RLS Policy for Images (if needed later):
```sql
-- Allow authenticated users to read images
CREATE POLICY "Authenticated users can read images" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-images' AND auth.role() = 'authenticated');
```

## Features Enabled

Once storage buckets are configured:

✅ **Send Images in Chat**
- Users can tap the 📷 image button in the chat input
- Select an image from their device library
- Image is uploaded and displayed in the conversation

✅ **Send Files in Chat**
- Users can tap the 📎 file button in the chat input
- Select any document file from their device
- File name and download link is shared in the conversation

✅ **Real-time Display**
- Images show as thumbnails in messages
- Files show with document icon and name
- Both work in all chat scenarios (coach-student, admin support, etc.)

## Troubleshooting

### Images not uploading
1. Check that `chat-images` bucket exists and is public
2. Verify bucket name matches exactly: `chat-images`
3. Check browser console for specific upload errors

### Files not uploading
1. Check that `chat-files` bucket exists and is public
2. Verify bucket name matches exactly: `chat-files`
3. Ensure file size is reasonable (< 10MB recommended)

### Files not displaying
1. Ensure the bucket is set to **Public**
2. Check that file URLs are being generated correctly
3. Verify the receiving user has permission to view the URL

## Testing

1. Open the app and navigate to a chat
2. You should see two new buttons in the input area:
   - 📷 Image button (left)
   - 📎 File button (middle)
3. Tap image button → select an image → tap send
4. Tap file button → select a file → tap send
5. Verify media appears in the chat thread
