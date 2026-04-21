import { supabase } from '../supabase';

export async function getStock() {
  const { data, error } = await supabase
    .from('v_stock_with_status')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching stock:', error);
    return [];
  }

  return (data || []).map((row) => ({
    sku: row.sku,
    name: row.name,
    type: row.type,
    available: Number(row.available_qty),
    booked: Number(row.booked_qty),
    prepping: Number(row.prepping_qty),
    total: Number(row.total_qty),
  }));
}

export async function updateStockItem(sku: string) {
  const { data, error } = await supabase
    .from('stock')
    .select('*, fertilizer:fertilizers(*)')
    .eq('fertilizer_id', 
      supabase.from('fertilizers').select('id').eq('sku', sku)
    )
    .single();

  if (error) {
    console.error('Error updating stock:', error);
    return null;
  }

  return data;
}

export async function bookStock(items: Array<{sku: string; quantity: number}>) {
  for (const item of items) {
    const { data: fertilizer } = await supabase
      .from('fertilizers')
      .select('id, unit_weight_kg')
      .eq('sku', item.sku)
      .single();

    if (!fertilizer) continue;

    const qtyMT = item.quantity * Number(fertilizer.unit_weight_kg) / 1000;

    await supabase.rpc('book_stock', {
      p_fertilizer_id: fertilizer.id,
      p_quantity: qtyMT,
    });
  }
}

export async function releaseStock(items: Array<{sku: string; quantity: number}>) {
  for (const item of items) {
    const { data: fertilizer } = await supabase
      .from('fertilizers')
      .select('id, unit_weight_kg')
      .eq('sku', item.sku)
      .single();

    if (!fertilizer) continue;

    const qtyMT = item.quantity * Number(fertilizer.unit_weight_kg) / 1000;

    await supabase.rpc('release_stock', {
      p_fertilizer_id: fertilizer.id,
      p_quantity: qtyMT,
    });
  }
}

export async function startPreppingStock(items: Array<{sku: string; quantity: number}>) {
  for (const item of items) {
    const { data: fertilizer } = await supabase
      .from('fertilizers')
      .select('id, unit_weight_kg')
      .eq('sku', item.sku)
      .single();

    if (!fertilizer) continue;

    const qtyMT = item.quantity * Number(fertilizer.unit_weight_kg) / 1000;

    await supabase.rpc('move_to_prepping', {
      p_fertilizer_id: fertilizer.id,
      p_quantity: qtyMT,
    });
  }
}

export async function completePickupStock(items: Array<{sku: string; quantity: number}>) {
  for (const item of items) {
    const { data: fertilizer } = await supabase
      .from('fertilizers')
      .select('id, unit_weight_kg')
      .eq('sku', item.sku)
      .single();

    if (!fertilizer) continue;

    const qtyMT = item.quantity * Number(fertilizer.unit_weight_kg) / 1000;

    await supabase.rpc('complete_pickup', {
      p_fertilizer_id: fertilizer.id,
      p_quantity: qtyMT,
    });
  }
}