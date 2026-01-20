import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

export default function CoachStudentsScreen({ navigation }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [coachId, setCoachId] = useState(null);

    useEffect(() => {
        getCoachId();
    }, []);

    useEffect(() => {
        if (coachId) {
            fetchStudents();
        }
    }, [coachId]);

    const getCoachId = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setCoachId(user.id);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to get coach data');
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            // Get coach_students records for this coach
            const { data: coachStudentData, error: csError } = await supabase
                .from('coach_students')
                .select('student_id')
                .eq('coach_id', coachId);

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
                .select('id, name, email, profile_image')
                .in('id', studentIds);

            if (sError) throw sError;

            setStudents(studentData || []);
        } catch (error) {
            console.error('Fetch students error:', error);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChatPress = (student) => {
        navigation.navigate('Chat', {
            userId: student.id,
            userName: student.name
        });
    };

    const renderStudent = ({ item }) => (
        <TouchableOpacity
            style={styles.studentCard}
            onPress={() => handleChatPress(item)}
        >
            <View style={styles.studentInfo}>
                {item.profile_image ? (
                    <Image
                        source={{ uri: item.profile_image }}
                        style={styles.studentImage}
                    />
                ) : (
                    <Ionicons name="person-circle" size={50} color="#4CAF50" />
                )}
                <View style={styles.textContainer}>
                    <Text style={styles.studentName}>{item.name}</Text>
                    <Text style={styles.studentEmail}>{item.email}</Text>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#4CAF50" />
        </TouchableOpacity>
    );

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
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Students</Text>
                <View style={{ width: 24 }} />
            </View>

            {students.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="people" size={80} color="#ccc" />
                    <Text style={styles.emptyText}>No students yet</Text>
                    <Text style={styles.emptySubtext}>Students will appear here once they enroll</Text>
                </View>
            ) : (
                <FlatList
                    data={students}
                    renderItem={renderStudent}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        backgroundColor: '#4CAF50',
        padding: 20,
        paddingTop: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    listContent: {
        padding: 16,
    },
    studentCard: {
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    studentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    studentImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f0f0f0',
    },
    textContainer: {
        flex: 1,
    },
    studentName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    studentEmail: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#999',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#bbb',
        marginTop: 8,
    },
});
