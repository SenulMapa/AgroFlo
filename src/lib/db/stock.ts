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

    const { data: stockItem } = await supabase
      .from('stock')
      .select('id, available_qty, booked_qty')
      .eq('fertilizer_id', fertilizer.id)
      .single();

    if (!stockItem) continue;

    await supabase.from('stock').update({
      available_qty: Math.max(0, Number(stockItem.available_qty) - qtyMT),
      booked_qty: Number(stockItem.booked_qty) + qtyMT,
    }).eq('id', stockItem.id);
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

    const { data: stockItem } = await supabase
      .from('stock')
      .select('id, booked_qty, prepping_qty, available_qty')
      .eq('fertilizer_id', fertilizer.id)
      .single();

    if (!stockItem) continue;

    await supabase.from('stock').update({
      booked_qty: Math.max(0, Number(stockItem.booked_qty) - qtyMT),
      prepping_qty: Number(stockItem.prepping_qty) + qtyMT,
    }).eq('id', stockItem.id);
  }
}

export async function moveToTotal(items: Array<{sku: string; quantity: number}>) {
  for (const item of items) {
    const { data: fertilizer } = await supabase
      .from('fertilizers')
      .select('id, unit_weight_kg')
      .eq('sku', item.sku)
      .single();

    if (!fertilizer) continue;

    const qtyMT = item.quantity * Number(fertilizer.unit_weight_kg) / 1000;

    const { data: stockItem } = await supabase
      .from('stock')
      .select('id, prepping_qty, available_qty')
      .eq('fertilizer_id', fertilizer.id)
      .single();

    if (!stockItem) continue;

    await supabase.from('stock').update({
      prepping_qty: Math.max(0, Number(stockItem.prepping_qty) - qtyMT),
    }).eq('id', stockItem.id);
  }
}