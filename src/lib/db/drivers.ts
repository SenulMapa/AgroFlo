import { supabase } from '../supabase';

export async function getDrivers(availableOnly = false) {
  let query = supabase
    .from('drivers')
    .select('*')
    .order('name');

  if (availableOnly) {
    query = query.eq('is_available', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching drivers:', error);
    return [];
  }

  return (data || []).map((driver) => ({
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    vehicleType: driver.vehicle_type,
    licensePlate: driver.license_plate,
    capacity: Number(driver.capacity_kg),
    rating: Number(driver.rating),
    isAvailable: driver.is_available,
    location: {
      lat: Number(driver.current_location_lat || 0),
      lng: Number(driver.current_location_lng || 0),
      district: driver.current_district || '',
    },
  }));
}

export async function getDriverBids(requestId: string) {
  const { data, error } = await supabase
    .from('driver_bids')
    .select('*')
    .eq('request_id', requestId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('Error fetching driver bids:', error);
    return [];
  }

  return (data || []).map((bid) => ({
    driverId: bid.driver_id,
    driverName: bid.driver_name,
    bidAmount: Number(bid.bid_amount),
    estimatedTime: bid.estimated_minutes,
    distance: Number(bid.distance_km),
    timestamp: new Date(bid.submitted_at),
  }));
}

export async function submitDriverBid(
  requestId: string,
  driverId: string,
  driverName: string,
  bidAmount: number,
  estimatedMinutes: number,
  distanceKm: number
) {
  const { data, error } = await supabase
    .from('driver_bids')
    .upsert({
      request_id: requestId,
      driver_id: driverId,
      driver_name: driverName,
      bid_amount: bidAmount,
      estimated_minutes: estimatedMinutes,
      distance_km: distanceKm,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting bid:', error);
    return null;
  }

  return data;
}

export async function assignDriver(requestId: string, driverId: string, userId: string) {

  const { data: assigned, error: assignError } = await supabase
    .from('assigned_drivers')
    .upsert({
      request_id: requestId,
      driver_id: driverId,
      assigned_by_user_id: userId,
    })
    .select()
    .single();

  if (assignError) {
    console.error('Error assigning driver:', assignError);
    return null;
  }

  await supabase
    .from('transport_requests')
    .update({
      status: 'driver_assigned',
      driver_assigned_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  return assigned;
}