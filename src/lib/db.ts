import { supabase } from './supabase';

export const getConfigs = async () => {
    if (!supabase) return {};
    const { data, error } = await supabase.from('config').select('*');

    if (error) throw error;
    return data.reduce((acc: any, item: any) => ({ ...acc, [item.key]: item.value }), {});
};

export const getRegistrations = async () => {
    const { data, error } = await supabase.from('registrations').select('*');
    if (error) throw error;
    return data;
};

export const registerSoloist = async (fullName: string, voicePart: string, slotId: number) => {
    if (!supabase) return;
    const { data, error } = await supabase
        .from('registrations')
        .insert([{ full_name: fullName, voice_part: voicePart, slot_id: slotId }]);
    if (error) throw error;
    return data;
};

export const updateMaxSlots = async (newLimit: number) => {
    const { error } = await supabase
        .from('config')
        .update({ value: newLimit.toString() })
        .eq('key', 'max_slots');
    if (error) throw error;
};

export const editRegistration = async (id: string, fullName: string, voicePart: string) => {
    const { data, error } = await supabase
        .from('registrations')
        .update({ full_name: fullName, voice_part: voicePart })
        .eq('id', id)
        .select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error(`Missing record or RLS block. 0 rows updated for ID: ${id}`);
    return data;
};

export const deleteRegistration = async (id: string) => {
    const { data, error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', id)
        .select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error(`Missing record or RLS block. 0 rows deleted for ID: ${id}`);
    return data;
};

export const updateRegistrationSong = async (id: string, songTitle: string, artist: string, summary: string) => {
    const { data, error } = await supabase
        .from('registrations')
        .update({
            song_title: songTitle,
            artist_composer: artist,
            song_summary: summary
        })
        .eq('id', id)
        .select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error(`Missing record or RLS block. 0 rows updated for ID: ${id}`);
    return data;
};
