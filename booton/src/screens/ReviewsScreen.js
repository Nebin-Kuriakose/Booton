import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabaseClient';

export default function ReviewsScreen({ route, navigation }) {
    const { coachId, coachName } = route.params;
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [averageRating, setAverageRating] = useState(0);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const { data, error } = await supabase
                .from('ratings')
                .select(`
                    id,
                    rating,
                    review,
                    created_at,
                    student_id
                `)
                .eq('coach_id', coachId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setReviews(data || []);

            if (data && data.length > 0) {
                const avg = (data.reduce((sum, r) => sum + r.rating, 0) / data.length).toFixed(1);
                setAverageRating(parseFloat(avg));
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load reviews');
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating) => {
        return (
            <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                        key={star}
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={16}
                        color={star <= rating ? '#FFB800' : '#ccc'}
                    />
                ))}
            </View>
        );
    };

    const renderReviewItem = ({ item }) => (
        <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
                <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                    <Ionicons name="star" size={14} color="#FFB800" />
                </View>
                <Text style={styles.reviewDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                </Text>
            </View>

            {renderStars(item.rating)}

            {item.review && (
                <Text style={styles.reviewText}>{item.review}</Text>
            )}
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.emptySubtitle}>
                Be the first to review this coach!
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Reviews</Text>
                    <Text style={styles.coachName}>{coachName}</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#FF9800" />
                </View>
            ) : (
                <>
                    {reviews.length > 0 && (
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.averageRating}>{averageRating}</Text>
                                <View style={styles.summaryInfo}>
                                    {renderStars(Math.round(averageRating))}
                                    <Text style={styles.reviewCount}>
                                        Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    <FlatList
                        data={reviews}
                        renderItem={renderReviewItem}
                        keyExtractor={(item) => item.id}
                        ListEmptyComponent={renderEmptyState}
                        contentContainerStyle={styles.listContent}
                        scrollEnabled={false}
                    />
                </>
            )}
        </View>
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
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    coachName: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 4,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryCard: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    averageRating: {
        fontSize: 48,
        fontWeight: '700',
        color: '#FF9800',
        marginRight: 20,
    },
    summaryInfo: {
        flex: 1,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 4,
    },
    reviewCount: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    reviewCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF9800',
    },
    reviewDate: {
        fontSize: 12,
        color: '#999',
    },
    reviewText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
        marginTop: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    },
});
