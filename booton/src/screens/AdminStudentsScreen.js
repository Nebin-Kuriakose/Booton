import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabaseClient';

export default function AdminStudentsScreen({ navigation }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'student')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStudents(data || []);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleBlockStudent = async (studentId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ is_blocked: !currentStatus })
                .eq('id', studentId);

            if (error) throw error;

            Alert.alert('Success', `Student ${!currentStatus ? 'blocked' : 'unblocked'} successfully`);
            fetchStudents();
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const renderStudent = ({ item }) => (
        <View style={styles.studentCard}>
            <View style={styles.studentInfo}>
                <Ionicons name="person-circle" size={40} color="#FF9800" />
                <View style={styles.studentDetails}>
                    <Text style={styles.studentName}>{item.name}</Text>
                    <Text style={styles.studentEmail}>{item.email}</Text>
                    {item.is_blocked && (
                        <Text style={styles.blockedText}>⛔ Blocked</Text>
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
                    style={[styles.blockButton, item.is_blocked && styles.unblockButton]}
                    onPress={() => toggleBlockStudent(item.id, item.is_blocked)}
                >
                    <Ionicons
                        name={item.is_blocked ? "lock-open" : "lock-closed"}
                        size={20}
                        color="#fff"
                    />
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
                <Text style={styles.headerTitle}>Students</Text>
            </View>

            <FlatList
                data={students}
                renderItem={renderStudent}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No students found</Text>
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
    studentDetails: {
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
    blockedText: {
        fontSize: 12,
        color: '#f44336',
        marginTop: 4,
        fontWeight: '600',
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
    blockButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f44336',
        justifyContent: 'center',
        alignItems: 'center',
    },
    unblockButton: {
        backgroundColor: '#4CAF50',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 40,
        fontSize: 16,
    },
});
