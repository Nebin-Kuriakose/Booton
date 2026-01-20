import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabaseClient';

export default function ApplicationsScreen({ navigation }) {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApplications();
        subscribeToApplicationChanges();

        return () => {
            // Cleanup subscription on unmount
            supabase.removeAllChannels();
        };
    }, []);

    const fetchApplications = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'coach')
                .eq('is_approved', false)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setApplications(data || []);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToApplicationChanges = () => {
        const channel = supabase
            .channel('applications-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'users',
                    filter: 'role=eq.coach',
                },
                (payload) => {
                    // On UPDATE: if is_approved became true, remove from list
                    if (payload.eventType === 'UPDATE') {
                        if (payload.new.is_approved === true) {
                            setApplications((prev) =>
                                prev.filter((app) => app.id !== payload.new.id)
                            );
                        }
                    }
                    // On DELETE: remove from list
                    else if (payload.eventType === 'DELETE') {
                        setApplications((prev) =>
                            prev.filter((app) => app.id !== payload.old.id)
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handleAccept = async (coachId, coachName) => {
        Alert.alert(
            'Accept Application',
            `Accept ${coachName} as a coach?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Accept',
                    onPress: async () => {
                        try {
                            console.log('Attempting to update coach:', coachId);
                            const { data, error } = await supabase
                                .from('users')
                                .update({ is_approved: true })
                                .eq('id', coachId);

                            console.log('Update response:', { data, error });

                            if (error) {
                                console.error('Update error details:', error);
                                throw error;
                            }

                            // Immediately remove from list
                            setApplications((prev) =>
                                prev.filter((app) => app.id !== coachId)
                            );

                            Alert.alert('Success', 'Coach application accepted');
                        } catch (error) {
                            console.error('handleAccept error:', error);
                            Alert.alert('Error', error.message || 'Failed to update application');
                        }
                    },
                },
            ]
        );
    };

    const handleReject = async (coachId, coachName) => {
        Alert.alert(
            'Reject Application',
            `Reject ${coachName}'s application? This will delete their account.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            console.log('Attempting to delete coach:', coachId);
                            const { data, error } = await supabase
                                .from('users')
                                .delete()
                                .eq('id', coachId);

                            console.log('Delete response:', { data, error });

                            if (error) {
                                console.error('Delete error details:', error);
                                throw error;
                            }

                            // Immediately remove from list
                            setApplications((prev) =>
                                prev.filter((app) => app.id !== coachId)
                            );

                            Alert.alert('Success', 'Coach application rejected');
                        } catch (error) {
                            console.error('handleReject error:', error);
                            Alert.alert('Error', error.message || 'Failed to reject application');
                        }
                    },
                },
            ]
        );
    };

    const renderApplication = ({ item }) => (
        <View style={styles.applicationCard}>
            <View style={styles.header}>
                <Ionicons name="person-circle" size={50} color="#4CAF50" />
                <View style={styles.applicationInfo}>
                    <Text style={styles.coachName}>{item.name}</Text>
                    <Text style={styles.coachEmail}>{item.email}</Text>
                </View>
            </View>

            <View style={styles.details}>
                {item.experience && (
                    <View style={styles.detailRow}>
                        <Ionicons name="briefcase" size={20} color="#666" />
                        <Text style={styles.detailText}>Experience: {item.experience}</Text>
                    </View>
                )}
                {item.payment_fee && (
                    <View style={styles.detailRow}>
                        <Ionicons name="cash" size={20} color="#666" />
                        <Text style={styles.detailText}>Fee: ₹{item.payment_fee}/month</Text>
                    </View>
                )}
                {item.achievements && (
                    <View style={styles.detailRow}>
                        <Ionicons name="trophy" size={20} color="#666" />
                        <Text style={styles.detailText}>Achievements: {item.achievements}</Text>
                    </View>
                )}
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAccept(item.id, item.name)}
                >
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(item.id, item.name)}
                >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                    <Text style={styles.buttonText}>Reject</Text>
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
            <View style={styles.headerBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Coach Applications</Text>
                {applications.length > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{applications.length}</Text>
                    </View>
                )}
            </View>

            <FlatList
                data={applications}
                renderItem={renderApplication}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="checkmark-done-circle" size={80} color="#ccc" />
                        <Text style={styles.emptyText}>No pending applications</Text>
                    </View>
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
    headerBar: {
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
        flex: 1,
    },
    badge: {
        backgroundColor: '#f44336',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        minWidth: 24,
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    list: {
        padding: 16,
    },
    applicationCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    applicationInfo: {
        marginLeft: 12,
        flex: 1,
    },
    coachName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    coachEmail: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    details: {
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 8,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    acceptButton: {
        flex: 1,
        backgroundColor: '#4CAF50',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    rejectButton: {
        flex: 1,
        backgroundColor: '#f44336',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 16,
        fontSize: 16,
    },
});
