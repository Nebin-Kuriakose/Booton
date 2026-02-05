import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseBootonData } from '../data/bootonData';
import { ensureCatalogPopulated, searchCatalogByName } from '../services/validationService';

export default function AdminValidationScreen({ navigation }) {
    const [query, setQuery] = useState('');
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resultsState, setResultsState] = useState([]);

    const dataset = useMemo(() => parseBootonData(), []);

    const localResults = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return dataset.filter((item) => item.Name.toLowerCase().includes(q));
    }, [dataset, query]);

    const handleSearch = async () => {
        setSearched(true);
        setError('');
        const q = query.trim();
        if (!q) {
            setResultsState([]);
            return;
        }
        setLoading(true);
        // Ensure dataset exists in Supabase before searching
        await ensureCatalogPopulated(dataset);
        const { data, error } = await searchCatalogByName(q);
        setLoading(false);
        if (error) {
            setError(error);
            setResultsState([]);
        } else if (data && data.length) {
            setResultsState(data.map((row) => ({
                Name: row.name,
                Teams: row.teams,
                Achievements: row.achievements,
                StartYear: row.start_year,
                Licensed: row.licensed,
            })));
        } else {
            setResultsState([]);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <Text style={styles.name}>{item.Name}</Text>
            <Text style={styles.field}><Text style={styles.label}>Teams:</Text> {item.Teams}</Text>
            <Text style={styles.field}><Text style={styles.label}>Achievements:</Text> {item.Achievements}</Text>
            <Text style={styles.field}><Text style={styles.label}>Start Year:</Text> {item.StartYear}</Text>
            <Text style={styles.field}><Text style={styles.label}>Licensed:</Text> {item.Licensed}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Validation</Text>
                    <Text style={styles.headerSubtitle}>Search coaches by name</Text>
                </View>
                <View style={{ width: 60 }} />
            </View>

            <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color="#888" style={{ marginRight: 8 }} />
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                    style={styles.input}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                    <Text style={styles.searchBtnText}>Search</Text>
                </TouchableOpacity>
            </View>

            {error ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>Error: {error}</Text>
                </View>
            ) : searched && resultsState.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>No matches found.</Text>
                    <Text style={styles.emptyHint}>Try partial names (e.g., "Zidane").</Text>
                </View>
            ) : (
                <FlatList
                    data={searched ? resultsState : []}
                    keyExtractor={(item, index) => `${item.Name}-${index}`}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16 }}
                />
            )}
            {loading ? (
                <View style={{ paddingHorizontal: 16 }}>
                    <Text style={{ color: '#666' }}>Searching...</Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        backgroundColor: '#2196F3',
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
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        margin: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#fafafa',
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 6,
    },
    searchBtn: {
        backgroundColor: '#2196F3',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        marginLeft: 8,
    },
    searchBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
    card: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 6,
    },
    field: {
        fontSize: 14,
        color: '#444',
        marginBottom: 4,
    },
    label: {
        fontWeight: '700',
        color: '#222',
    },
    empty: {
        alignItems: 'center',
        marginTop: 24,
    },
    emptyText: {
        color: '#444',
        fontSize: 16,
        marginBottom: 6,
    },
    emptyHint: {
        color: '#777',
    },
});
