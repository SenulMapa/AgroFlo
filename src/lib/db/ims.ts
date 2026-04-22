import { supabase } from '../supabase';

export interface FertilizerProduct {
  id: string;
  sku: string;
  name: string;
  type: string;
  category: string;
  unit: string;
  unit_weight_kg: number;
  unit_cost: number;
  min_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockWithLogs {
  fertilizer_id: string;
  sku: string;
  name: string;
  fertilizer_type: string;
  category: string;
  unit: string;
  unit_weight_kg: number;
  available_qty: number;
  booked_qty: number;
  prepping_qty: number;
  total_qty: number;
  min_stock_threshold: number;
  unit_cost: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface StockLog {
  id: string;
  fertilizer_id: string;
  product_name: string;
  product_sku: string;
  change_type: 'stock_in' | 'stock_out' | 'adjustment' | 'initial';
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  reason: string;
  reference_id: string;
  performed_by: string;
  created_at: string;
}

// Get all products with stock
export async function getProductsWithStock(): Promise<StockWithLogs[]> {
  const { data, error } = await supabase
    .from('v_stock_with_logs')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return (data || []) as StockWithLogs[];
}

// Get single product details
export async function getProduct(productId: string): Promise<FertilizerProduct | null> {
  const { data, error } = await supabase
    .from('fertilizers')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) {
    console.error('Error fetching product:', error);
    return null;
  }

  return data as FertilizerProduct;
}

// Add new product
export async function addProduct(product: {
  sku: string;
  name: string;
  type: string;
  category: string;
  unit: string;
  unit_weight_kg: number;
  unit_cost: number;
  min_stock_threshold: number;
}): Promise<FertilizerProduct | null> {
  const { data, error } = await supabase
    .from('fertilizers')
    .insert({
      sku: product.sku,
      name: product.name,
      type: product.type,
      category: product.category,
      unit: product.unit,
      unit_weight_kg: product.unit_weight_kg,
      unit_cost: product.unit_cost,
      min_stock_threshold: product.min_stock_threshold,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding product:', error);
    return null;
  }

  // Initialize stock for new product
  await supabase.from('stock').insert({
    fertilizer_id: data.id,
    available_qty: 0,
    booked_qty: 0,
    prepping_qty: 0,
  });

  // Log initial entry
  await supabase.from('stock_logs').insert({
    fertilizer_id: data.id,
    product_name: data.name,
    product_sku: data.sku,
    change_type: 'initial',
    quantity_before: 0,
    quantity_change: 0,
    quantity_after: 0,
    reason: 'New product created',
    performed_by: 'System',
  });

  return data as FertilizerProduct;
}

// Update product
export async function updateProduct(
  productId: string,
  updates: {
    name?: string;
    category?: string;
    unit?: string;
    unit_weight_kg?: number;
    unit_cost?: number;
    min_stock_threshold?: number;
  }
): Promise<FertilizerProduct | null> {
  const { data, error } = await supabase
    .from('fertilizers')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    console.error('Error updating product:', error);
    return null;
  }

  return data as FertilizerProduct;
}

// Delete product (soft delete)
export async function deleteProduct(productId: string): Promise<boolean> {
  const { error } = await supabase
    .from('fertilizers')
    .update({ is_active: false })
    .eq('id', productId);

  if (error) {
    console.error('Error deleting product:', error);
    return false;
  }

  return true;
}

// Add stock (stock in)
export async function addStock(
  productId: string,
  quantity: number,
  reason: string,
  performedBy: string
): Promise<boolean> {
  // Get product info
  const { data: product } = await supabase
    .from('fertilizers')
    .select('id, name, sku')
    .eq('id', productId)
    .single();

  if (!product) {
    console.error('Product not found');
    return false;
  }

  // Get current stock
  const { data: stock } = await supabase
    .from('stock')
    .select('available_qty')
    .eq('fertilizer_id', productId)
    .single();

  const quantityBefore = stock?.available_qty || 0;
  const quantityAfter = quantityBefore + quantity;

  // Insert log
  const { error: logError } = await supabase.from('stock_logs').insert({
    fertilizer_id: productId,
    product_name: product.name,
    product_sku: product.sku,
    change_type: 'stock_in',
    quantity_before: quantityBefore,
    quantity_change: quantity,
    quantity_after: quantityAfter,
    reason,
    performed_by: performedBy,
  });

  if (logError) {
    console.error('Error logging stock change:', logError);
    return false;
  }

  // Update stock directly
  const { error: stockError } = await supabase
    .from('stock')
    .update({ available_qty: quantityAfter })
    .eq('fertilizer_id', productId);

  if (stockError) {
    console.error('Error adding stock:', stockError);
    return false;
  }

  return true;
}

// Remove stock (stock out)
export async function removeStock(
  productId: string,
  quantity: number,
  reason: string,
  performedBy: string
): Promise<boolean> {
  // Get product info
  const { data: product } = await supabase
    .from('fertilizers')
    .select('id, name, sku')
    .eq('id', productId)
    .single();

  if (!product) {
    console.error('Product not found');
    return false;
  }

  // Get current stock
  const { data: stock } = await supabase
    .from('stock')
    .select('available_qty')
    .eq('fertilizer_id', productId)
    .single();

  const quantityBefore = stock?.available_qty || 0;
  const quantityAfter = quantityBefore - quantity;

  if (quantityAfter < 0) {
    console.error('Insufficient stock');
    return false;
  }

  // Insert log
  const { error: logError } = await supabase.from('stock_logs').insert({
    fertilizer_id: productId,
    product_name: product.name,
    product_sku: product.sku,
    change_type: 'stock_out',
    quantity_before: quantityBefore,
    quantity_change: -quantity,
    quantity_after: quantityAfter,
    reason,
    performed_by: performedBy,
  });

  if (logError) {
    console.error('Error logging stock change:', logError);
    return false;
  }

  // Update stock directly
  const { error: stockError } = await supabase
    .from('stock')
    .update({ available_qty: quantityAfter })
    .eq('fertilizer_id', productId);

  if (stockError) {
    console.error('Error removing stock:', stockError);
    return false;
  }

  return true;
}

// Adjust stock (manual adjustment)
export async function adjustStock(
  productId: string,
  newQuantity: number,
  reason: string,
  performedBy: string
): Promise<boolean> {
  // Get product info
  const { data: product } = await supabase
    .from('fertilizers')
    .select('id, name, sku')
    .eq('id', productId)
    .single();

  if (!product) {
    console.error('Product not found');
    return false;
  }

  // Get current stock
  const { data: stock } = await supabase
    .from('stock')
    .select('available_qty')
    .eq('fertilizer_id', productId)
    .single();

  const quantityBefore = stock?.available_qty || 0;
  const quantityChange = newQuantity - quantityBefore;

  // Insert log
  const { error: logError } = await supabase.from('stock_logs').insert({
    fertilizer_id: productId,
    product_name: product.name,
    product_sku: product.sku,
    change_type: 'adjustment',
    quantity_before: quantityBefore,
    quantity_change: quantityChange,
    quantity_after: newQuantity,
    reason,
    performed_by: performedBy,
  });

  if (logError) {
    console.error('Error logging stock adjustment:', logError);
    return false;
  }

  // Update stock directly
  const { error: stockError } = await supabase
    .from('stock')
    .update({ available_qty: newQuantity })
    .eq('fertilizer_id', productId);

  if (stockError) {
    console.error('Error adjusting stock:', stockError);
    return false;
  }

  return true;
}

// Get stock history/logs
export async function getStockLogs(
  productId?: string,
  limit: number = 50
): Promise<StockLog[]> {
  let query = supabase
    .from('stock_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (productId) {
    query = query.eq('fertilizer_id', productId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching stock logs:', error);
    return [];
  }

  return (data || []) as StockLog[];
}

// Get low stock products
export async function getLowStockProducts(): Promise<StockWithLogs[]> {
  const { data, error } = await supabase
    .from('v_stock_with_logs')
    .select('*')
    .eq('stock_status', 'low_stock')
    .order('available_qty', { ascending: true });

  if (error) {
    console.error('Error fetching low stock products:', error);
    return [];
  }

  return (data || []) as StockWithLogs[];
}

// Get out of stock products
export async function getOutOfStockProducts(): Promise<StockWithLogs[]> {
  const { data, error } = await supabase
    .from('v_stock_with_logs')
    .select('*')
    .eq('stock_status', 'out_of_stock')
    .order('name');

  if (error) {
    console.error('Error fetching out of stock products:', error);
    return [];
  }

  return (data || []) as StockWithLogs[];
}

// Get products for dropdown select
export async function getProductList(): Promise<{ id: string; name: string; sku: string }[]> {
  const { data, error } = await supabase
    .from('fertilizers')
    .select('id, name, sku')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching product list:', error);
    return [];
  }

  return (data || []).map(p => ({ id: p.id, name: p.name, sku: p.sku }));
}