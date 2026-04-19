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