import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { BarChart } from 'react-native-chart-kit';

export default function CoachProgressScreen({ navigation }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [weeklyPoints, setWeeklyPoints] = useState('');
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        getCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUserId) {
            fetchStudents();
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

    const fetchStudents = async () => {
        try {
            // Get coach_students records for this coach with completed payment
            const { data: coachStudentData, error: csError } = await supabase
                .from('coach_students')
                .select('student_id')
                .eq('coach_id', currentUserId)
                .eq('payment_status', 'completed')
                .order('created_at', { ascending: false });

            if (csError) throw csError;

            if (!coachStudentData || coachStudentData.length === 0) {
                setStudents([]);
                setLoading(false);
                return;
            }

            // Get student IDs
            const studentIds = coachStudentData.map(cs => cs.student_id);

            // Fetch student details
            const { data: studentData, error: sError } = await supabase
                .from('users')
                .select('id, name, email')
                .in('id', studentIds);

            if (sError) throw sError;

            // Combine coach_students and student data
            const enrichedData = coachStudentData.map(cs => {
                const student = studentData?.find(s => s.id === cs.student_id);
                return {
                    ...cs,
                    student: student
                };
            });

            setStudents(enrichedData || []);
        } catch (error) {
            console.error('Fetch students error:', error);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentProgress = async (studentId) => {
        try {
            const { data, error } = await supabase
                .from('progress_tracking')
                .select('*')
                .eq('coach_id', currentUserId)
                .eq('student_id', studentId)
                .order('week', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            Alert.alert('Error', error.message);
            return [];
        }
    };

    const addWeeklyPoints = async () => {
        if (!weeklyPoints.trim()) {
            Alert.alert('Error', 'Please enter points');
            return;
        }

        if (isNaN(parseFloat(weeklyPoints)) || parseFloat(weeklyPoints) < 0 || parseFloat(weeklyPoints) > 100) {
            Alert.alert('Error', 'Points must be between 0 and 100');
            return;
        }

        try {
            // Get current week
            const currentWeek = Math.ceil(new Date().getDate() / 7);
            const sid = selectedStudent?.student_id;

            const { error } = await supabase
                .from('progress_tracking')
                .insert([
                    {
                        coach_id: currentUserId,
                        student_id: sid,
                        week: currentWeek,
                        points: parseFloat(weeklyPoints),
                        date: new Date().toISOString(),
                    }
                ]);

            if (error) throw error;

            Alert.alert('Success', 'Points added successfully');
            // Invalidate cached progress for this student so charts refresh immediately
            if (sid) {
                setProgressCache((prev) => {
                    const next = { ...prev };
                    delete next[sid];
                    return next;
                });
            }
            setWeeklyPoints('');
            setModalVisible(false);
            setSelectedStudent(null);
            // Optionally refresh students list if needed
            // fetchStudents();
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const [progressCache, setProgressCache] = useState({});

    const fetchProgressForStudent = async (studentId) => {
        if (progressCache[studentId]) return progressCache[studentId];
        const { data, error } = await supabase
            .from('progress_tracking')
            .select('week, points')
            .eq('coach_id', currentUserId)
            .eq('student_id', studentId)
            .order('week', { ascending: true });
        if (!error && data) {
            setProgressCache((prev) => ({ ...prev, [studentId]: data }));
            return data;
        }
        return [];
    };

    const StudentCard = ({ item }) => {
        const [progress, setProgress] = useState([]);

        useEffect(() => {
            fetchProgressForStudent(item.student_id).then(setProgress);
        }, [item.student_id, modalVisible]);

        const chartData = {
            labels: progress.map((_, idx) => `W${idx + 1}`),
            datasets: [{ data: progress.map(p => p.points) }]
        };

        return (
            <View style={styles.studentCard}>
                <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                        setSelectedStudent(item);
                        setModalVisible(true);
                    }}
                >
                    <View style={styles.studentInfo}>
                        <Ionicons name="person-circle" size={40} color="#4CAF50" />
                        <View style={styles.details}>
                            <Text style={styles.studentName}>{item.student?.name}</Text>
                            <Text style={styles.studentEmail}>{item.student?.email}</Text>
                        </View>
                    </View>
                    <View style={{ marginTop: 16 }}>
                        <Text style={{ fontWeight: '600', color: '#333', marginBottom: 8 }}>Weekly Progress</Text>
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
                                    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                }}
                                style={{ borderRadius: 8 }}
                            />
                        ) : (
                            <Text style={{ color: '#999', textAlign: 'center', marginTop: 16 }}>No progress yet</Text>
                        )}
                    </View>
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={24} color="#999" />
            </View>
        );
    };

    const renderStudent = ({ item }) => <StudentCard item={item} />;

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Track Progress</Text>
            </View>

            <FlatList
                data={students}
                renderItem={renderStudent}
                keyExtractor={(item) => item.student_id || item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No students to track</Text>
                }
            />

            {/* Add Points Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Weekly Points</Text>
                            <TouchableOpacity onPress={() => {
                                setModalVisible(false);
                                setSelectedStudent(null);
                            }}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {selectedStudent && (
                            <>
                                <Text style={styles.studentNameModal}>
                                    {selectedStudent.student?.name}
                                </Text>
                                <Text style={styles.label}>Weekly Points (0-100)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter points"
                                    value={weeklyPoints}
                                    onChangeText={setWeeklyPoints}
                                    keyboardType="decimal-pad"
                                />
                                <TouchableOpacity
                                    style={styles.submitButton}
                                    onPress={addWeeklyPoints}
                                >
                                    <Text style={styles.submitButtonText}>Add Points</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
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
    studentCard: {
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
    studentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    details: {
        marginLeft: 12,
        flex: 1,
    },
    studentName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    studentEmail: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 40,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
    },
    studentNameModal: {
        fontSize: 18,
        fontWeight: '600',
        color: '#4CAF50',
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    submitButton: {
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
