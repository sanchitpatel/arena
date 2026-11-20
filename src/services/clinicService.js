/**
 * Temporary Compatibility Layer for Legacy Hospital Dashboard Views.
 * Stubs old doctor/patient endpoints to prevent 404 console errors
 * while the frontend agent transforms the dashboard views into Arena views.
 */

import {
  fetchPlayerNotifications,
  getUnreadNotificationCount,
  subscribeToPlayerNotifications,
} from './notificationService';
import { getPlayerUuid } from '../utils/playerId';

export async function getPendingNotificationCount(playerId) {
  try {
    const id = playerId || getPlayerUuid();
    if (!id) return { success: true, count: 0 };
    const res = await getUnreadNotificationCount(id);
    if (res?.success) {
      return { success: true, count: res.count };
    }
  } catch { }
  return { success: true, count: 0 };
}

export function subscribeToClinicRealtime(callback) {
  const id = getPlayerUuid();
  if (!id) return () => {};
  return subscribeToPlayerNotifications(id, () => {
    if (typeof callback === 'function') callback();
  });
}

export async function fetchNotificationQueue(playerId) {
  const id = playerId || getPlayerUuid();
  if (!id) return { success: true, data: [] };
  return fetchPlayerNotifications(id);
}

export async function fetchDashboardMetrics() {
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

export async function fetchAvailableMonths() {
  return { success: true, data: [] };
}

export async function fetchMonthDateRecords(month) {
  return { success: true, data: [] };
}

export async function fetchPatientsForDate(date) {
  return { success: true, data: [] };
}

export async function updateVisitFollowUp(visitId, followUpDate) {
  return { success: true };
}

export async function toggleVisitTreatmentDone(visitId, current) {
  return { success: true };
}

export async function toggleVisitChecked(visitId, current) {
  return { success: true };
}

export async function checkinExistingPatient(patientId) {
  return { success: true, data: { id: 'temp-visit', token_number: 1 } };
}

export async function registerNewPatient(patientData) {
  return { success: true, data: { patient: { id: 'temp-patient', patient_id_code: 'AR-001' } } };
}

export async function searchExistingPatients(query = '') {
  return { success: true, data: [] };
}

export async function updateNotificationStatus(id, status) {
  return { success: true };
}

export async function bulkUpdateNotificationStatus(ids, status) {
  return { success: true };
}

export function buildNotificationMessage(notification) {
  return '';
}

// Re-export Arena services
export * from './arenaService';
