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

export const editRegistration = async (id: number, fullName: string, voicePart: string) => {
    const { error } = await supabase
        .from('registrations')
        .update({ full_name: fullName, voice_part: voicePart })
        .eq('id', id);
    if (error) throw error;
};

export const deleteRegistration = async (id: number) => {
    const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', id);
    if (error) throw error;
};
