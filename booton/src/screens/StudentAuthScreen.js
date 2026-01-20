import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { studentLogin, studentSignup } from '../services/authService';

export default function StudentAuthScreen({ navigation }) {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const validateEmail = (email) => {
        // Better email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    };

    const handleAuth = async () => {
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            Alert.alert('Validation Error', 'Email and password are required');
            return;
        }

        if (!validateEmail(trimmedEmail)) {
            Alert.alert('Invalid Email', `Please enter a valid email address. You entered: "${trimmedEmail}"`);
            return;
        }

        if (!isLogin) {
            if (!name.trim()) {
                Alert.alert('Validation Error', 'Please enter your name');
                return;
            }
            if (trimmedPassword.length < 6) {
                Alert.alert('Weak Password', 'Password must be at least 6 characters');
                return;
            }
            if (trimmedPassword !== confirmPassword.trim()) {
                Alert.alert('Password Mismatch', 'Passwords do not match');
                return;
            }
        }

        setLoading(true);
        try {
            const result = isLogin
                ? await studentLogin(trimmedEmail, trimmedPassword)
                : await studentSignup(trimmedEmail, trimmedPassword, name.trim());
            setLoading(false);

            if (result.success) {
                // Store user data for chat functionality
                await AsyncStorage.setItem('user', JSON.stringify(result.user));

                if (!isLogin && result.message) {
                    // Show email confirmation message for new signups
                    Alert.alert('Success', result.message || 'Check your email to confirm your account', [
                        { text: 'OK', onPress: () => navigation.replace('RoleSelect') }
                    ]);
                } else {
                    navigation.replace('StudentHome');
                }
            } else {
                Alert.alert(isLogin ? 'Login Failed' : 'Signup Failed', result.error);
            }
        } catch (error) {
            setLoading(false);
            Alert.alert('Error', error.message || 'An unexpected error occurred');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Ionicons name="person" size={60} color="#2196F3" />
                    <Text style={styles.title}>{isLogin ? 'Student Login' : 'Student Signup'}</Text>
                    <Text style={styles.subtitle}>Learn Football Skills</Text>
                </View>

                <View style={styles.form}>
                    {!isLogin && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your name"
                                value={name}
                                onChangeText={setName}
                                editable={!loading}
                            />
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[styles.input, styles.passwordInput]}
                                placeholder="Enter password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                editable={!loading}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeIcon}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-off' : 'eye'}
                                    size={24}
                                    color="#999"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {!isLogin && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword}
                                editable={!loading}
                            />
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.authButton, loading && styles.authButtonDisabled]}
                        onPress={handleAuth}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name={isLogin ? 'log-in' : 'person-add'} size={20} color="#fff" />
                                <Text style={styles.authButtonText}>
                                    {isLogin ? 'Login' : 'Sign Up'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.switchButton}
                        onPress={() => setIsLogin(!isLogin)}
                        disabled={loading}
                    >
                        <Text style={styles.switchButtonText}>
                            {isLogin
                                ? "Don't have an account? Sign Up"
                                : 'Already have an account? Login'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        padding: 8,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2196F3',
        marginTop: 16,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2196F3',
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#2196F3',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
    },
    passwordContainer: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 50,
    },
    eyeIcon: {
        position: 'absolute',
        right: 16,
        top: 16,
    },
    authButton: {
        backgroundColor: '#2196F3',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
    },
    authButtonDisabled: {
        opacity: 0.6,
    },
    authButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    switchButton: {
        alignItems: 'center',
        padding: 12,
    },
    switchButtonText: {
        color: '#2196F3',
        fontSize: 14,
        fontWeight: '500',
    },
});
