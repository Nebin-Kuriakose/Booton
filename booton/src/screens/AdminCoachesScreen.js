import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabaseClient';

export default function AdminCoachesScreen({ navigation }) {
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCoaches();
    }, []);

    const fetchCoaches = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'coach')
                .eq('is_approved', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCoaches(data || []);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const removeCoach = async (coachId, coachName) => {
        Alert.alert(
            'Confirm Removal',
            `Are you sure you want to permanently remove ${coachName}? This action cannot be undone. All their data, messages, and records will be deleted.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove Permanently',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            console.log('Starting coach removal process for:', coachId);

                            // First, get the coach's email before deletion
                            const { data: coachData, error: fetchError } = await supabase
                                .from('users')
                                .select('email')
                                .eq('id', coachId)
                                .single();

                            if (fetchError || !coachData) {
                                throw new Error('Could not find coach email');
                            }

                            const coachEmail = coachData.email;

                            // Delete all related data first in correct order
                            // 1. Delete all messages where coach is sender or receiver
                            const { error: messagesError } = await supabase
                                .from('messages')
                                .delete()
                                .or(`sender_id.eq.${coachId},receiver_id.eq.${coachId}`);

                            if (messagesError) {
                                console.error('Messages delete error:', messagesError);
                                throw new Error(`Failed to delete messages: ${messagesError.message}`);
                            }
                            console.log('✓ Messages deleted');

                            // 2. Delete all coach-student relationships
                            const { error: coachStudentsError } = await supabase
                                .from('coach_students')
                                .delete()
                                .eq('coach_id', coachId);

                            if (coachStudentsError) {
                                console.error('Coach-students delete error:', coachStudentsError);
                                throw new Error(`Failed to delete coach-student records: ${coachStudentsError.message}`);
                            }
                            console.log('✓ Coach-student records deleted');

                            // 3. Delete all progress tracking records
                            const { error: progressError } = await supabase
                                .from('progress_tracking')
                                .delete()
                                .eq('coach_id', coachId);

                            if (progressError) {
                                console.error('Progress delete error:', progressError);
                                throw new Error(`Failed to delete progress records: ${progressError.message}`);
                            }
                            console.log('✓ Progress records deleted');

                            // 4. Delete all ratings
                            const { error: ratingsError } = await supabase
                                .from('ratings')
                                .delete()
                                .eq('coach_id', coachId);

                            if (ratingsError) {
                                console.error('Ratings delete error:', ratingsError);
                                throw new Error(`Failed to delete ratings: ${ratingsError.message}`);
                            }
                            console.log('✓ Ratings deleted');

                            // 5. Finally delete the user record (which will cascade delete due to FK constraints)
                            const { error: userError } = await supabase
                                .from('users')
                                .delete()
                                .eq('id', coachId);

                            if (userError) {
                                console.error('User delete error:', userError);
                                throw new Error(`Failed to delete user: ${userError.message}`);
                            }
                            console.log('✓ User record deleted');

                            // 6. Add to deleted_coaches table to prevent re-signup
                            const { error: deletedCoachError } = await supabase
                                .from('deleted_coaches')
                                .insert([
                                    {
                                        email: coachEmail,
                                        name: coachName,
                                    }
                                ]);

                            if (deletedCoachError) {
                                console.warn('Warning: Could not add to deleted_coaches list:', deletedCoachError);
                                // Don't throw, as the main deletion was successful
                            }
                            console.log('✓ Added to deleted coaches list');

                            Alert.alert('Success', `${coachName} has been permanently removed from the system.\n\nAll their data, messages, and records have been deleted.`, [
                                { text: 'OK', onPress: () => fetchCoaches() }
                            ]);
                        } catch (error) {
                            console.error('Complete removal error:', error);
                            Alert.alert('Removal Error', `${error.message}\n\nPlease check the console for details.`);
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const renderCoach = ({ item }) => (
        <View style={styles.coachCard}>
            <View style={styles.coachInfo}>
                <Ionicons name="person-circle" size={40} color="#4CAF50" />
                <View style={styles.coachDetails}>
                    <Text style={styles.coachName}>{item.name}</Text>
                    <Text style={styles.coachEmail}>{item.email}</Text>
                    {item.experience && (
                        <Text style={styles.coachMeta}>Experience: {item.experience}</Text>
                    )}
                    {item.payment_fee && (
                        <Text style={styles.coachMeta}>Fee: ₹{item.payment_fee}/month</Text>
                    )}
                    {item.achievements && (
                        <Text style={styles.coachMeta}>Achievements: {item.achievements}</Text>
                    )}
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => navigation.navigate('Chat', { userId: item.id, userName: item.name })}
                >
                    <Ionicons name="chatbubble" size={20} color="#2196F3" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeCoach(item.id, item.name)}
                >
                    <Ionicons name="trash" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#2196F3" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Coaches</Text>
            </View>

            <FlatList
                data={coaches}
                renderItem={renderCoach}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No coaches found</Text>
                }
            />
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
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    list: {
        padding: 16,
    },
    coachCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    coachInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
    },
    coachDetails: {
        marginLeft: 12,
        flex: 1,
    },
    coachName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    coachEmail: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    coachMeta: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    chatButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f44336',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 40,
        fontSize: 16,
    },
});
