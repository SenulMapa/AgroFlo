import { supabase } from '../supabase';
import type { TransportRequest, FertilizerItem } from '@/types';

export async function getRequests(): Promise<TransportRequest[]> {
  const { data, error } = await supabase
    .from('transport_requests')
    .select(`
      *,
      station:stations!station_id(name, location, district, contact_person, phone)
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
  
  return {
    id: String(row.id),
    date: new Date(String(row.created_at)),
    orderCreatedDate: row.order_created_date ? new Date(String(row.order_created_date)) : undefined,
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
    items: [],
    slaDeadline: row.sla_deadline ? new Date(String(row.sla_deadline)) : new Date(),
    createdByUser: row.created_by_user_id ? String(row.created_by_user_id) : undefined,
    auditLog: [],
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
  items: Array<{sku: string; quantity: number; unitCost: number; tax: number; total: number; name: string; type: string}>,
  orderCreatedDate: string,
  slaDeadline: string
) {
  const numericId = Math.floor(Math.random() * 1000) + 9000;
  const requestId = `REQ-${numericId}`;
  const { data: request, error: reqError } = await supabase
    .from('transport_requests')
    .insert({ request_code: requestId, station_id: stationId, origin: 'Station Portal', destination, priority, status: 'new', created_by_user_id: userId, order_created_date: orderCreatedDate, sla_deadline: slaDeadline })
    .select().single();
  if (reqError) return { request: null, error: reqError };
  for (const item of items) {
    await supabase.from('request_items').insert({ request_id: requestId, sku: item.sku, name: item.name, quantity: item.quantity, unit_cost: item.unitCost, tax: item.tax, total: item.total, type: item.type });
  }
  return { request, error: null };
}

export async function updateRequest(requestId: string, updates: { station_id?: string; destination?: string; priority?: string; status?: string }) {
  const { error } = await supabase.from('transport_requests').update(updates).eq('id', requestId);
  return { error };
}

export async function updateRequestItems(requestId: string, items: Array<{sku: string; name: string; quantity: number; unitCost: number; tax: number; total: number; type: string}>) {
  await supabase.from('request_items').delete().eq('request_id', requestId);
  for (const item of items) {
    await supabase.from('request_items').insert({ request_id: requestId, sku: item.sku, name: item.name, quantity: item.quantity, unit_cost: item.unitCost, tax: item.tax, total: item.total, type: item.type });
  }
  return { error: null };
}
