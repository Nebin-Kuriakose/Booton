import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Image, ActivityIndicator, Modal, Dimensions, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Audio } from 'expo-av';
import { supabase } from '../services/supabaseClient';

export default function ChatScreen({ route, navigation }) {
    const { userId, userName } = route?.params || {};
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUserId, setCurrentUserId] = useState(null);
    const [otherUserData, setOtherUserData] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [recording, setRecording] = useState(false);
    const [failedImages, setFailedImages] = useState({});
    const [playingId, setPlayingId] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const flatListRef = useRef(null);
    const recordingRef = useRef(null);
    const isStartingRef = useRef(false);
    const soundRef = useRef(null);
    const lastStopAtRef = useRef(0);
    const [isPreparing, setIsPreparing] = useState(false);

    const getImageViewUrl = (url) => {
        try {
            const hasExt = /(\.png|\.jpe?g|\.webp|\.gif|\.bmp|\.heic|\.heif)(\?|$)/i.test(url);
            if (hasExt) return url;
            const sep = url.includes('?') ? '&' : '?';
            return `${url}${sep}download=image.jpg`;
        } catch {
            return url;
        }
    };

    const getFileDownloadUrl = (name, url) => {
        try {
            const hasDownload = /[?&]download=/i.test(url);
            if (hasDownload) return url;
            const sep = url.includes('?') ? '&' : '?';
            return `${url}${sep}download=${encodeURIComponent(name || 'file')}`;
        } catch {
            return url;
        }
    };

    const openFile = async (name, url) => {
        try {
            const resolved = getFileDownloadUrl(name, url);
            const supported = await Linking.canOpenURL(resolved);
            if (supported) {
                await Linking.openURL(resolved);
            } else {
                Alert.alert('Unavailable', 'Cannot open this file URL.');
            }
        } catch (e) {
            Alert.alert('Error', e.message || 'Failed to open file');
        }
    };

    const getAudioPlayUrl = (url) => {
        try {
            const hasExt = /\.(m4a|mp4|aac)(\?|$)/i.test(url);
            if (hasExt) return url;
            const sep = url.includes('?') ? '&' : '?';
            return `${url}${sep}download=voice.m4a`;
        } catch {
            return url;
        }
    };

    useEffect(() => {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const uid = session?.user?.id || null;
            setCurrentUserId(uid);
            await loadInitialData(uid);
        })();
    }, []);

    // Realtime subscription for new messages in this conversation
    useEffect(() => {
        if (!currentUserId || !userId) return;
        const channel = supabase
            .channel(`chat_${currentUserId}_${userId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const msg = payload?.new;
                if (!msg) return;
                const isThisChat = (msg.sender_id === currentUserId && msg.receiver_id === userId)
                    || (msg.sender_id === userId && msg.receiver_id === currentUserId);
                if (isThisChat) {
                    setMessages((prev) => [...prev, msg]);
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                }
            })
            .subscribe();

        return () => {
            try { supabase.removeChannel(channel); } catch { }
        };
    }, [currentUserId, userId]);

    const loadInitialData = async (uid) => {
        try {
            if (userId) {
                const { data: userData } = await supabase.from('users').select('id,name,role').eq('id', userId).single();
                setOtherUserData(userData || null);
            }
            await loadMessages(uid);
        } catch (e) {
            console.warn('Init load error:', e?.message);
        }
    };

    const loadMessages = async (uid) => {
        try {
            if (!uid || !userId) return;
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${uid},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${uid})`)
                .order('created_at', { ascending: true });
            if (error) throw error;
            setMessages(data || []);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (e) {
            console.error('Load messages error:', e);
        }
    };

    const sendMessage = async () => {
        try {
            const text = newMessage.trim();
            if (!text) return;
            const { data: { session } } = await supabase.auth.getSession();
            const senderId = session?.user?.id;
            if (!senderId || !userId) throw new Error('Missing sender or receiver');
            const { data, error } = await supabase
                .from('messages')
                .insert([{ sender_id: senderId, receiver_id: userId, message: text }])
                .select()
                .single();
            if (error) throw error;
            setMessages((prev) => [...prev, data]);
            setNewMessage('');
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (e) {
            Alert.alert('Error', e.message || 'Failed to send');
        }
    };

    const uploadFileAndSendMessage = async ({ uri, name, mime, bucket, type }) => {
        try {
            setUploading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const senderId = session?.user?.id;
            if (!senderId || !userId) throw new Error('Missing sender or receiver');

            const timestamp = Date.now();
            const extMatch = name.match(/\.([a-zA-Z0-9]+)$/);
            const ext = extMatch ? extMatch[1].toLowerCase() : (type === 'voice' ? 'm4a' : 'bin');
            const safeBase = name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
            const storagePath = `${safeBase}_${timestamp}.${ext}`;

            let targetBucket = bucket;

            const doUploadToBucket = async (bucketName) => {
                // Helper to create a Blob from a local/remote URI
                const makeBlob = async () => {
                    try {
                        const r = await fetch(uri);
                        return await r.blob();
                    } catch (err) {
                        const base64Data = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                        const r2 = await fetch(`data:${mime};base64,${base64Data}`);
                        return await r2.blob();
                    }
                };

                // First attempt: Supabase JS upload with Blob
                try {
                    const blob = await makeBlob();
                    const { error: uploadError } = await supabase.storage
                        .from(bucketName)
                        .upload(storagePath, blob, {
                            cacheControl: '3600',
                            upsert: false,
                            contentType: mime,
                        });
                    if (uploadError) throw uploadError;
                    targetBucket = bucketName;
                    return true;
                } catch (e) {
                    console.warn(`[${bucketName}] Supabase Blob upload failed, trying HTTP:`, e?.message || e);
                    // Fallback: direct HTTP upload with fetch
                    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
                    const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
                    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${encodeURIComponent(storagePath)}`;
                    const headers = {
                        Authorization: `Bearer ${session.access_token}`,
                        apikey: supabaseAnon,
                        'Content-Type': mime,
                        'x-upsert': 'false',
                        'Cache-Control': '3600',
                    };
                    const blob = await makeBlob();
                    const resp = await fetch(uploadUrl, { method: 'POST', headers, body: blob });
                    if (resp.ok) {
                        targetBucket = bucketName;
                        return true;
                    }
                    let details = '';
                    try { details = (await resp.json())?.message || ''; } catch { }
                    throw new Error(details || `HTTP upload failed (status ${resp.status})`);
                }
            };

            try {
                await doUploadToBucket(bucket);
            } catch (err1) {
                const msg = `${err1?.message || ''}`.toLowerCase();
                const missingBucket = msg.includes('bucket not found') || msg.includes('not found');
                if (missingBucket && bucket !== 'chat-images') {
                    console.warn(`Bucket ${bucket} missing; retrying in fallback bucket chat-images`);
                    await doUploadToBucket('chat-images');
                } else {
                    throw err1;
                }
            }

            let fileUrl = supabase.storage.from(targetBucket).getPublicUrl(storagePath)?.data?.publicUrl;
            const { data: signed } = await supabase.storage.from(targetBucket).createSignedUrl(storagePath, 60 * 60 * 24 * 365);
            if (signed?.signedUrl) fileUrl = signed.signedUrl;

            const messageContent = type === 'voice' ? `[VOICE]${fileUrl}` : `[FILE]${name}|${fileUrl}`;
            const { data: messageResult, error: messageError } = await supabase
                .from('messages')
                .insert([{ sender_id: senderId, receiver_id: userId, message: messageContent }])
                .select()
                .single();
            if (messageError) throw messageError;
            setMessages((prev) => [...prev, messageResult]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (err) {
            console.error('Attachment send error:', err);
            const message = `${err?.message || ''}`;
            if (message.toLowerCase().includes('bucket not found')) {
                Alert.alert(
                    'Storage setup required',
                    'The target storage bucket was not found. Please create the buckets "chat-files" and "chat-audio" (or make sure "chat-images" exists for fallback) in Supabase Storage and allow authenticated inserts. After creating, try again.'
                );
            } else {
                Alert.alert('Error', message || 'Failed to send attachment');
            }
        } finally {
            setUploading(false);
        }
    };

    const sendFileAttachment = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: true });
            const canceled = result.canceled ?? result.cancelled;
            if (canceled) return;
            const asset = result.assets?.[0];
            const fileUri = asset?.uri || result.uri;
            const fileName = asset?.name || result.name || `file_${Date.now()}`;
            const mimeType = asset?.mimeType || result?.mimeType || 'application/octet-stream';
            if (!fileUri) throw new Error('No file URI');
            await uploadFileAndSendMessage({ uri: fileUri, name: fileName, mime: mimeType, bucket: 'chat-files', type: 'file' });
        } catch (e) {
            Alert.alert('Error', e.message || 'Failed to pick file');
        }
    };

    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

    const startRecording = async () => {
        try {
            if (uploading || recording) return;
            if (isStartingRef.current) return;
            if (recordingRef.current) return; // another recording is being prepared/active
            setIsPreparing(true);
            isStartingRef.current = true;

            // small cooldown after stopping to let native resources release
            const sinceStop = Date.now() - (lastStopAtRef.current || 0);
            if (sinceStop < 300) {
                await sleep(300 - sinceStop);
            }

            // Request microphone permissions
            const { granted } = await Audio.getPermissionsAsync();
            if (!granted) {
                const { granted: newGrant } = await Audio.requestPermissionsAsync();
                if (!newGrant) {
                    Alert.alert('Permission Denied', 'Microphone access is required to record voice messages');
                    isStartingRef.current = false;
                    return;
                }
            }

            // Ensure previous sound is not holding audio focus
            try {
                if (soundRef.current) {
                    await soundRef.current.unloadAsync();
                    soundRef.current = null;
                }
            } catch { }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
                staysActiveInBackground: true,
            });

            const recording = new Audio.Recording();
            await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            await recording.startAsync();
            recordingRef.current = recording;
            setRecording(true);
        } catch (error) {
            console.error('Recording error:', error);
            Alert.alert('Error', 'Failed to start recording: ' + (error?.message || ''));
            // Clean up partially prepared recording
            try {
                if (recordingRef.current) {
                    await recordingRef.current.stopAndUnloadAsync();
                }
            } catch { }
            recordingRef.current = null;
            setRecording(false);
        } finally {
            isStartingRef.current = false;
            setIsPreparing(false);
        }
    };

    const stopRecording = async () => {
        try {
            if (!recordingRef.current) return;
            setRecording(false);
            let uri = null;
            try {
                await recordingRef.current.stopAndUnloadAsync();
                uri = recordingRef.current.getURI();
            } finally {
                recordingRef.current = null;
                isStartingRef.current = false;
                lastStopAtRef.current = Date.now();
            }

            // Reset audio mode after recording
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            if (uri) {
                await uploadFileAndSendMessage({
                    uri,
                    name: `voice_${Date.now()}.m4a`,
                    mime: 'audio/mp4',
                    bucket: 'chat-audio',
                    type: 'voice',
                });
            }
        } catch (error) {
            console.error('Stop recording error:', error);
            setRecording(false);
            recordingRef.current = null;
            isStartingRef.current = false;
            Alert.alert('Error', 'Failed to stop recording: ' + (error?.message || ''));
        }
    };

    // Cleanup on unmount to avoid dangling recording instances
    useEffect(() => {
        return () => {
            (async () => {
                try {
                    if (recordingRef.current) {
                        await recordingRef.current.stopAndUnloadAsync();
                    }
                } catch { }
                try {
                    if (soundRef.current) {
                        await soundRef.current.unloadAsync();
                    }
                } catch { }
                recordingRef.current = null;
                soundRef.current = null;
                isStartingRef.current = false;
            })();
        };
    }, []);

    const downloadImage = async (imageUrl) => {
        try {
            setDownloading(true);

            // Request media library permission
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow access to save images to your gallery.');
                setDownloading(false);
                return;
            }

            // Ensure URL is viewable/downloadable (add download filename if missing extension)
            const resolvedUrl = getImageViewUrl(imageUrl);

            // Generate filename
            const filename = `chat_image_${Date.now()}.jpg`;
            const fileUri = FileSystem.documentDirectory + filename;

            // Download the image (resumable allows better reliability)
            const downloadResumable = FileSystem.createDownloadResumable(resolvedUrl, fileUri);
            const downloadResult = await downloadResumable.downloadAsync();

            if (downloadResult.status === 200) {
                // Save to media library
                const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
                await MediaLibrary.createAlbumAsync('Chat Images', asset, false);

                Alert.alert('Success', 'Image saved to gallery!');
            } else {
                throw new Error('Download failed');
            }
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Error', 'Failed to download image: ' + error.message);
        } finally {
            setDownloading(false);
        }
    };

    const openImagePreview = (imageUrl) => {
        setImagePreview(imageUrl);
    };

    const closeImagePreview = () => {
        setImagePreview(null);
    };

    const playAudio = async (audioUrl) => {
        try {
            const url = getAudioPlayUrl(audioUrl);
            if (playingId === audioUrl) {
                // Stop playing
                await soundRef.current?.stopAsync();
                await soundRef.current?.unloadAsync();
                soundRef.current = null;
                setPlayingId(null);
                return;
            }

            if (soundRef.current) {
                await soundRef.current.unloadAsync();
            }

            // Set audio mode for playback with better Android support
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
                staysActiveInBackground: false,
            });

            console.log('Loading audio from:', url);

            const { sound } = await Audio.Sound.createAsync(
                {
                    uri: url,
                    overrideFileExtensionAndroid: 'm4a',
                    progressUpdateIntervalMillis: 500,
                },
                {
                    shouldPlay: false,
                    rate: 1.0,
                    volume: 1.0,
                    isMuted: false,
                    isLooping: false,
                },
                (status) => {
                    if (!status.isPlaying && status.didJustFinish) {
                        setPlayingId(null);
                        soundRef.current = null;
                    }
                }
            );

            soundRef.current = sound;
            setPlayingId(url);

            console.log('Audio loaded successfully, now playing');
            await sound.playAsync();
        } catch (error) {
            console.error('Audio playback error details:', {
                message: error.message,
                code: error.code,
                nativeStackAndroid: error.nativeStackAndroid,
                url: url.substring(0, 100),
            });
            Alert.alert('Error', 'Unable to play this audio. Please try again.');
            setPlayingId(null);
            soundRef.current = null;
        }
    };

    const renderMessage = ({ item }) => {
        const isMyMessage = item.sender_id === currentUserId;
        const time = new Date(item.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Check if message contains image
        if (item.message && item.message.startsWith('[IMAGE]')) {
            const rawUrl = item.message.replace('[IMAGE]', '');
            const imageUrl = getImageViewUrl(rawUrl);
            const imageId = item.id;
            const isImageFailed = failedImages[imageId];

            console.log('Image URL:', imageUrl.substring(0, 100));

            if (isImageFailed) {
                return (
                    <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
                        <View style={[styles.messageBubble, isMyMessage && styles.myMessageBubble]}>
                            <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
                                [Image unavailable]
                            </Text>
                            <Text style={[styles.timeText, isMyMessage && styles.myTimeText]}>
                                {time}
                            </Text>
                        </View>
                    </View>
                );
            }

            return (
                <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
                    <View style={[styles.messageBubble, isMyMessage && styles.myMessageBubble, styles.imageBubble]}>
                        <TouchableOpacity onPress={() => openImagePreview(imageUrl)} activeOpacity={0.9}>
                            <Image
                                source={{ uri: imageUrl }}
                                style={styles.messageImage}
                                resizeMode="cover"
                                onError={(e) => {
                                    console.warn('Failed to load image:', imageUrl);
                                    console.warn('Image error details:', e.nativeEvent?.error);
                                    setFailedImages(prev => ({ ...prev, [imageId]: true }));
                                }}
                                onLoadStart={() => console.log('Loading image:', imageUrl.substring(0, 80))}
                                onLoad={() => console.log('Image loaded successfully')}
                            />
                        </TouchableOpacity>
                        <View style={styles.imageFooter}>
                            <TouchableOpacity
                                style={styles.downloadButton}
                                onPress={() => downloadImage(rawUrl)}
                                disabled={downloading}
                            >
                                <Ionicons name="download-outline" size={16} color={isMyMessage ? '#E3F2FD' : '#2196F3'} />
                            </TouchableOpacity>
                            <Text style={[styles.timeText, isMyMessage && styles.myTimeText]}>
                                {time}
                            </Text>
                        </View>
                    </View>
                </View>
            );
        }

        // Check if message contains voice
        if (item.message && item.message.startsWith('[VOICE]')) {
            const audioUrl = item.message.replace('[VOICE]', '');
            const isPlaying = playingId === audioUrl;
            return (
                <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
                    <TouchableOpacity
                        style={[styles.messageBubble, isMyMessage && styles.myMessageBubble, styles.voiceBubble]}
                        onPress={() => playAudio(audioUrl)}
                    >
                        <Ionicons name={isPlaying ? "pause" : "play"} size={24} color={isMyMessage ? '#fff' : '#2196F3'} />
                        <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
                            {isPlaying ? 'Playing...' : 'Voice Message'}
                        </Text>
                        <Text style={[styles.timeText, isMyMessage && styles.myTimeText]}>
                            {time}
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // Check if message contains file
        if (item.message && item.message.startsWith('[FILE]')) {
            const filePart = item.message.replace('[FILE]', '');
            const [fileName, fileUrl] = filePart.split('|');
            return (
                <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
                    <TouchableOpacity
                        style={[styles.messageBubble, isMyMessage && styles.myMessageBubble, styles.fileBubble]}
                        onPress={() => openFile(fileName, fileUrl)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="document" size={24} color={isMyMessage ? '#fff' : '#2196F3'} />
                        <Text style={[styles.messageText, isMyMessage && styles.myMessageText, styles.linkText]} numberOfLines={2}>
                            {fileName}
                        </Text>
                        <Text style={[styles.timeText, isMyMessage && styles.myTimeText]}>
                            {time}
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // Regular text message
        return (
            <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
                <View style={[styles.messageBubble, isMyMessage && styles.myMessageBubble]}>
                    <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
                        {item.message}
                    </Text>
                    <Text style={[styles.timeText, isMyMessage && styles.myTimeText]}>
                        {time}
                    </Text>
                </View>
            </View>
        );
    };

    // If no target user, show placeholder
    if (!userId) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Messages</Text>
                </View>
                <View style={styles.emptyContainer}>
                    <Ionicons name="chatbubbles-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyText}>Select a chat to start</Text>
                    <Text style={styles.emptySubtext}>Choose a student or coach to message</Text>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Ionicons name={otherUserData?.role === 'coach' ? 'people' : 'person-circle'} size={36} color="#fff" />
                <Text style={styles.headerTitle}>
                    {otherUserData?.name || userName}
                </Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>No messages yet</Text>
                        <Text style={styles.emptySubtext}>Start the conversation!</Text>
                    </View>
                }
            />

            <View style={styles.inputContainer}>
                <TouchableOpacity
                    style={[styles.iconButton, uploading && styles.iconButtonDisabled]}
                    onPress={sendFileAttachment}
                    disabled={uploading}
                >
                    <Ionicons name="document-attach" size={24} color="#2196F3" />
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                    maxLength={500}
                    editable={!uploading && !recording}
                />

                <TouchableOpacity
                    style={[styles.iconButton, (uploading || (!recording && isPreparing)) && styles.iconButtonDisabled]}
                    onPress={recording ? stopRecording : startRecording}
                    disabled={uploading || (!recording && isPreparing)}
                >
                    <Ionicons name={recording ? "stop-circle" : "mic"} size={24} color={recording ? "#FF4444" : "#2196F3"} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.sendButton, (!newMessage.trim() || uploading || recording) && styles.sendButtonDisabled]}
                    onPress={sendMessage}
                    disabled={!newMessage.trim() || uploading || recording}
                >
                    {uploading ? (
                        <ActivityIndicator color="#fff" size={20} />
                    ) : (
                        <Ionicons name="send" size={24} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>

            {/* Image Preview Modal */}
            <Modal
                visible={!!imagePreview}
                transparent={true}
                animationType="fade"
                onRequestClose={closeImagePreview}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={closeImagePreview} style={styles.modalCloseButton}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => downloadImage(imagePreview)}
                            style={styles.modalDownloadButton}
                            disabled={downloading}
                        >
                            {downloading ? (
                                <ActivityIndicator color="#fff" size={24} />
                            ) : (
                                <Ionicons name="download" size={28} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>
                    {imagePreview && (
                        <Image
                            source={{ uri: imagePreview }}
                            style={styles.previewImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#2196F3',
        padding: 20,
        paddingTop: 50,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 8,
    },
    messagesList: {
        padding: 16,
        flexGrow: 1,
    },
    messageContainer: {
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    myMessageContainer: {
        alignItems: 'flex-end',
    },
    messageBubble: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 16,
        maxWidth: '75%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    myMessageBubble: {
        backgroundColor: '#2196F3',
    },
    messageText: {
        fontSize: 16,
        color: '#333',
    },
    myMessageText: {
        color: '#fff',
    },
    timeText: {
        fontSize: 10,
        color: '#999',
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    myTimeText: {
        color: '#E3F2FD',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        alignItems: 'flex-end',
        gap: 8,
        paddingBottom: 18,
        marginBottom: 8,
    },
    iconButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconButtonDisabled: {
        opacity: 0.5,
    },
    input: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 16,
    },
    sendButton: {
        backgroundColor: '#2196F3',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#ccc',
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 12,
    },
    imageBubble: {
        padding: 4,
    },
    imageFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingTop: 4,
    },
    downloadButton: {
        padding: 4,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalHeader: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    modalCloseButton: {
        padding: 10,
    },
    modalDownloadButton: {
        padding: 10,
    },
    previewImage: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height * 0.7,
    },
    fileBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    voiceBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 18,
        color: '#999',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#ccc',
        marginTop: 8,
    },
    errorBubble: {
        backgroundColor: '#FFE6E6',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    errorText: {
        fontSize: 14,
        color: '#FF6B6B',
        fontWeight: '500',
    },
    linkText: {
        textDecorationLine: 'underline',
    },
});
