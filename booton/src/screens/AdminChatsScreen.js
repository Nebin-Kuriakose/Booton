import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

export default function AdminChatsScreen({ navigation }) {
    const [chatSessions, setChatSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentAdminId, setCurrentAdminId] = useState(null);

    useEffect(() => {
        getAdminUser();
    }, []);

    useEffect(() => {
        if (currentAdminId) {
            fetchChatSessions();
            const interval = setInterval(fetchChatSessions, 3000); // Refresh every 3 seconds
            return () => clearInterval(interval);
        }
    }, [currentAdminId]);

    const getAdminUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setCurrentAdminId(user.id);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to get user data');
        }
    };

    const fetchChatSessions = async () => {
        try {
            // Get all distinct users who have messaged the admin
            const { data, error } = await supabase
                .from('messages')
                .select('sender_id, sender:users(id, name, role, email)')
                .eq('receiver_id', currentAdminId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                // Remove duplicates and get unique chat sessions
                const uniqueSessions = {};
                data.forEach((msg) => {
                    if (msg.sender_id && !uniqueSessions[msg.sender_id]) {
                        uniqueSessions[msg.sender_id] = {
                            userId: msg.sender_id,
                            userName: msg.sender?.name || 'Unknown User',
                            userRole: msg.sender?.role || 'Unknown',
                            userEmail: msg.sender?.email || '',
                            lastMessage: msg.message,
                            lastMessageTime: msg.created_at
                        };
                    }
                });

                const sessionsArray = Object.values(uniqueSessions);
                setChatSessions(sessionsArray);
            } else {
                setChatSessions([]);
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChatPress = (userId, userName) => {
        navigation.navigate('Chat', {
            userId: userId,
            userName: userName,
            isAdminChat: false
        });
    };

    const renderChatSession = ({ item }) => {
        const isCoach = item.userRole === 'coach';
        const roleColor = isCoach ? '#4CAF50' : '#FF9800';
        const roleIcon = isCoach ? 'people' : 'person';

        const lastMessageTime = new Date(item.lastMessageTime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return (
            <TouchableOpacity
                style={styles.chatSession}
                onPress={() => handleChatPress(item.userId, item.userName)}
            >
                <View style={[styles.avatarContainer, { backgroundColor: roleColor }]}>
                    <Ionicons name={roleIcon} size={30} color="#fff" />
                </View>
                <View style={styles.sessionInfo}>
                    <View style={styles.headerRow}>
                        <Text style={styles.userName}>{item.userName}</Text>
                        <Text style={styles.time}>{lastMessageTime}</Text>
                    </View>
                    <Text style={styles.userRole}>{item.userRole.charAt(0).toUpperCase() + item.userRole.slice(1)}</Text>
                    <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && chatSessions.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Messages</Text>
                </View>
                <ActivityIndicator size="large" color="#2196F3" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messages</Text>
            </View>

            {chatSessions.length > 0 ? (
                <FlatList
                    data={chatSessions}
                    renderItem={renderChatSession}
                    keyExtractor={(item) => item.userId}
                    contentContainerStyle={styles.listContainer}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="chatbubbles-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyText}>No messages yet</Text>
                    <Text style={styles.emptySubtext}>Coaches and students will appear here when they message you</Text>
                </View>
            )}
        </View>
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
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    listContainer: {
        padding: 10,
    },
    chatSession: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sessionInfo: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    time: {
        fontSize: 12,
        color: '#999',
    },
    userRole: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    lastMessage: {
        fontSize: 13,
        color: '#999',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
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
        textAlign: 'center',
    },
});
