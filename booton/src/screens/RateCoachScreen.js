import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

export default function RateCoachScreen({ route, navigation }) {
    const { coachId, coachName } = route.params;
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');
    const [loading, setLoading] = useState(false);
    const [studentId, setStudentId] = useState(null);
    const [existingRating, setExistingRating] = useState(null);

    useEffect(() => {
        getCurrentUser();
    }, []);

    useEffect(() => {
        if (studentId) {
            fetchExistingRating();
        }
    }, [studentId]);

    const getCurrentUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setStudentId(user.id);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to get user data');
        }
    };

    const fetchExistingRating = async () => {
        try {
            const { data, error } = await supabase
                .from('ratings')
                .select('*')
                .eq('coach_id', coachId)
                .eq('student_id', studentId)
                .single();

            if (!error && data) {
                setExistingRating(data);
                setRating(data.rating);
                setReview(data.review || '');
            }
        } catch (error) {
            // No existing rating, which is fine
        }
    };

    const submitRating = async () => {
        if (rating === 0) {
            Alert.alert('Error', 'Please select a rating');
            return;
        }

        setLoading(true);
        try {
            if (existingRating) {
                // Update existing rating
                const { error } = await supabase
                    .from('ratings')
                    .update({
                        rating,
                        review: review.trim(),
                    })
                    .eq('id', existingRating.id);

                if (error) throw error;
                Alert.alert('Success', 'Rating updated!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                // Insert new rating
                const { error } = await supabase
                    .from('ratings')
                    .insert([
                        {
                            coach_id: coachId,
                            student_id: studentId,
                            rating,
                            review: review.trim(),
                        }
                    ]);

                if (error) throw error;
                Alert.alert('Success', 'Rating submitted!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderStars = () => {
        return (
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                        key={star}
                        onPress={() => setRating(star)}
                        style={styles.starButton}
                    >
                        <Ionicons
                            name={star <= rating ? 'star' : 'star-outline'}
                            size={50}
                            color={star <= rating ? '#FFB800' : '#ccc'}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rate Coach</Text>
            </View>

            <View style={styles.content}>
                {/* Coach Info */}
                <View style={styles.coachCard}>
                    <Ionicons name="person-circle" size={60} color="#FF9800" />
                    <Text style={styles.coachName}>{coachName}</Text>
                </View>

                {/* Rating Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>How would you rate this coach?</Text>
                    {renderStars()}
                    {rating > 0 && (
                        <Text style={styles.ratingDisplay}>
                            Rating: <Text style={styles.ratingValue}>{rating.toFixed(1)} / 5.0</Text>
                        </Text>
                    )}
                </View>

                {/* Review Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Share your experience (optional)</Text>
                    <TextInput
                        style={styles.reviewInput}
                        placeholder="Write your review here... (max 500 characters)"
                        multiline
                        numberOfLines={5}
                        maxLength={500}
                        value={review}
                        onChangeText={setReview}
                        placeholderTextColor="#999"
                    />
                    <Text style={styles.charCount}>
                        {review.length}/500
                    </Text>
                </View>

                {/* Benefits Section */}
                <View style={styles.benefitsSection}>
                    <Text style={styles.benefitsTitle}>Your feedback helps:</Text>
                    <View style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#FF9800" />
                        <Text style={styles.benefitText}>Improve coach quality</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#FF9800" />
                        <Text style={styles.benefitText}>Guide other students</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#FF9800" />
                        <Text style={styles.benefitText}>Build trust in community</Text>
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.disabledButton]}
                    onPress={submitRating}
                    disabled={loading}
                >
                    <Ionicons name="checkmark" size={24} color="#fff" />
                    <Text style={styles.submitButtonText}>
                        {loading ? 'Submitting...' : existingRating ? 'Update Rating' : 'Submit Rating'}
                    </Text>
                </TouchableOpacity>

                {existingRating && (
                    <Text style={styles.updateNote}>
                        You've already rated this coach. You can update your rating.
                    </Text>
                )}
            </View>
        </ScrollView>
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
    content: {
        padding: 16,
    },
    coachCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    coachName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginTop: 12,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 20,
    },
    starButton: {
        padding: 8,
    },
    ratingDisplay: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    ratingValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FF9800',
    },
    reviewInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 16,
        fontSize: 14,
        color: '#333',
        textAlignVertical: 'top',
        backgroundColor: '#f9f9f9',
    },
    charCount: {
        fontSize: 12,
        color: '#999',
        marginTop: 8,
        textAlign: 'right',
    },
    benefitsSection: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    benefitsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    benefitText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 12,
    },
    submitButton: {
        backgroundColor: '#FF9800',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
        marginBottom: 32,
    },
    disabledButton: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    updateNote: {
        textAlign: 'center',
        color: '#999',
        fontSize: 12,
        marginBottom: 20,
        fontStyle: 'italic',
    },
});
