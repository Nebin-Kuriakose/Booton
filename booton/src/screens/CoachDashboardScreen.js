import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

export default function CoachDashboardScreen({ navigation }) {
    const [coachData, setCoachData] = useState(null);
    const [recentChats, setRecentChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        fetchCoachData();
        fetchRecentChats();
    }, []);

    const fetchCoachData = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (userId) {
                setCurrentUserId(userId);
                const { data, error } = await supabase
                    .from('coaches')
                    .select('*')
                    .eq('user_id', userId)
                    .single();

                if (error) throw error;
                setCoachData(data);
            }
        } catch (error) {
            console.log('Error fetching coach data:', error.message);
        }
    };

    const fetchRecentChats = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) return;
            setCurrentUserId(userId);

            const { data: messageData, error: messageError } = await supabase
                .from('messages')
                .select('sender_id, receiver_id, content, created_at')
                .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
                .order('created_at', { ascending: false });

            if (messageError) throw messageError;

            if (messageData && messageData.length > 0) {
                // Group by conversation and get the latest message and user info
                const chatMap = new Map();

                for (const msg of messageData) {
                    const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;

                    if (!chatMap.has(otherUserId)) {
                        // Fetch user info
                        const { data: userData } = await supabase
                            .from('users')
                            .select('id, name, email')
                            .eq('id', otherUserId)
                            .single();

                        if (userData) {
                            chatMap.set(otherUserId, {
                                student_id: otherUserId,
                                name: userData.name,
                                email: userData.email,
                                lastMessage: msg.content,
                                lastMessageTime: msg.created_at
                            });
                        }
                    }
                }

                // Convert to array and sort by latest message
                const chatsArray = Array.from(chatMap.values()).sort(
                    (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
                );

                setRecentChats(chatsArray);
            }
        } catch (error) {
            console.log('Error fetching recent chats:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderRecentChat = ({ item }) => {

        const formatTime = (timestamp) => {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString();
        };

        const truncateMessage = (text, length = 50) => {
            return text.length > length ? text.substring(0, length) + '...' : text;
        };

        return (
            <TouchableOpacity
                style={styles.chatCard}
                onPress={() => navigation.navigate('Chat', {
                    userId: item.student_id,
                    userName: item.name,
                    allowFileShare: true
                })}
            >
                <Ionicons name="person-circle" size={50} color="#4CAF50" />
                <View style={styles.chatInfo}>
                    <Text style={styles.chatName}>{item.name}</Text>
                    <Text style={styles.chatMessage}>{truncateMessage(item.lastMessage)}</Text>
                </View>
                <Text style={styles.chatTime}>{formatTime(item.lastMessageTime)}</Text>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Dashboard</Text>
            </View>

            {/* Profile Card */}
            <View style={styles.profileCard}>
                <Ionicons name="person-circle" size={60} color="#4CAF50" />
                <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{coachData?.name}</Text>
                    <Text style={styles.profileEmail}>{coachData?.email}</Text>
                    {coachData?.experience && (
                        <Text style={styles.profileMeta}>Experience: {coachData.experience}</Text>
                    )}
                    {coachData?.payment_fee && (
                        <Text style={styles.profileMeta}>Fee: ₹{coachData.payment_fee}/month</Text>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => navigation.navigate('CoachEditProfile')}
                >
                    <Ionicons name="pencil" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Recent Chats Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Chats ({recentChats.length})</Text>
                {recentChats.length === 0 ? (
                    <Text style={styles.emptyText}>No recent chats yet</Text>
                ) : (
                    <FlatList
                        data={recentChats}
                        renderItem={renderRecentChat}
                        keyExtractor={(item) => item.student_id}
                        scrollEnabled={false}
                    />
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#4CAF50',
        padding: 20,
        paddingTop: 50,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileCard: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    profileInfo: {
        flex: 1,
        marginLeft: 12,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    profileEmail: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    profileMeta: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    editButton: {
        backgroundColor: '#4CAF50',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    chatCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    chatInfo: {
        flex: 1,
        marginLeft: 12,
    },
    chatName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    chatMessage: {
        fontSize: 14,
        color: '#999',
        marginTop: 4,
    },
    chatTime: {
        fontSize: 12,
        color: '#bbb',
        fontWeight: '500',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20,
        fontSize: 14,
    },
});
