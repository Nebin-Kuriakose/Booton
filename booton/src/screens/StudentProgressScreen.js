import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { BarChart } from 'react-native-chart-kit';

// Separate component for rendering coach progress
function CoachProgressCard({ item, fetchProgressForCoach, progressCache, setProgressCache }) {
    const [progress, setProgress] = useState([]);

    useEffect(() => {
        fetchProgressForCoach(item.coach_id).then(setProgress);
    }, [item.coach_id]);

    const chartData = {
        labels: progress.map(p => `W${p.week}`),
        datasets: [{ data: progress.map(p => p.points) }]
    };

    return (
        <View style={styles.coachCard}>
            <View style={styles.coachHeader}>
                <Ionicons name="person-circle" size={44} color="#FF9800" />
                <View style={styles.coachInfo}>
                    <Text style={styles.coachName}>{item.coach?.name}</Text>
                    <Text style={styles.coachEmail}>{item.coach?.email}</Text>
                </View>
            </View>
            <View style={styles.chartPreview}>
                <Text style={styles.chartLabel}>Weekly Progress</Text>
                {progress.length > 0 ? (
                    <BarChart
                        data={chartData}
                        width={Dimensions.get('window').width - 64}
                        height={180}
                        yAxisLabel=""
                        chartConfig={{
                            backgroundColor: '#fff',
                            backgroundGradientFrom: '#fff',
                            backgroundGradientTo: '#fff',
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        }}
                        style={{ borderRadius: 8 }}
                    />
                ) : (
                    <Text style={{ color: '#999', textAlign: 'center', marginTop: 16 }}>No progress yet</Text>
                )}
            </View>
        </View>
    );
}

export default function StudentProgressScreen({ navigation }) {
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        getCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUserId) {
            fetchCoaches();
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

    const fetchCoaches = async () => {
        try {
            // Get coach_students records for this student with completed payment
            const { data: coachStudentData, error: csError } = await supabase
                .from('coach_students')
                .select('coach_id')
                .eq('student_id', currentUserId)
                .eq('payment_status', 'completed')
                .order('created_at', { ascending: false });

            if (csError) throw csError;

            if (!coachStudentData || coachStudentData.length === 0) {
                setCoaches([]);
                setLoading(false);
                return;
            }

            // Get coach IDs
            const coachIds = coachStudentData.map(cs => cs.coach_id);

            // Fetch coach details
            const { data: coachData, error: cError } = await supabase
                .from('users')
                .select('id, name, email')
                .in('id', coachIds);

            if (cError) throw cError;

            // Combine coach_students and coach data
            const enrichedData = coachStudentData.map(cs => {
                const coach = coachData?.find(c => c.id === cs.coach_id);
                return {
                    ...cs,
                    coach: coach
                };
            });

            setCoaches(enrichedData || []);
        } catch (error) {
            console.error('Fetch coaches error:', error);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const getProgressData = async (coachId) => {
        try {
            const { data, error } = await supabase
                .from('progress_tracking')
                .select('*')
                .eq('coach_id', coachId)
                .eq('student_id', currentUserId)
                .order('week', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            return [];
        }
    };

    const [progressCache, setProgressCache] = useState({});

    const fetchProgressForCoach = async (coachId) => {
        if (progressCache[coachId]) return progressCache[coachId];
        const { data, error } = await supabase
            .from('progress_tracking')
            .select('week, points')
            .eq('coach_id', coachId)
            .eq('student_id', currentUserId)
            .order('week', { ascending: true });
        if (!error && data) {
            setProgressCache((prev) => ({ ...prev, [coachId]: data }));
            return data;
        }
        return [];
    };

    if (loading) {
        return (
            <View style={styles.container}>
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
                <Text style={styles.headerTitle}>Your Progress</Text>
            </View>

            <FlatList
                data={coaches}
                renderItem={({ item }) => (
                    <CoachProgressCard
                        item={item}
                        fetchProgressForCoach={fetchProgressForCoach}
                        progressCache={progressCache}
                        setProgressCache={setProgressCache}
                    />
                )}
                keyExtractor={(item) => item.coach_id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="bar-chart" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>No progress data yet</Text>
                        <Text style={styles.emptySubtext}>Pay for a coach to start tracking progress</Text>
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
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    coachHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    coachInfo: {
        marginLeft: 12,
        flex: 1,
    },
    coachName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    coachEmail: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    chartPreview: {
        marginBottom: 16,
    },
    chartLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    miniChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: 100,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
    },
    bar: {
        width: '12%',
        backgroundColor: '#FF9800',
        borderRadius: 4,
    },
    viewButton: {
        flexDirection: 'row',
        backgroundColor: '#FFF3E0',
        padding: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    viewButtonText: {
        color: '#FF9800',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
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
