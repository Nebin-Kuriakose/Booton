import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../services/supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function CoachEditProfileScreen({ navigation }) {
    const [coachData, setCoachData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

    // Form states
    const [name, setName] = useState('');
    const [experience, setExperience] = useState('');
    const [paymentFee, setPaymentFee] = useState('');
    const [achievements, setAchievements] = useState('');
    const [position, setPosition] = useState('Forward');
    const [profileImage, setProfileImage] = useState(null);

    useEffect(() => {
        getCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUserId) {
            fetchCoachData();
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

    const fetchCoachData = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', currentUserId)
                .single();

            if (error) throw error;

            setCoachData(data);
            setName(data.name || '');
            setExperience(data.experience || '');
            setPaymentFee(data.payment_fee || '');
            setAchievements(data.achievements || '');
            setPosition(data.position || 'Forward');
            setProfileImage(data.profile_image || null);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        try {
            // Request permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'We need permission to access your photo library');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.cancelled && result.assets && result.assets.length > 0) {
                const selectedImage = result.assets[0].uri;
                console.log('Image picked:', selectedImage);
                setProfileImage(selectedImage);
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Error', error.message || 'Failed to pick image');
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Please enter your name');
            return;
        }
        if (!experience.trim()) {
            Alert.alert('Validation Error', 'Please enter your experience');
            return;
        }
        if (!paymentFee.trim()) {
            Alert.alert('Validation Error', 'Please enter your payment fee');
            return;
        }
        if (isNaN(paymentFee)) {
            Alert.alert('Invalid Fee', 'Payment fee must be a number');
            return;
        }
        if (!achievements.trim()) {
            Alert.alert('Validation Error', 'Please enter your achievements');
            return;
        }

        setSaving(true);
        try {
            let imageUrl = profileImage;

            // Upload image to Supabase Storage if it's a new local image
            if (profileImage && profileImage.startsWith('file://')) {
                try {
                    console.log('Starting image upload...');
                    // Convert local file URI to Blob via base64 data URL (RN-compatible)
                    const base64 = await FileSystem.readAsStringAsync(profileImage, { encoding: FileSystem.EncodingType.Base64 });
                    const dataUrl = `data:image/jpeg;base64,${base64}`;
                    const resp = await fetch(dataUrl);
                    const blob = await resp.blob();
                    console.log('Blob created, size:', blob.size);

                    const fileName = `${currentUserId}-profile-${Date.now()}.jpg`;
                    console.log('Uploading to bucket with filename:', fileName);

                    const { data, error: uploadError } = await supabase.storage
                        .from('profile-images')
                        .upload(fileName, blob, {
                            upsert: true,
                            contentType: 'image/jpeg',
                        });

                    if (uploadError) {
                        console.error('Upload error from Supabase:', uploadError);
                        console.error('Error details:', JSON.stringify(uploadError, null, 2));
                        throw uploadError;
                    }

                    console.log('Upload successful, data:', data);

                    // Get public URL
                    const { data: publicUrlData } = supabase.storage
                        .from('profile-images')
                        .getPublicUrl(fileName);

                    imageUrl = publicUrlData?.publicUrl || profileImage;
                    console.log('Image URL:', imageUrl);
                } catch (uploadError) {
                    console.error('Image upload error details:', uploadError);

                    // If upload fails, still allow saving with local URI as fallback
                    console.warn('Upload failed, using local URI as fallback');
                    imageUrl = profileImage;
                    // Silently fall back to local image - don't interrupt the save
                    console.log('Proceeding with profile save using local image URI');
                }
            }

            // Update user profile
            const { error } = await supabase
                .from('users')
                .update({
                    name: name.trim(),
                    experience: experience.trim(),
                    payment_fee: paymentFee.trim(),
                    achievements: achievements.trim(),
                    position: position,
                    profile_image: imageUrl,
                })
                .eq('id', currentUserId);

            if (error) throw error;

            // Update AsyncStorage
            const updatedUser = {
                ...coachData,
                name: name.trim(),
                experience: experience.trim(),
                payment_fee: paymentFee.trim(),
                achievements: achievements.trim(),
                position: position,
                profile_image: imageUrl,
            };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

            Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

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

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Edit Profile</Text>
                    <Text style={styles.subtitle}>Update your information</Text>
                </View>

                {/* Profile Image Section */}
                <View style={styles.imageSection}>
                    <View style={styles.imageContainer}>
                        {profileImage ? (
                            <Image source={{ uri: profileImage }} style={styles.profileImage} />
                        ) : (
                            <Ionicons name="person-circle" size={80} color="#4CAF50" />
                        )}
                    </View>
                    <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                        <Ionicons name="camera" size={20} color="#fff" />
                        <Text style={styles.uploadButtonText}>Upload Photo</Text>
                    </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your name"
                            value={name}
                            onChangeText={setName}
                            editable={!saving}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Position</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={position}
                                onValueChange={(itemValue) => setPosition(itemValue)}
                                style={styles.picker}
                                enabled={!saving}
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
                            editable={!saving}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Payment Fee per Month (₹)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your monthly fee"
                            value={paymentFee}
                            onChangeText={setPaymentFee}
                            keyboardType="decimal-pad"
                            editable={!saving}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Achievements</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Enter your achievements"
                            value={achievements}
                            onChangeText={setAchievements}
                            multiline
                            numberOfLines={4}
                            editable={!saving}
                        />
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-done" size={20} color="#fff" />
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                        disabled={saving}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
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
        justifyContent: 'flex-start',
        padding: 20,
        paddingTop: 60,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginTop: 16,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    imageContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    profileImage: {
        width: 112,
        height: 112,
        borderRadius: 56,
        resizeMode: 'cover',
    },
    imagePreview: {
        fontSize: 16,
        color: '#4CAF50',
    },
    uploadButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
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
        color: '#4CAF50',
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#4CAF50',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
    },
    textArea: {
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    pickerContainer: {
        borderWidth: 2,
        borderColor: '#4CAF50',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    picker: {
        height: 50,
    },
    saveButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    cancelButton: {
        alignItems: 'center',
        padding: 12,
    },
    cancelButtonText: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: '500',
    },
});
