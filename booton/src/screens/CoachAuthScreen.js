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
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { coachLogin, coachSignup } from '../services/authService';

export default function CoachAuthScreen({ navigation }) {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [experience, setExperience] = useState('');
    const [paymentFee, setPaymentFee] = useState('');
    const [achievements, setAchievements] = useState('');
    const [position, setPosition] = useState('Forward');
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
            if (!position) {
                Alert.alert('Validation Error', 'Please select a position');
                return;
            }
            if (!experience.trim()) {
                Alert.alert('Validation Error', 'Please enter your experience');
                return;
            }
            if (!paymentFee.trim()) {
                Alert.alert('Validation Error', 'Please enter your payment fee per month');
                return;
            }
            if (isNaN(paymentFee)) {
                Alert.alert('Invalid Fee', 'Payment fee must be a number');
                return;
            }
            // Achievements no longer required
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
                ? await coachLogin(trimmedEmail, trimmedPassword)
                : await coachSignup(trimmedEmail, trimmedPassword, name.trim(), position, experience.trim(), paymentFee.trim(), achievements.trim());
            setLoading(false);

            if (result.success) {
                if (!isLogin && result.message) {
                    // Show approval message for new signups
                    Alert.alert('Success', result.message, [
                        { text: 'OK', onPress: () => navigation.replace('RoleSelect') }
                    ]);
                } else if (isLogin) {
                    // Login successful - user data already stored by authService
                    navigation.replace('CoachHome');
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
                    <Ionicons name="clipboard" size={60} color="#2196F3" />
                    <Text style={styles.title}>{isLogin ? 'Coach Login' : 'Coach Signup'}</Text>
                    <Text style={styles.subtitle}>Teach Football Skills</Text>
                </View>

                <View style={styles.form}>
                    {!isLogin && (
                        <>
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

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Position</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={position}
                                        onValueChange={(itemValue) => setPosition(itemValue)}
                                        style={styles.picker}
                                        enabled={!loading}
                                    >
                                        <Picker.Item label="Forward" value="Forward" />
                                        <Picker.Item label="Midfield" value="Midfield" />
                                        <Picker.Item label="Defender" value="Defender" />
                                        <Picker.Item label="GoalKeeper" value="GoalKeeper" />
                                        <Picker.Item label="Common" value="Common" />
                                    </Picker>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Experience (Years)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your coaching experience"
                                    value={experience}
                                    onChangeText={setExperience}
                                    editable={!loading}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Payment Fee per Month</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your monthly fee"
                                    value={paymentFee}
                                    onChangeText={setPaymentFee}
                                    keyboardType="decimal-pad"
                                    editable={!loading}
                                />
                            </View>

                            {/* Removed coach id / achievements textbox */}
                        </>
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
    pickerContainer: {
        borderWidth: 2,
        borderColor: '#2196F3',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    picker: {
        height: 50,
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
