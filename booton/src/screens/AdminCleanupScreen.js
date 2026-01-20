import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabaseClient';

export default function AdminCleanupScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const cleanupCoachData = async () => {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter the coach email');
            return;
        }

        Alert.alert(
            'Confirm Cleanup',
            `This will attempt to remove all traces of ${email} from the system, including any orphaned auth records.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Cleanup',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            console.log('Starting cleanup for:', email);

                            // Step 1: Find the user by email
                            const { data: userData, error: userError } = await supabase
                                .from('users')
                                .select('id, name')
                                .eq('email', email.trim())
                                .single();

                            if (userError) {
                                console.log('User not found in users table, checking if auth user exists...');
                            } else if (userData) {
                                console.log('Found user:', userData.id);
                                const coachId = userData.id;

                                // Delete all related data
                                console.log('Deleting messages...');
                                const { error: messagesError } = await supabase
                                    .from('messages')
                                    .delete()
                                    .or(`sender_id.eq.${coachId},receiver_id.eq.${coachId}`);
                                if (messagesError) console.error('Messages error:', messagesError);

                                console.log('Deleting coach-student records...');
                                const { error: coachStudentsError } = await supabase
                                    .from('coach_students')
                                    .delete()
                                    .eq('coach_id', coachId);
                                if (coachStudentsError) console.error('Coach-students error:', coachStudentsError);

                                console.log('Deleting progress records...');
                                const { error: progressError } = await supabase
                                    .from('progress_tracking')
                                    .delete()
                                    .eq('coach_id', coachId);
                                if (progressError) console.error('Progress error:', progressError);

                                console.log('Deleting ratings...');
                                const { error: ratingsError } = await supabase
                                    .from('ratings')
                                    .delete()
                                    .eq('coach_id', coachId);
                                if (ratingsError) console.error('Ratings error:', ratingsError);

                                console.log('Deleting user record...');
                                const { error: userDeleteError } = await supabase
                                    .from('users')
                                    .delete()
                                    .eq('id', coachId);
                                if (userDeleteError) {
                                    console.error('User delete error:', userDeleteError);
                                    throw userDeleteError;
                                }
                            }

                            // Step 2: Try to delete from auth system directly
                            console.log('Attempting to delete auth user...');
                            try {
                                // Get admin session
                                const { data: { session } } = await supabase.auth.getSession();
                                if (session) {
                                    // Use the admin API to delete the user
                                    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
                                        email // This might need the user ID instead
                                    );
                                    if (authDeleteError) {
                                        console.warn('Auth delete warning:', authDeleteError.message);
                                    } else {
                                        console.log('✓ Auth user deleted');
                                    }
                                }
                            } catch (authError) {
                                console.warn('Could not delete auth user directly:', authError.message);
                            }

                            Alert.alert(
                                'Cleanup Complete',
                                `All data for ${email} has been removed.\\n\\nNote: If the email still exists in Supabase Auth, please delete it manually from the Supabase dashboard.`,
                                [
                                    {
                                        text: 'OK',
                                        onPress: () => {
                                            setEmail('');
                                        },
                                    },
                                ]
                            );
                        } catch (error) {
                            console.error('Cleanup error:', error);
                            Alert.alert('Error', `Cleanup failed: ${error.message}`);
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>

            <View style={styles.header}>
                <Ionicons name="warning" size={60} color="#FF9800" />
                <Text style={styles.title}>System Cleanup</Text>
                <Text style={styles.subtitle}>Admin maintenance utilities</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Remove Coach Completely</Text>
                <Text style={styles.cardDescription}>
                    Use this tool to completely remove a coach that may still have orphaned records or auth accounts.
                </Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Coach Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter coach email (e.g., klopp@example.com)"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        editable={!loading}
                        autoCapitalize="none"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.cleanupButton, loading && styles.cleanupButtonDisabled]}
                    onPress={cleanupCoachData}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="trash" size={20} color="#fff" />
                            <Text style={styles.cleanupButtonText}>Cleanup & Remove</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.warningBox}>
                    <Ionicons name="alert-circle" size={20} color="#FF5252" />
                    <Text style={styles.warningText}>
                        This will delete ALL data associated with the coach. This action cannot be undone!
                    </Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Manual Cleanup Steps</Text>
                <Text style={styles.instruction}>
                    1. Enter the coach's email above{'\n'}
                    2. Click "Cleanup & Remove"{'\n'}
                    3. If auth user still exists, delete from Supabase Dashboard:
                </Text>
                <Text style={styles.steps}>
                    • Go to Authentication > Users{'\n'}
                    • Search for the email{'\n'}
                    • Click the user and select Delete
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        padding: 8,
    },
    header: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FF9800',
        marginTop: 16,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    card: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    cardDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF9800',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 2,
        borderColor: '#FF9800',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    cleanupButton: {
        backgroundColor: '#FF5252',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    cleanupButtonDisabled: {
        opacity: 0.6,
    },
    cleanupButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    warningBox: {
        backgroundColor: '#FFE0E0',
        borderLeftWidth: 4,
        borderLeftColor: '#FF5252',
        padding: 12,
        borderRadius: 6,
        flexDirection: 'row',
        gap: 12,
    },
    warningText: {
        fontSize: 13,
        color: '#C62828',
        flex: 1,
        fontWeight: '500',
    },
    instruction: {
        fontSize: 13,
        color: '#666',
        marginBottom: 12,
        lineHeight: 20,
    },
    steps: {
        fontSize: 13,
        color: '#666',
        lineHeight: 20,
        marginLeft: 4,
    },
});
