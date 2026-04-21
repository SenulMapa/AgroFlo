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
  userId: string,
  destination: string,
  priority: string,
  items: Array<{sku: string; quantity: number; unitCost: number; tax: number; total: number; name: string; type: string}>,
  orderCreatedDate: string,
  slaDeadline: string
) {
  const numericId = Math.floor(Math.random() * 1000) + 9000;
  const requestId = `REQ-${numericId}`;

  const { data: request, error: reqError } = await supabase
    .from('transport_requests')
    .insert({
      id: requestId,
      station_id: stationId,
      origin: 'Station Portal',
      destination,
      priority,
      status: 'new',
      created_by_user_id: userId,
      order_created_date: orderCreatedDate,
      sla_deadline: slaDeadline,
    })
    .select()
    .single();

  if (reqError) {
    console.error('Error creating request:', reqError);
    return { request: null, error: reqError };
  }

  for (const item of items) {
    const { error: itemError } = await supabase
      .from('request_items')
      .insert({
        request_id: requestId,
        sku: item.sku,
        name: item.name,
        fertilizer_type: item.type,
        quantity: item.quantity,
        unit_cost: item.unitCost,
        tax: item.tax,
        total: item.total,
      });

    if (itemError) {
      console.error('Error inserting request item:', itemError);
    }
  }

  return { request, error: null };
}

export async function updateRequest(
  requestId: string,
  updates: {
    station_id?: string;
    destination?: string;
    priority?: string;
    status?: string;
    decline_reason?: string;
    cleared_at?: string;
    stock_booked_at?: string;
    picked_up_at?: string;
    driver_assigned_at?: string;
    delivered_at?: string;
  }
) {
  const updateData: Record<string, unknown> = { ...updates };
  
  if (updates.cleared_at) updateData.cleared_at = updates.cleared_at;
  if (updates.stock_booked_at) updateData.stock_booked_at = updates.stock_booked_at;
  if (updates.picked_up_at) updateData.picked_up_at = updates.picked_up_at;
  if (updates.driver_assigned_at) updateData.driver_assigned_at = updates.driver_assigned_at;
  if (updates.delivered_at) updateData.delivered_at = updates.delivered_at;

  const { data, error } = await supabase
    .from('transport_requests')
    .update(updateData)
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    console.error('Error updating request:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

export async function updateRequestItems(
  requestId: string,
  items: Array<{sku: string; quantity: number; unitCost: number; tax: number; total: number; name: string; type: string}>
) {
  const { error: deleteError } = await supabase
    .from('request_items')
    .delete()
    .eq('request_id', requestId);

  if (deleteError) {
    console.error('Error deleting old items:', deleteError);
  }

  for (const item of items) {
    const { error: itemError } = await supabase
      .from('request_items')
      .insert({
        request_id: requestId,
        sku: item.sku,
        name: item.name,
        fertilizer_type: item.type,
        quantity: item.quantity,
        unit_cost: item.unitCost,
        tax: item.tax,
        total: item.total,
      });

    if (itemError) {
      console.error('Error inserting request item:', itemError);
    }
  }

  return { error: null };
}