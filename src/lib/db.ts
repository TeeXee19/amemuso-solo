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

export const registerSoloist = async (fullName: string, voicePart: string, slotId: number, phone?: string, isTest = false) => {
    if (!supabase) return;
    const { data, error } = await supabase
        .from('registrations')
        .insert([{
            full_name: fullName,
            voice_part: voicePart,
            slot_id: slotId,
            phone_number: phone,
            is_test: isTest
        }]);
    if (error) throw error;
    return data;
};

export const updateConfig = async (key: string, value: string) => {
    const { error } = await supabase
        .from('config')
        .update({ value })
        .eq('key', key);
    if (error) throw error;
};

export const updateMaxSlots = async (newLimit: number) => {
    await updateConfig('max_slots', newLimit.toString());
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

export const updatePerformanceStatus = async (id: string, status: string, md_comments?: string) => {
    const payload: any = { performance_status: status };
    if (md_comments !== undefined) {
        payload.md_comments = md_comments;
    }

    const { data, error } = await supabase
        .from('registrations')
        .update(payload)
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

// --- Members System (Phase 5) ---

export const getMembers = async () => {
    const { data, error } = await supabase
        .from('members')
        .select(`
            *,
            member_positions (
                title,
                category
            ),
            registrations (
                full_name,
                slot_id,
                voice_part,
                performance_status
            )
        `)
        .order('full_name', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const addMember = async (member: any) => {
    const { data, error } = await supabase
        .from('members')
        .insert([member])
        .select();
    if (error) throw error;
    return data;
};

export const importRegistrationsToMembers = async () => {
    if (!supabase) return { imported: 0, total: 0 };

    // 1. Get all registrations
    const { data: regs, error: regsErr } = await supabase.from('registrations').select('*');
    if (regsErr) throw regsErr;

    // 2. Get existing members to avoid duplicates
    const { data: existingMembers, error: memErr } = await supabase.from('members').select('registration_id');
    if (memErr) throw memErr;

    const existingRegIds = new Set(existingMembers?.map((m: any) => m.registration_id).filter(Boolean));

    // 3. Filter and Sanitize
    const toImport = regs?.filter((r: any) =>
        r.id &&
        typeof r.id === 'string' &&
        r.id.length > 5 &&
        !existingRegIds.has(r.id)
    ) || [];

    if (toImport.length === 0) return { imported: 0, total: regs?.length || 0 };

    // 4. Insert
    const membersToInsert = toImport.map((r: any) => ({
        full_name: r.full_name,
        voice_part: r.voice_part,
        registration_id: r.id,
        is_soloist: true,
        phone: r.phone_number || r.phone || null,
        email: r.email || null
    }));

    const { data, error: insErr } = await supabase.from('members').insert(membersToInsert).select();
    if (insErr) throw insErr;

    return { imported: data?.length || 0, total: regs?.length || 0 };
};

export const updateMember = async (id: string, updates: any) => {
    const { data, error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data;
};

export const promoteMemberToFull = async (id: string) => {
    return updateMember(id, { is_on_probation: false, probation_until: null });
};

export const deleteMember = async (id: string) => {
    const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

export const getMemberByPortalId = async (portalId: string) => {
    const { data, error } = await supabase
        .from('members')
        .select(`
            *,
            member_positions (
                title
            )
        `)
        .eq('portal_id', portalId)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

export const updateMemberPin = async (id: string, pin: string) => {
    return updateMember(id, { portal_pin: pin });
};

export const bulkInsertMembers = async (membersToInsert: any[]) => {
    const { data, error } = await supabase
        .from('members')
        .insert(membersToInsert)
        .select();

    if (error) throw error;
    return data;
};

export const uploadMemberPhoto = async (file: File) => {
    if (!supabase) throw new Error("Supabase not configured");

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('member-profiles')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
        .from('member-profiles')
        .getPublicUrl(filePath);

    return data.publicUrl;
};

// --- Member Positions (Phase 9) ---

export const getMemberPositions = async () => {
    const { data, error } = await supabase
        .from('member_positions')
        .select('*')
        .order('rank', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const addMemberPosition = async (title: string, category: string = 'General', rank: number = 0) => {
    const { data, error } = await supabase
        .from('member_positions')
        .insert([{ title, category, rank }])
        .select();
    if (error) throw error;
    return data;
};

export const updateMemberPosition = async (id: string, updates: any) => {
    const { data, error } = await supabase
        .from('member_positions')
        .update(updates)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data;
};

export const deleteMemberPosition = async (id: string) => {
    const { error } = await supabase
        .from('member_positions')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// --- Member History (Phase 9) ---

export const getMemberHistory = async (memberId: string) => {
    // Get the member's registration_id if they have one linked
    const { data: member, error: memErr } = await supabase
        .from('members')
        .select('full_name, registration_id')
        .eq('id', memberId)
        .single();

    if (memErr) throw memErr;

    // Find all registrations with similar full_names (to catch historical data before the members table migration)
    // Plus the specific linked registration_id
    const { data: history, error: histErr } = await supabase
        .from('registrations')
        .select(`
            *,
            repertoire_submissions (
                song_title,
                artist_composer,
                status,
                created_at
            )
        `)
        .or(`full_name.ilike.%${member.full_name}%,id.eq.${member.registration_id || '00000000-0000-0000-0000-000000000000'}`)
        .order('created_at', { ascending: false });

    if (histErr) throw histErr;

    // Fetch weeks to map the slot_id to actual performance date
    const { data: weeks } = await supabase.from('performance_weeks').select('*');

    const mappedHistory = (history || []).map((reg: any) => {
        let perfDate = 'Unknown Date';
        if (weeks && reg.slot_id) {
            const week = weeks.find((w: any) => w.slot_ids?.includes(reg.slot_id));
            if (week && week.date) {
                try {
                    const parts = week.date.split('-');
                    if (parts.length === 3) {
                        perfDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                    } else {
                        perfDate = week.date;
                    }
                } catch (e) {
                    perfDate = week.date;
                }
            }
        }
        return {
            ...reg,
            performance_date: perfDate !== 'Unknown Date' ? perfDate : new Date(reg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        };
    });

    return mappedHistory;
};

// --- Attendance System (Phase 10) ---

export const getAttendanceEvents = async () => {
    const { data, error } = await supabase
        .from('attendance_events')
        .select('*')
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const createAttendanceEvent = async (event: any) => {
    const { data, error } = await supabase
        .from('attendance_events')
        .insert([event])
        .select();
    if (error) throw error;
    return data;
};

export const updateAttendanceEvent = async (id: string, updates: any) => {
    const { data, error } = await supabase
        .from('attendance_events')
        .update(updates)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data;
};

export const deleteAttendanceEvent = async (id: string) => {
    const { error } = await supabase
        .from('attendance_events')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

export const getAttendanceRecords = async (eventId: string) => {
    const { data, error } = await supabase
        .from('attendance_records')
        .select(`
            *,
            members (
                full_name,
                voice_part
            )
        `)
        .eq('event_id', eventId);
    if (error) throw error;
    return data || [];
};

export const markAttendance = async (eventId: string, memberId: string, metadata: any = {}, isLate: boolean = false) => {
    const { data, error } = await supabase
        .from('attendance_records')
        .insert([{
            event_id: eventId,
            member_id: memberId,
            metadata,
            is_late: isLate
        }])
        .select();
    if (error) throw error;
    return data;
};

export const getMemberAttendanceStats = async (memberId: string) => {
    // Total = all events that count toward stats (regardless of is_active)
    const { data: countedEvents, error: errEvents } = await supabase
        .from('attendance_events')
        .select('id')
        .eq('counts_toward_stats', true);

    if (errEvents) throw errEvents;

    const countedEventIds = (countedEvents || []).map((e: any) => e.id);
    const total = countedEventIds.length;

    // Attended = records for this member in events that count toward stats, and they were NOT late
    const { data: records, error: errRecords } = await supabase
        .from('attendance_records')
        .select('event_id, is_late')
        .eq('member_id', memberId)
        .in('event_id', total > 0 ? countedEventIds : ['00000000-0000-0000-0000-000000000000']);

    if (errRecords) throw errRecords;

    const validAttended = records?.filter((r: any) => !r.is_late) || [];
    const attended = validAttended.length;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

    return { attended, total, percentage };
};

export const calculateHonorarium = (attendancePercentage: number): number => {
    if (attendancePercentage >= 80) return 100;
    if (attendancePercentage >= 60) return 80;
    if (attendancePercentage >= 50) return 70;
    if (attendancePercentage >= 40) return 50;
    return 0;
};

export const autoExpireEvents = async () => {
    const now = new Date();
    const { data: activeEvents, error } = await supabase
        .from('attendance_events')
        .select('id, date, start_time, duration_minutes')
        .eq('is_active', true);

    if (error || !activeEvents) return;

    const expiredIds = activeEvents
        .filter((e: any) => {
            const start = new Date(`${e.date}T${e.start_time}`);
            const end = new Date(start.getTime() + (e.duration_minutes || 60) * 60 * 1000);
            return now > end;
        })
        .map((e: any) => e.id);

    if (expiredIds.length === 0) return;

    await supabase
        .from('attendance_events')
        .update({ is_active: false })
        .in('id', expiredIds);
};

export const validateAndCheckIn = async (memberId: string, code: string, memberLat?: number, memberLng?: number) => {
    // 1. Find ALL events (active and recently expired) to match by code
    const { data: allEvents, error: eventErr } = await supabase
        .from('attendance_events')
        .select('*');

    if (eventErr) throw eventErr;

    // 2. Find matching event by code
    const matchingEvent = (allEvents || []).find(
        (e: any) => e.check_in_code.toUpperCase() === code.toUpperCase()
    );

    if (!matchingEvent) {
        throw new Error('Invalid check-in code.');
    }

    // 3. Check if the event's code is still valid for today
    const now = new Date();
    
    // Convert both to local date strings to compare roughly
    const eventDateObj = new Date(`${matchingEvent.date}T00:00:00`);
    const hoursDiff = Math.abs(now.getTime() - eventDateObj.getTime()) / 36e5;
    
    // Valid if it's within roughly 24 hours of the event date (handles timezone offsets up to a point)
    if (hoursDiff > 30) {
        throw new Error('This event check-in code is no longer valid for today.');
    }

    // Determine if late (checking in after start time)
    const start = new Date(`${matchingEvent.date}T${matchingEvent.start_time}`);
    const isLate = now > start;

    // 4. Validate Location if Event requires it
    if (matchingEvent.lat != null && matchingEvent.lng != null) {
        if (memberLat == null || memberLng == null) {
            throw new Error('This event requires location access. Please allow location access to check in.');
        }

        const distanceMeters = calculateDistanceMeters(
            memberLat, memberLng,
            matchingEvent.lat, matchingEvent.lng
        );
        const maxRadius = matchingEvent.radius_meters || 150; // Default 150 meters

        if (distanceMeters > maxRadius) {
            throw new Error(`You must be within ${maxRadius}m of the venue to check in. You are ${Math.round(distanceMeters)}m away.`);
        }
    }

    // 5. Check if already checked in
    const { data: existing, error: _checkErr } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('event_id', matchingEvent.id)
        .eq('member_id', memberId)
        .single();

    if (existing) {
        throw new Error('You have already checked in for this event.');
    }

    // 6. Mark attendance
    return markAttendance(matchingEvent.id, memberId, {
        source: 'member_portal',
        timestamp: new Date().toISOString()
    }, isLate);
};

export const getCurrentActiveSession = async (memberId: string) => {
    // Look for records where check_out_time is null for today's active events
    const { data: activeEvents } = await supabase.from('attendance_events').select('*').eq('is_active', true);
    if (!activeEvents || activeEvents.length === 0) return null;

    const eventIds = activeEvents.map((e: any) => e.id);
    const { data: records } = await supabase.from('attendance_records')
        .select('*, attendance_events(*)')
        .eq('member_id', memberId)
        .in('event_id', eventIds)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false });

    return records && records.length > 0 ? records[0] : null;
};

export const validateAndCheckOut = async (recordId: string, eventStartTimeStr: string, eventDateStr: string) => {
    const now = new Date();
    const start = new Date(`${eventDateStr}T${eventStartTimeStr}`);
    const minimumCheckoutTime = new Date(start.getTime() + (105 * 60 * 1000)); // 1 hour 45 minutes
    
    if (now < minimumCheckoutTime) {
        throw new Error('Check-out is only available 1 hour and 45 minutes after the rehearsal start time.');
    }

    const { data, error } = await supabase
        .from('attendance_records')
        .update({ check_out_time: now.toISOString() })
        .eq('id', recordId)
        .select();

    if (error) throw error;
    return data;
};

export const adminCheckOutMember = async (recordId: string, reason: string) => {
    const now = new Date().toISOString();
    
    // Get existing metadata first to merge the reason safely
    const { data: record, error: fetchErr } = await supabase
        .from('attendance_records')
        .select('metadata')
        .eq('id', recordId)
        .single();
        
    if (fetchErr) throw fetchErr;
    
    const meta = record?.metadata || {};
    meta.admin_checkout_reason = reason;
    meta.admin_checkout_time = now;

    const { data, error } = await supabase
        .from('attendance_records')
        .update({ 
            check_out_time: now,
            metadata: meta
        })
        .eq('id', recordId)
        .select();

    if (error) throw error;
    return data;
};

export const getMemberPortalAttendance = async (memberId: string) => {
    const { data, error } = await supabase
        .from('attendance_records')
        .select(`
            *,
            attendance_events (
                title,
                date,
                start_time
            )
        `)
        .eq('member_id', memberId)
        .order('check_in_time', { ascending: false });
        
    if (error) throw error;
    return data || [];
};

// Haversine formula to find distance between two lat/lng coordinates in meters
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const rad = Math.PI / 180;
    const phi1 = lat1 * rad;
    const phi2 = lat2 * rad;
    const deltaPhi = (lat2 - lat1) * rad;
    const deltaLambda = (lon2 - lon1) * rad;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
