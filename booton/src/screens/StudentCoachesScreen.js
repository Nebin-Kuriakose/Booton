import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

export default function StudentCoachesScreen({ navigation }) {
    const [coachData, setCoachData] = useState(null);
    const [paidCoaches, setPaidCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        getCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUserId) {
            fetchStudentData();
            fetchPaidCoaches();
        }
    }, [currentUserId]);

    const getCurrentUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setCurrentUserId(user.id);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to get user data');
        }
    };

    const fetchStudentData = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', currentUserId)
                .single();

            if (error) throw error;
            setCoachData(data);
        } catch (error) {
            console.log('Error fetching student data:', error.message);
        }
    };

    const fetchPaidCoaches = async () => {
        try {
            const { data, error } = await supabase
                .from('coach_students')
                .select('*, coach_id, student_id')
                .eq('student_id', currentUserId)
                .eq('payment_status', 'completed')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch coach details for each relationship
            if (data && data.length > 0) {
                const coachIds = data.map(item => item.coach_id);
                const { data: coachData, error: coachError } = await supabase
                    .from('users')
                    .select('id, name, email, profile_image, position, experience')
                    .in('id', coachIds);

                if (coachError) throw coachError;

                // Map coach data to coach_students records
                const enrichedData = data.map(item => ({
                    ...item,
                    coach: coachData?.find(coach => coach.id === item.coach_id)
                }));

                setPaidCoaches(enrichedData);
            } else {
                setPaidCoaches([]);
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderCoach = ({ item }) => (
        <View style={styles.coachCard}>
            <View style={styles.coachInfo}>
                {item.coach?.profile_image ? (
                    <Image
                        source={{ uri: item.coach.profile_image }}
                        style={styles.coachImage}
                    />
                ) : (
                    <Ionicons name="person-circle" size={60} color="#FF9800" />
                )}
                <View style={styles.details}>
                    <Text style={styles.coachName}>{item.coach?.name}</Text>
                    <Text style={styles.coachEmail}>{item.coach?.email}</Text>
                    {item.coach?.position && (
                        <Text style={styles.coachPosition}>{item.coach.position}</Text>
                    )}
                    {item.coach?.experience && (
                        <Text style={styles.coachExperience}>Experience: {item.coach.experience}</Text>
                    )}
                    <View style={styles.statusBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                        <Text style={styles.statusText}>Active Coaching</Text>
                    </View>
                </View>
            </View>
            <TouchableOpacity
                style={styles.chatButton}
                onPress={() => navigation.navigate('Chat', {
                    userId: item.coach_id,
                    userName: item.coach?.name,
                    allowFileShare: true
                })}
            >
                <Ionicons name="chatbubble" size={20} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Coaches</Text>
                </View>
                <ActivityIndicator size="large" color="#FF9800" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Coaches</Text>
            </View>

            {paidCoaches.length > 0 ? (
                <FlatList
                    data={paidCoaches}
                    renderItem={renderCoach}
                    keyExtractor={(item) => item.coach_id}
                    contentContainerStyle={styles.listContainer}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyText}>No Coaches Yet</Text>
                    <Text style={styles.emptySubtext}>You haven't enrolled in any coaching sessions yet</Text>
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
        backgroundColor: '#FF9800',
        padding: 20,
        paddingTop: 50,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    listContainer: {
        padding: 16,
    },
    coachCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    coachInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    coachImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#f0f0f0',
    },
    details: {
        marginLeft: 12,
        flex: 1,
    },
    coachName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    coachEmail: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
    },
    coachPosition: {
        fontSize: 12,
        color: '#FF9800',
        fontWeight: '500',
        marginTop: 2,
    },
    coachExperience: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    statusText: {
        fontSize: 12,
        color: '#4CAF50',
        marginLeft: 4,
        fontWeight: '500',
    },
    chatButton: {
        backgroundColor: '#FF9800',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
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
