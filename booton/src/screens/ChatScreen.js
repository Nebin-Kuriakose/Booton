import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Audio from 'expo-av';
import { supabase } from '../services/supabaseClient';

export default function ChatScreen({ route, navigation }) {
    const { userId, userName, isAdminChat, chatWith } = route?.params || {};
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUserId, setCurrentUserId] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [adminUserId, setAdminUserId] = useState(null);
    const [otherUserData, setOtherUserData] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [recording, setRecording] = useState(false);
    const [playingId, setPlayingId] = useState(null);
    const recordingRef = useRef(null);
    const soundRef = useRef(null);
    const flatListRef = useRef(null);

    useEffect(() => {
        getCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUserId) {
            if (isAdminChat && chatWith === 'admin') {
                // For admin chat, fetch admin user ID first
                fetchAdminUser();
            } else if (userId) {
                // For regular chats and admin viewing chats
                fetchUserData(userId);
                fetchMessages(userId);
                subscribeToMessages(userId);
            }
        }
    }, [currentUserId, userId, isAdminChat]);

    const getCurrentUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setCurrentUserId(user.id);
                setUserRole(user.role);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to get user data');
        }
    };

    const fetchUserData = async (uId) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, role')
                .eq('id', uId)
                .single();

            if (error) throw error;
            setOtherUserData(data);
        } catch (error) {
            console.log('Error fetching user data:', error.message);
        }
    };

    const fetchAdminUser = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'admin')
                .limit(1)
                .single();

            if (error) throw error;

            if (data) {
                setAdminUserId(data.id);
                fetchMessages(data.id);
                subscribeToMessages(data.id);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not find admin. Please try again later.');
        }
    };

    const fetchMessages = async (receiverId = userId) => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);

            // Scroll to bottom after loading messages
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const subscribeToMessages = (receiverId = userId) => {
        if (!receiverId || !currentUserId) return;

        const channel = supabase
            .channel(`messages-${currentUserId}-${receiverId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `or(and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId}),and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}))`
                },
                (payload) => {
                    setMessages((prevMessages) => [...prevMessages, payload.new]);
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            const receiverId = isAdminChat ? adminUserId : userId;

            // Get current auth session to ensure RLS works
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                Alert.alert('Error', 'Not authenticated. Please log in again.');
                return;
            }

            const messageData = {
                sender_id: session.user.id,
                receiver_id: receiverId,
                message: newMessage.trim(),
            };

            const { data, error } = await supabase
                .from('messages')
                .insert([messageData])
                .select()
                .single();

            if (error) throw error;

            setMessages((prevMessages) => [...prevMessages, data]);
            setNewMessage('');

            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const pickAndSendImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.cancelled && result.assets && result.assets.length > 0) {
                const imageUri = result.assets[0].uri;
                await uploadAndSendFile(imageUri, 'image');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const pickAndSendFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
            });

            if (!result.cancelled && result.assets && result.assets.length > 0) {
                const fileUri = result.assets[0].uri;
                const fileName = result.assets[0].name;
                await uploadAndSendFile(fileUri, 'file', fileName);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick file');
        }
    };

    const uploadAndSendFile = async (fileUri, fileType, fileName = null) => {
        try {
            setUploading(true);

            // Get current auth session to ensure RLS works
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                Alert.alert('Error', 'Not authenticated. Please log in again.');
                setUploading(false);
                return;
            }

            const senderId = session.user.id;
            const receiverId = isAdminChat ? adminUserId : userId;

            // Generate a unique filename
            const timestamp = Date.now();
            const uploadFileName = fileName || `${timestamp}_${fileType}`;
            const bucket = fileType === 'image' ? 'chat-images' : 'chat-files';

            // Upload file to Supabase storage
            const { data, error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(`${senderId}/${receiverId}/${uploadFileName}`, {
                    uri: fileUri,
                    type: fileType === 'image' ? 'image/jpeg' : 'application/octet-stream',
                    name: uploadFileName,
                });

            if (uploadError) {
                if (uploadError.message && uploadError.message.includes('Bucket not found')) {
                    Alert.alert(
                        'Setup Required',
                        'Storage buckets need to be created in Supabase.\n\n1. Go to your Supabase dashboard\n2. Click Storage\n3. Create a new bucket named "chat-images" (public)\n4. Create a new bucket named "chat-files" (public)\n5. Try again',
                        [{ text: 'OK' }]
                    );
                } else {
                    throw uploadError;
                }
                return;
            }

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(`${senderId}/${receiverId}/${uploadFileName}`);

            const fileUrl = publicUrlData.publicUrl;

            // Send message with file URL
            const messageData = {
                sender_id: senderId,
                receiver_id: receiverId,
                message: fileType === 'image' ? `[IMAGE]${fileUrl}` : `[FILE]${fileName || uploadFileName}|${fileUrl}`,
            };

            const { data: messageResult, error: messageError } = await supabase
                .from('messages')
                .insert([messageData])
                .select()
                .single();

            if (messageError) throw messageError;

            setMessages((prevMessages) => [...prevMessages, messageResult]);
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);

            Alert.alert('Success', `${fileType === 'image' ? 'Image' : 'File'} sent successfully!`);
        } catch (error) {
            Alert.alert('Error', `Failed to send ${fileType}: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Microphone access is required to record voice messages');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const recording = new Audio.Recording();
            await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            await recording.startAsync();
            recordingRef.current = recording;
            setRecording(true);
        } catch (error) {
            Alert.alert('Error', 'Failed to start recording: ' + error.message);
        }
    };

    const stopRecording = async () => {
        try {
            if (!recordingRef.current) return;

            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;
            setRecording(false);

            if (uri) {
                await uploadAndSendFile(uri, 'voice', `voice_${Date.now()}.caf`);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to stop recording: ' + error.message);
        }
    };

    const playAudio = async (audioUrl) => {
        try {
            if (playingId === audioUrl) {
                // Stop playing
                await soundRef.current?.stopAsync();
                setPlayingId(null);
                return;
            }

            if (soundRef.current) {
                await soundRef.current.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
            soundRef.current = sound;
            setPlayingId(audioUrl);
            await sound.playAsync();
        } catch (error) {
            Alert.alert('Error', 'Failed to play audio: ' + error.message);
        }
    };

    const renderMessage = ({ item }) => {
        const isMyMessage = item.sender_id === currentUserId;
        const time = new Date(item.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Check if message contains image
        if (item.message.startsWith('[IMAGE]')) {
            const imageUrl = item.message.replace('[IMAGE]', '');
            return (
                <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
                    <View style={[styles.messageBubble, isMyMessage && styles.myMessageBubble]}>
                        <Image source={{ uri: imageUrl }} style={styles.messageImage} />
                        <Text style={[styles.timeText, isMyMessage && styles.myTimeText]}>
                            {time}
                        </Text>
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
                    <TouchableOpacity style={[styles.messageBubble, isMyMessage && styles.myMessageBubble, styles.fileBubble]}>
                        <Ionicons name="document" size={24} color={isMyMessage ? '#fff' : '#2196F3'} />
                        <Text style={[styles.messageText, isMyMessage && styles.myMessageText]} numberOfLines={2}>
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

    // If no userId and not admin chat, show placeholder screen
    if (!userId && !isAdminChat) {
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
                <Ionicons
                    name={isAdminChat ? "shield-checkmark" : (otherUserData?.role === 'coach' ? 'people' : 'person-circle')}
                    size={36}
                    color="#fff"
                />
                <Text style={styles.headerTitle}>
                    {isAdminChat ? 'Admin Support' : (otherUserData?.name || userName)}
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
                    onPress={pickAndSendImage}
                    disabled={uploading}
                >
                    <Ionicons name="image" size={24} color="#2196F3" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.iconButton, uploading && styles.iconButtonDisabled]}
                    onPress={pickAndSendFile}
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
                    style={[styles.iconButton, (uploading || recording) && styles.iconButtonDisabled]}
                    onPress={recording ? stopRecording : startRecording}
                    disabled={uploading}
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
        marginBottom: 4,
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
});
