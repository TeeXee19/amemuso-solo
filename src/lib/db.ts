import { supabase } from './supabase';

export const getConfigs = async () => {
    if (!supabase) return {};
    const { data, error } = await supabase.from('config').select('*');

    if (error) throw error;
    return data.reduce((acc: any, item: any) => ({ ...acc, [item.key]: item.value }), {});
};

export const getRegistrations = async () => {
    const { data, error } = await supabase.from('registrations').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
};

export const registerSoloist = async (fullName: string, voicePart: string, slotId: number, isTest = false) => {
    if (!supabase) return;
    const { data, error } = await supabase
        .from('registrations')
        .insert([{ full_name: fullName, voice_part: voicePart, slot_id: slotId, is_test: isTest }]);
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

export const updatePerformanceStatus = async (id: string, status: string) => {
    const { data, error } = await supabase
        .from('registrations')
        .update({ performance_status: status })
        .eq('id', id)
        .select();

    if (error) throw error;
    return data;
};

export const resetPerformanceStatus = async () => {
    const { data, error } = await supabase
        .from('registrations')
        .update({ performance_status: 'pending' })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows safely

    if (error) throw error;
    return data;
};

// --- Repertoire Submissions ---

export const getRepertoires = async () => {
    // Select the submission along with its parent registration info securely
    const { data, error } = await supabase
        .from('repertoire_submissions')
        .select(`
            *,
            registrations (
                full_name,
                slot_id,
                voice_part
            )
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const addRepertoire = async (
    registrationId: string,
    songTitle: string,
    artist: string,
    summary: string,
    songLink?: string,
    scoreLink?: string
) => {
    const { data, error } = await supabase
        .from('repertoire_submissions')
        .insert([{
            registration_id: registrationId,
            song_title: songTitle,
            artist_composer: artist,
            song_summary: summary,
            song_link: songLink,
            score_link: scoreLink,
            status: 'pending'
        }])
        .select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error(`Insert failed or RLS blocked for ${songTitle}`);
    return data;
};

export const rejectRepertoire = async (submissionId: string, comments?: string) => {
    const { data, error } = await supabase
        .from('repertoire_submissions')
        .update({ status: 'rejected', admin_comments: comments })
        .eq('id', submissionId)
        .select();

    if (error) throw error;
    return data;
};

export const updateRepertoireComments = async (submissionId: string, comments: string) => {
    const { data, error } = await supabase
        .from('repertoire_submissions')
        .update({ admin_comments: comments })
        .eq('id', submissionId)
        .select();

    if (error) throw error;
    return data;
};

export const approveRepertoire = async (submissionId: string, registrationId: string) => {
    // 1. Approve the chosen submission
    const { data: approved, error: errApprove } = await supabase
        .from('repertoire_submissions')
        .update({ status: 'approved' })
        .eq('id', submissionId)
        .select();

    if (errApprove) throw errApprove;

    // 2. Clear (delete) all other pending/rejected submissions for this user
    const { error: errDelete } = await supabase
        .from('repertoire_submissions')
        .delete()
        .eq('registration_id', registrationId)
        .neq('id', submissionId); // Exclude the newly approved one

    if (errDelete) throw errDelete;

    return approved;
};

export const deleteRepertoire = async (submissionId: string) => {
    const { data, error } = await supabase
        .from('repertoire_submissions')
        .delete()
        .eq('id', submissionId)
        .select();

    if (error) throw error;
    return data;
};

export const deleteAllRepertoires = async () => {
    const { data, error } = await supabase
        .from('repertoire_submissions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows trick safely

    if (error) throw error;
    return data;
};

// --- Performance Weeks ---

export const getPerformanceWeeks = async () => {
    const { data, error } = await supabase
        .from('performance_weeks')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
};

export const addPerformanceWeek = async (date: string, slotIds: number[], isTest = false) => {
    const { data, error } = await supabase
        .from('performance_weeks')
        .insert([{ date, slot_ids: slotIds, is_test: isTest }])
        .select();

    if (error) throw error;
    return data;
};

export const deletePerformanceWeek = async (id: string) => {
    const { error } = await supabase
        .from('performance_weeks')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- Waitlist System ---

export const getWaitlist = async () => {
    const { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const joinWaitlist = async (fullName: string, voicePart: string, email?: string, phone?: string, isTest = false) => {
    const { data, error } = await supabase
        .from('waitlist')
        .insert([{ full_name: fullName, voice_part: voicePart, email, phone, is_test: isTest }])
        .select();
    if (error) throw error;
    return data;
};

export const deleteWaitlistEntry = async (id: string) => {
    const { error } = await supabase
        .from('waitlist')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// --- RBAC / Admin System ---

export const getAdminUser = async (email: string) => {
    const { data, error } = await supabase
        .from('users_admin')
        .select('*')
        .eq('email', email)
        .single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    return data;
};
