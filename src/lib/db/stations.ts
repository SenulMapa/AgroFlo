import { supabase } from '../supabase';
import type { StationInfo } from '@/types';

export async function getStations(): Promise<StationInfo[]> {
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching stations:', error);
    return [];
  }

  return (data || []).map(station => ({
    id: station.id,
    stationCode: station.station_code || '',
    name: station.name,
    location: station.location,
    district: station.district,
    contactPerson: station.contact_person || '',
    phone: station.phone || '',
  }));
}