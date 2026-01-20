import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export default function RoleSelectScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image
                    source={require('../../assets/front.png')}
                    style={styles.headerImage}
                    resizeMode="cover"
                />
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>BootOn</Text>
                <Text style={styles.subtitle}>Football Coaching Platform</Text>
                <Text style={styles.question}>Select Your Role</Text>

                <TouchableOpacity
                    style={[styles.roleButton, styles.adminButton]}
                    onPress={() => navigation.navigate('AdminLogin')}
                >
                    <Text style={styles.roleButtonText}>Admin</Text>
                    <Text style={styles.roleDescription}>Platform Administrator</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.roleButton, styles.coachButton]}
                    onPress={() => navigation.navigate('CoachAuth')}
                >
                    <Text style={styles.roleButtonText}>Coach</Text>
                    <Text style={styles.roleDescription}>I teach football skills</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.roleButton, styles.studentButton]}
                    onPress={() => navigation.navigate('StudentAuth')}
                >
                    <Text style={styles.roleButtonText}>Student</Text>
                    <Text style={styles.roleDescription}>I want to learn football</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        height: '40%',
        width: '100%',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2196F3',
        textAlign: 'center',
        marginTop: 20,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    question: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 20,
    },
    roleButton: {
        alignItems: 'center',
        padding: 20,
        borderRadius: 12,
        marginBottom: 12,
        backgroundColor: '#2196F3',
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    adminButton: {
        backgroundColor: '#2196F3',
    },
    coachButton: {
        backgroundColor: '#4CAF50',
    },
    studentButton: {
        backgroundColor: '#FF9800',
    },
    roleButtonText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    roleDescription: {
        fontSize: 13,
        color: '#fff',
        opacity: 0.9,
        marginTop: 4,
    },
});
