import { supabase } from './supabaseClient';

function toRows(dataset) {
    return dataset.map((item) => ({
        name: item.Name || '',
        teams: item.Teams || '',
        achievements: item.Achievements || '',
        start_year: item.StartYear || '',
        licensed: item.Licensed || '',
    }));
}

// Populate catalog once if empty; run before first search
export async function ensureCatalogPopulated(dataset) {
    const { count, error: countError } = await supabase
        .from('coach_catalog')
        .select('*', { count: 'exact', head: true });
    if (countError) return { error: countError.message };
    if ((count ?? 0) > 0) return { inserted: 0 };

    const rows = toRows(dataset);
    const { error } = await supabase
        .from('coach_catalog')
        .upsert(rows, { onConflict: 'name', ignoreDuplicates: true });
    if (error) return { error: error.message };
    return { inserted: rows.length };
}

export async function searchCatalogByName(query) {
    const q = (query || '').trim();
    if (!q) return { data: [], error: null };
    const { data, error } = await supabase
        .from('coach_catalog')
        .select('name, teams, achievements, start_year, licensed')
        .ilike('name', `%${q}%`)
        .limit(100);
    return { data: data || [], error: error ? error.message : null };
}
