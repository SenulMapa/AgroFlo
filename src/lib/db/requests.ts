import { supabase } from '../supabase';
import type { TransportRequest, FertilizerItem } from '@/types';

export async function getRequests(): Promise<TransportRequest[]> {
  const { data, error } = await supabase
    .from('transport_requests')
    .select(`
      *,
      station:stations(id, name, location, district, contact_person, phone),
      request_items(id, sku, name, fertilizer_type, quantity, unit_cost, tax, total),
      audit_logs(id, user_name, user_role, action, details, created_at)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching requests:', error);
    return [];
  }

  return (data || []).map(transformRequest);
}

function transformRequest(row: Record<string, unknown>): TransportRequest {
  const station = row.station as Record<string, string> | undefined;
  const requestItems = (row.request_items as Record<string, unknown>[] | undefined) || [];
  
  // Parse dates preserving local timezone
  const parseLocalDate = (dateStr: unknown): Date => {
    if (!dateStr) return new Date();
    const d = new Date(dateStr as string);
    return new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  };
  
  return {
    id: String(row.request_code || row.id),
    dbId: String(row.id || ''),
    date: parseLocalDate(row.created_at),
    orderCreatedDate: row.order_created_date ? parseLocalDate(row.order_created_date) : undefined,
    origin: String(row.origin || 'Station Portal'),
    status: String(row.status) as TransportRequest['status'],
    priority: String(row.priority || 'medium') as TransportRequest['priority'],
    station: station ? {
      id: String(station.id || ''),
      name: station.name || '',
      location: station.location || '',
      district: station.district || '',
      contactPerson: station.contact_person || '',
      phone: station.phone || '',
    } : {
      id: '',
      name: '',
      location: '',
      district: '',
      contactPerson: '',
      phone: '',
    },
    destination: String(row.destination || ''),
    items: requestItems.map(item => ({
      sku: String(item.sku || ''),
      name: String(item.name || ''),
      type: String(item.fertilizer_type || ''),
      quantity: Number(item.quantity || 0),
      unitCost: Number(item.unit_cost || 0),
      tax: Number(item.tax || 0),
      total: Number(item.total || 0),
    })),
    slaDeadline: row.sla_deadline ? parseLocalDate(row.sla_deadline) : new Date(),
    createdByUser: row.created_by_user_id ? String(row.created_by_user_id) : undefined,
    auditLog: ((row.audit_logs as Record<string, unknown>[] | undefined) || []).map((a) => ({
      id: String(a.id),
      timestamp: parseLocalDate(a.created_at),
      user: String(a.user_name || ''),
      role: String(a.user_role || '') as any,
      action: String(a.action || ''),
      details: String(a.details || ''),
    })),
    route: row.route_from && row.route_to ? {
      from: String(row.route_from),
      to: String(row.route_to),
      distance: Number(row.route_distance_km || 0),
    } : undefined,
  };
}

export async function getRequestItems(requestId: string): Promise<FertilizerItem[]> {
  const { data, error } = await supabase
    .from('request_items')
    .select('*')
    .eq('request_id', requestId);

  if (error) {
    console.error('Error fetching request items:', error);
    return [];
  }

  return (data || []).map((item) => ({
    sku: item.sku,
    name: item.name,
    type: item.fertilizer_type,
    quantity: item.quantity,
    unitCost: Number(item.unit_cost),
    tax: Number(item.tax),
    total: Number(item.total),
  }));
}

export async function updateRequestStatus(
  requestId: string,
  status: string
) {
  const { data, error } = await supabase
    .from('transport_requests')
    .update({ status })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    console.error('Error updating request:', error);
    return null;
  }

  return data;
}
export async function createRequest(
  stationId: string,
  destination: string,
  priority: string,
  userId: string,
  items: Array<{sku: string; quantity: number; unitCost: number; tax: number; total: number; name: string; type: string}>
) {
  // Get next sequential request code
  const { data: existing } = await supabase
    .from('transport_requests')
    .select('request_code')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  let nextNum = 1;
  if (existing?.request_code) {
    const match = existing.request_code.match(/REQ-(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  const requestCode = `REQ-${String(nextNum).padStart(5, '0')}`;
  
  // Use local time (not UTC) for order_created_date
  const now = new Date();
  const slaDeadline = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  
  const { data: request, error: reqError } = await supabase
    .from('transport_requests')
    .insert({ 
      request_code: requestCode, 
      station_id: stationId, 
      origin: 'Station Portal', 
      destination, 
      priority, 
      status: 'new', 
      created_by_user_id: userId,
      order_created_date: now.toISOString(),
      sla_deadline: slaDeadline.toISOString()
    })
    .select()
    .single();
  if (reqError) return { request: null, error: reqError };
  if (!request?.id) return { request: null, error: { message: 'Failed to get inserted request ID' } };
  for (const item of items) {
    await supabase.from('request_items').insert({ request_id: request.id, sku: item.sku, name: item.name, quantity: item.quantity, unit_cost: item.unitCost, tax: item.tax, total: item.total, fertilizer_type: item.type });
  }
  return { request, error: null };
}

export async function updateRequest(requestId: string, updates: { station_id?: string; destination?: string; priority?: string; status?: string }) {
  const { error } = await supabase.from('transport_requests').update(updates).eq('id', requestId);
  return { error };
}

export async function updateRequestStatusWithAudit(
  requestDbId: string,
  status: string,
  userName: string,
  userRole: string,
  action: string,
  details: string
) {
  const { error } = await supabase.from('transport_requests').update({ status }).eq('id', requestDbId);
  if (error) {
    console.error('Failed to update request status:', error);
    return;
  }
  await supabase.from('audit_logs').insert({
    entity_type: 'transport_request',
    entity_id: requestDbId,
    user_name: userName,
    user_role: userRole,
    action,
    details,
  });
}

export async function updateRequestItems(requestId: string, items: Array<{sku: string; name: string; quantity: number; unitCost: number; tax: number; total: number; type: string}>) {
  await supabase.from('request_items').delete().eq('request_id', requestId);
  for (const item of items) {
    await supabase.from('request_items').insert({ request_id: requestId, sku: item.sku, name: item.name, quantity: item.quantity, unit_cost: item.unitCost, tax: item.tax, total: item.total, fertilizer_type: item.type });
  }
  return { error: null };
}
