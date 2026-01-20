import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabaseClient';

export default function StudentDashboardScreen({ navigation }) {
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [coachRatings, setCoachRatings] = useState({});

    useEffect(() => {
        fetchCoaches();
    }, []);

    useEffect(() => {
        if (coaches.length > 0) {
            fetchAllCoachRatings();
        }
    }, [coaches]);

    const fetchCoaches = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'coach')
                .eq('is_approved', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCoaches(data || []);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllCoachRatings = async () => {
        try {
            for (const coach of coaches) {
                const { data, error } = await supabase
                    .from('ratings')
                    .select('rating')
                    .eq('coach_id', coach.id);

                if (!error && data && data.length > 0) {
                    const avg = (data.reduce((sum, r) => sum + r.rating, 0) / data.length).toFixed(1);
                    setCoachRatings(prev => ({
                        ...prev,
                        [coach.id]: {
                            average: parseFloat(avg),
                            count: data.length
                        }
                    }));
                }
            }
        } catch (error) {
            // Failed to fetch ratings, will use defaults
        }
    };

    const renderCoach = ({ item }) => {
        const rating = coachRatings[item.id];
        const displayRating = rating ? rating.average : 4.5;
        const displayCount = rating ? rating.count : 12;

        return (
            <TouchableOpacity
                style={styles.coachCard}
                onPress={() => navigation.navigate('CoachProfile', { coachId: item.id, coachData: item })}
            >
                <View style={styles.coachHeader}>
                    {item.profile_image ? (
                        <Image source={{ uri: item.profile_image }} style={{ width: 50, height: 50, borderRadius: 25 }} />
                    ) : (
                        <Ionicons name="person-circle" size={50} color="#FF9800" />
                    )}
                    <View style={styles.coachInfo}>
                        <Text style={styles.coachName}>{item.name}</Text>
                        <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={14} color="#FFB800" />
                            <Text style={styles.ratingText}>{displayRating} ({displayCount} reviews)</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.coachDetails}>
                    {item.experience && (
                        <View style={styles.detailRow}>
                            <Ionicons name="briefcase" size={16} color="#666" />
                            <Text style={styles.detailText}>{item.experience}</Text>
                        </View>
                    )}
                    {item.payment_fee && (
                        <View style={styles.detailRow}>
                            <Ionicons name="cash" size={16} color="#666" />
                            <Text style={styles.detailText}>₹{item.payment_fee}/month</Text>
                        </View>
                    )}
                    {item.achievements && (
                        <View style={styles.detailRow}>
                            <Ionicons name="trophy" size={16} color="#666" />
                            <Text style={styles.detailText}>{item.achievements}</Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => navigation.navigate('CoachProfile', { coachId: item.id, coachData: item })}
                >
                    <Text style={styles.viewButtonText}>View Profile</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FF9800" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#FF9800" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('StudentHome')} style={{ marginRight: 12 }}>
                    <Ionicons name="arrow-back" size={28} color="#FF9800" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Available Coaches</Text>
                <Text style={styles.headerSubtitle}>Choose your perfect coach</Text>
            </View>

            <FlatList
                data={coaches}
                renderItem={renderCoach}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No coaches available</Text>
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
        backgroundColor: '#FF9800',
        padding: 20,
        paddingTop: 50,
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
    list: {
        padding: 16,
    },
    coachCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    coachHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    coachInfo: {
        marginLeft: 12,
        flex: 1,
    },
    coachName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    ratingText: {
        fontSize: 12,
        color: '#FF9800',
        fontWeight: '600',
        marginLeft: 4,
    },
    coachDetails: {
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    detailText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
    },
    viewButton: {
        flexDirection: 'row',
        backgroundColor: '#FFF3E0',
        padding: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    viewButtonText: {
        color: '#FF9800',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 40,
        fontSize: 16,
    },
});
