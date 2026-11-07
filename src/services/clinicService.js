import { supabase } from '../utils/supabase';

export async function getPendingNotificationCount() {
  try {
    const { count, error } = await supabase
      .from('whatsapp_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');
    if (error) throw error;
    return { success: true, count: count || 0 };
  } catch {
    return { success: true, count: 0 };
  }
}

export function subscribeToClinicRealtime(callback) {
  try {
    const channel = supabase
      .channel('clinic_realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        if (typeof callback === 'function') callback();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}

export async function fetchDashboardMetrics() {
  try {
    const todayDate = new Date().toISOString().split('T')[0];
    const { data: visits } = await supabase.from('visits').select('*, patient:patients(*)');
    const { count: patientCount } = await supabase.from('patients').select('*', { count: 'exact', head: true });

    const todayVisits = (visits || []).filter((v) => (v.visit_date || '').startsWith(todayDate));
    const doneToday = todayVisits.filter((v) => v.treatment_done).length;
    const doneTotal = (visits || []).filter((v) => v.treatment_done).length;

    return {
      success: true,
      data: {
        today: {
          visits: todayVisits,
          count: todayVisits.length,
          maxToken: todayVisits.length ? Math.max(...todayVisits.map((v) => v.token_number || 0)) : 0,
          done: doneToday,
          active: todayVisits.length - doneToday,
        },
        thisMonth: {
          total: (visits || []).length,
          done: doneTotal,
          active: (visits || []).length - doneTotal,
        },
        lifetime: {
          total: patientCount || (visits || []).length,
          done: doneTotal,
          active: (patientCount || 0) - doneTotal,
        },
        patients: [],
      },
    };
  } catch {
    return {
      success: true,
      data: {
        today: { visits: [], count: 0, maxToken: 0, done: 0, active: 0 },
        thisMonth: { total: 0, done: 0, active: 0 },
        lifetime: { total: 0, done: 0, active: 0 },
        patients: [],
      },
    };
  }
}

export async function fetchAvailableMonths() {
  try {
    const { data } = await supabase.from('visits').select('visit_date');
    const months = Array.from(
      new Set((data || []).map((v) => (v.visit_date || '').substring(0, 7)).filter(Boolean))
    );
    return { success: true, data: months };
  } catch {
    return { success: true, data: [] };
  }
}

export async function fetchMonthDateRecords(month) {
  try {
    const { data } = await supabase.from('visits').select('*').ilike('visit_date', `${month}%`);
    return { success: true, data: data || [] };
  } catch {
    return { success: true, data: [] };
  }
}

export async function fetchPatientsForDate(date) {
  try {
    const { data } = await supabase.from('visits').select('*, patient:patients(*)').eq('visit_date', date);
    return { success: true, data: data || [] };
  } catch {
    return { success: true, data: [] };
  }
}

export async function updateVisitFollowUp(visitId, followUpDate) {
  try {
    const { error } = await supabase.from('visits').update({ follow_up_date: followUpDate }).eq('id', visitId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function toggleVisitTreatmentDone(visitId, current) {
  try {
    const { error } = await supabase.from('visits').update({ treatment_done: !current }).eq('id', visitId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function toggleVisitChecked(visitId, current) {
  try {
    const { error } = await supabase.from('visits').update({ is_checked: !current }).eq('id', visitId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function checkinExistingPatient(patientId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase.from('visits').select('*', { count: 'exact', head: true }).eq('visit_date', today);
    const nextToken = (count || 0) + 1;
    const { data, error } = await supabase
      .from('visits')
      .insert({
        patient_id: patientId,
        visit_date: today,
        token_number: nextToken,
        treatment_done: false,
      })
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function registerNewPatient(patientData) {
  try {
    const { data: patient, error: pErr } = await supabase.from('patients').insert(patientData).select().single();
    if (pErr) throw pErr;
    const checkin = await checkinExistingPatient(patient.id);
    return { success: true, data: { patient, visit: checkin.data } };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function searchExistingPatients(query = '') {
  try {
    let q = supabase.from('patients').select('*, visits(*)').order('created_at', { ascending: false });
    if (query) {
      q = q.or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,patient_id_code.ilike.%${query}%`);
    }
    const { data, error } = await q;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch {
    return { success: true, data: [] };
  }
}

export async function fetchNotificationQueue() {
  try {
    const { data, error } = await supabase
      .from('whatsapp_logs')
      .select('*, patient:patients(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch {
    return { success: true, data: [] };
  }
}

export async function updateNotificationStatus(id, status) {
  try {
    const { error } = await supabase.from('whatsapp_logs').update({ status }).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function bulkUpdateNotificationStatus(ids, status) {
  try {
    const { error } = await supabase.from('whatsapp_logs').update({ status }).in('id', ids);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function buildNotificationMessage(notification) {
  if (!notification) return '';
  return notification.message_body || `Hello ${notification.patient?.full_name || 'Student'}, this is a notification from your dashboard.`;
}
