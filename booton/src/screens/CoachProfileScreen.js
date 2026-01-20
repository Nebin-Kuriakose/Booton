import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

export default function CoachProfileScreen({ route, navigation }) {
    const { coachId, coachData } = route.params;
    const [studentId, setStudentId] = useState(null);
    const [isAlreadyPaid, setIsAlreadyPaid] = useState(false);
    const [loading, setLoading] = useState(false);
    const [averageRating, setAverageRating] = useState(0);
    const [totalReviews, setTotalReviews] = useState(0);

    useEffect(() => {
        getCurrentUser();
    }, []);

    useEffect(() => {
        if (studentId) {
            checkPaymentStatus();
        }
    }, [studentId]);

    useEffect(() => {
        fetchCoachRatings();
    }, [coachId]);

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

    const checkPaymentStatus = async () => {
        try {
            const { data, error } = await supabase
                .from('coach_students')
                .select('*')
                .eq('coach_id', coachId)
                .eq('student_id', studentId)
                .eq('payment_status', 'completed')
                .single();

            if (!error && data) {
                setIsAlreadyPaid(true);
            }
        } catch (error) {
            // No payment record found, which is fine
        }
    };

    const fetchCoachRatings = async () => {
        try {
            const { data, error } = await supabase
                .from('ratings')
                .select('rating')
                .eq('coach_id', coachId);

            if (error) throw error;

            if (data && data.length > 0) {
                const avg = (data.reduce((sum, r) => sum + r.rating, 0) / data.length).toFixed(1);
                setAverageRating(parseFloat(avg));
                setTotalReviews(data.length);
            }
        } catch (error) {
            // Failed to fetch ratings, will show defaults
        }
    };

    const handlePayment = async () => {
        if (!studentId) {
            Alert.alert('Error', 'User not found');
            return;
        }

        setLoading(true);
        try {
            // Create payment record
            const { error } = await supabase
                .from('coach_students')
                .insert([
                    {
                        coach_id: coachId,
                        student_id: studentId,
                        payment_amount: parseFloat(coachData.payment_fee) || 0,
                        payment_status: 'completed',
                        payment_date: new Date().toISOString(),
                    }
                ]);

            if (error) throw error;

            Alert.alert('Success', 'Payment completed! You can now chat with this coach.', [
                {
                    text: 'Start Chat',
                    onPress: () => navigation.navigate('Chat', {
                        userId: coachId,
                        userName: coachData.name,
                        allowFileShare: true
                    })
                }
            ]);
            setIsAlreadyPaid(true);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    {coachData.profile_image ? (
                        <Image source={{ uri: coachData.profile_image }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                    ) : (
                        <Ionicons name="person-circle" size={80} color="#FF9800" />
                    )}
                    <Text style={styles.coachName}>{coachData.name}</Text>

                    <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={16} color="#FFB800" />
                        <Text style={styles.ratingText}>{averageRating > 0 ? averageRating : '4.5'}</Text>
                        <Text style={styles.reviewText}>({totalReviews > 0 ? totalReviews : 12} reviews)</Text>
                    </View>
                </View>

                {/* Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>

                    {coachData.experience && (
                        <View style={styles.detailItem}>
                            <Ionicons name="briefcase" size={20} color="#FF9800" />
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Experience</Text>
                                <Text style={styles.detailValue}>{coachData.experience}</Text>
                            </View>
                        </View>
                    )}

                    {coachData.achievements && (
                        <View style={styles.detailItem}>
                            <Ionicons name="trophy" size={20} color="#FF9800" />
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Achievements</Text>
                                <Text style={styles.detailValue}>{coachData.achievements}</Text>
                            </View>
                        </View>
                    )}

                    {coachData.payment_fee && (
                        <View style={styles.detailItem}>
                            <Ionicons name="cash" size={20} color="#FF9800" />
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Fee per Month</Text>
                                <Text style={styles.detailValue}>₹{coachData.payment_fee}</Text>
                            </View>
                        </View>
                    )}

                    {coachData.email && (
                        <View style={styles.detailItem}>
                            <Ionicons name="mail" size={20} color="#FF9800" />
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Email</Text>
                                <Text style={styles.detailValue}>{coachData.email}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Recent Reviews */}
                <View style={styles.section}>
                    <View style={styles.reviewsHeader}>
                        <Text style={styles.sectionTitle}>Recent Reviews</Text>
                        {totalReviews > 0 && (
                            <TouchableOpacity onPress={() => navigation.navigate('Reviews', {
                                coachId,
                                coachName: coachData.name
                            })}>
                                <Text style={styles.viewAllLink}>View all ({totalReviews})</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {totalReviews > 0 ? (
                        <TouchableOpacity
                            style={styles.reviewsPlaceholder}
                            onPress={() => navigation.navigate('Reviews', {
                                coachId,
                                coachName: coachData.name
                            })}
                        >
                            <Text style={styles.reviewsText}>Tap to see {totalReviews} review{totalReviews !== 1 ? 's' : ''}</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.noReviewsText}>No reviews yet. Be the first to review!</Text>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    {isAlreadyPaid ? (
                        <>
                            <TouchableOpacity
                                style={styles.chatButton}
                                onPress={() => navigation.navigate('Chat', {
                                    userId: coachId,
                                    userName: coachData.name,
                                    allowFileShare: true
                                })}
                            >
                                <Ionicons name="chatbubble" size={20} color="#fff" />
                                <Text style={styles.buttonText}>Chat with Coach</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.rateButton}
                                onPress={() => navigation.navigate('RateCoach', {
                                    coachId,
                                    coachName: coachData.name
                                })}
                            >
                                <Ionicons name="star" size={20} color="#fff" />
                                <Text style={styles.buttonText}>Rate Coach</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity
                            style={[styles.paymentButton, loading && styles.disabledButton]}
                            onPress={handlePayment}
                            disabled={loading}
                        >
                            <Ionicons name="card" size={20} color="#fff" />
                            <Text style={styles.buttonText}>
                                {loading ? 'Processing...' : 'Pay & Chat'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
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
        padding: 8,
    },
    content: {
        padding: 16,
    },
    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    coachName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 12,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    ratingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF9800',
        marginLeft: 6,
    },
    reviewText: {
        fontSize: 12,
        color: '#999',
        marginLeft: 6,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    reviewsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    viewAllLink: {
        color: '#FF9800',
        fontSize: 12,
        fontWeight: '600',
    },
    reviewsPlaceholder: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    reviewsText: {
        color: '#FF9800',
        fontSize: 14,
        fontWeight: '600',
    },
    noReviewsText: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        textAlign: 'center',
        color: '#999',
        fontSize: 14,
        fontStyle: 'italic',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    detailItem: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    detailContent: {
        marginLeft: 16,
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: '#999',
        fontWeight: '600',
    },
    detailValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
        marginTop: 4,
    },
    reviewItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reviewerName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reviewScore: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FF9800',
    },
    actionButtons: {
        marginBottom: 32,
        gap: 12,
    },
    paymentButton: {
        backgroundColor: '#FF9800',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    chatButton: {
        backgroundColor: '#4CAF50',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    rateButton: {
        backgroundColor: '#2196F3',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    disabledButton: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
