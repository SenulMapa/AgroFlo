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
      .select('id, unit_weight_kg, name')
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

    const qtyBefore = Number(stockItem.available_qty);
    const qtyAfter = Math.max(0, qtyBefore - qtyMT);

    await supabase.from('stock').update({
      available_qty: qtyAfter,
      booked_qty: Number(stockItem.booked_qty) + qtyMT,
    }).eq('id', stockItem.id);

    await supabase.from('stock_logs').insert({
      fertilizer_id: fertilizer.id,
      product_name: fertilizer.name,
      product_sku: item.sku,
      change_type: 'adjustment',
      quantity_before: qtyBefore,
      quantity_change: -qtyMT,
      quantity_after: qtyAfter,
      reason: 'Stock booked for order',
    });
  }
}

export async function releaseStock(items: Array<{sku: string; quantity: number}>) {
  for (const item of items) {
    const { data: fertilizer } = await supabase
      .from('fertilizers')
      .select('id, unit_weight_kg, name')
      .eq('sku', item.sku)
      .single();

    if (!fertilizer) continue;

    const qtyMT = item.quantity * Number(fertilizer.unit_weight_kg) / 1000;

    const { data: stockItem } = await supabase
      .from('stock')
      .select('id, booked_qty, prepping_qty')
      .eq('fertilizer_id', fertilizer.id)
      .single();

    if (!stockItem) continue;

    const qtyBefore = Number(stockItem.booked_qty);
    const qtyAfter = Math.max(0, qtyBefore - qtyMT);

    await supabase.from('stock').update({
      booked_qty: qtyAfter,
      prepping_qty: Number(stockItem.prepping_qty) + qtyMT,
    }).eq('id', stockItem.id);

    await supabase.from('stock_logs').insert({
      fertilizer_id: fertilizer.id,
      product_name: fertilizer.name,
      product_sku: item.sku,
      change_type: 'adjustment',
      quantity_before: qtyBefore,
      quantity_change: -qtyMT,
      quantity_after: qtyAfter,
      reason: 'Stock moved to prepping for order',
    });
  }
}

export async function moveToTotal(items: Array<{sku: string; quantity: number}>) {
  for (const item of items) {
    const { data: fertilizer } = await supabase
      .from('fertilizers')
      .select('id, unit_weight_kg, name')
      .eq('sku', item.sku)
      .single();

    if (!fertilizer) continue;

    const qtyMT = item.quantity * Number(fertilizer.unit_weight_kg) / 1000;

    const { data: stockItem } = await supabase
      .from('stock')
      .select('id, prepping_qty, available_qty, booked_qty')
      .eq('fertilizer_id', fertilizer.id)
      .single();

    if (!stockItem) continue;

    const qtyBefore = Number(stockItem.prepping_qty);
    const qtyAfter = Math.max(0, qtyBefore - qtyMT);
    const totalBefore = Number(stockItem.available_qty) + Number(stockItem.booked_qty) + qtyBefore;

    await supabase.from('stock').update({
      prepping_qty: qtyAfter,
    }).eq('id', stockItem.id);

    await supabase.from('stock_logs').insert({
      fertilizer_id: fertilizer.id,
      product_name: fertilizer.name,
      product_sku: item.sku,
      change_type: 'stock_out',
      quantity_before: qtyBefore,
      quantity_change: -qtyMT,
      quantity_after: qtyAfter,
      reason: 'Order picked up - stock dispatched',
    });
  }
}