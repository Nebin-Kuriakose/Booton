import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logout } from '../services/authService';
import { supabase } from '../services/supabaseClient';

export default function CoachHomeScreen({ navigation }) {
    const [contacting, setContacting] = useState(false);
    const handleLogout = async () => {
        await logout();
        navigation.replace('RoleSelect');
    };

    const contactAdmin = async () => {
        try {
            if (contacting) return;
            setContacting(true);
            // Find an admin user
            const { data, error } = await supabase
                .from('users')
                .select('id, name')
                .eq('role', 'admin')
                .limit(1);
            if (error) throw error;
            const admin = Array.isArray(data) ? data[0] : data;
            if (!admin) {
                alert('No admin user found.');
                return;
            }
            navigation.navigate('Chat', { userId: admin.id, userName: admin.name || 'Admin' });
        } catch (e) {
            alert(e.message || 'Failed to open admin chat');
        } finally {
            setContacting(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Coach Dashboard</Text>
                    <Text style={styles.headerSubtitle}>Teach & Inspire</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Image source={require('../../assets/coach.png')} style={{ width: 400, height: 400, alignSelf: 'center', marginBottom: 8 }} resizeMode="contain" />
                <View style={styles.welcomeCard}>
                    <Text style={styles.welcomeTitle}>Welcome, Coach!</Text>
                    <Text style={styles.welcomeText}>
                        Ready to train your students today?
                    </Text>
                </View>
            </View>

            <View style={styles.bottomNav}>
                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => navigation.navigate('CoachDashboard')}
                >
                    <Text style={styles.navText}>Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => navigation.navigate('CoachStudents')}
                >
                    <Text style={styles.navText}>Students</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => navigation.navigate('CoachProgress')}
                >
                    <Text style={styles.navText}>Progress</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navButton}
                    onPress={contactAdmin}
                    disabled={contacting}
                >
                    {contacting ? (
                        <ActivityIndicator size={16} color="#4CAF50" />
                    ) : (
                        <Text style={styles.navText}>Admin</Text>
                    )}
                </TouchableOpacity>
            </View>
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
    headerSubtitle: {
        fontSize: 14,
        color: '#fff',
        marginTop: 4,
        opacity: 0.9,
    },
    logoutButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#388E3C',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoutText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    welcomeCard: {
        alignItems: 'center',
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginTop: 20,
    },
    welcomeText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 12,
    },
    bottomNav: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingVertical: 14,
        paddingHorizontal: 5,
        paddingBottom: 18,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8,
    },
    navButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
    },
    navText: {
        fontSize: 11,
        color: '#4CAF50',
        marginTop: 4,
        fontWeight: '600',
    },
});
