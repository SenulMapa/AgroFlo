import { supabase } from '../supabase';
import type { FertilizerItem } from '@/types';

export async function getInvoices() {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('generated_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }

  return (data || []).map((inv) => ({
    id: inv.id,
    requestId: inv.request_id,
    generatedAt: new Date(inv.generated_at),
    items: [],
    subtotal: Number(inv.subtotal),
    taxTotal: Number(inv.tax_total),
    grandTotal: Number(inv.grand_total),
    status: inv.status,
    releasedAt: inv.released_at ? new Date(inv.released_at) : undefined,
    paymentMethod: inv.payment_method as 'cash' | 'credit' | 'account' | undefined,
    paidAt: inv.paid_at ? new Date(inv.paid_at) : undefined,
    declineReason: inv.decline_reason,
  }));
}

export async function getInvoiceByRequest(requestId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('request_id', requestId)
    .single();

  if (error) {
    console.error('Error fetching invoice:', error);
    return null;
  }

  const inv = data;

  return {
    id: inv.id,
    requestId: inv.request_id,
    generatedAt: new Date(inv.generated_at),
    items: (inv.invoice_items || []).map((item: Record<string, unknown>) => ({
      sku: item.sku,
      name: item.name,
      type: '',
      quantity: item.quantity,
      unitCost: Number(item.unit_cost),
      tax: Number(item.tax),
      total: Number(item.total),
    })),
    subtotal: Number(inv.subtotal),
    taxTotal: Number(inv.tax_total),
    grandTotal: Number(inv.grand_total),
    status: inv.status,
    releasedAt: inv.released_at ? new Date(inv.released_at) : undefined,
    paymentMethod: inv.payment_method as 'cash' | 'credit' | 'account' | undefined,
    paidAt: inv.paid_at ? new Date(inv.paid_at) : undefined,
    declineReason: inv.decline_reason,
  };
}

export async function generateInvoice(
  requestId: string,
  userId: string,
  items: FertilizerItem[],
  subtotal: number,
  taxTotal: number,
  grandTotal: number
) {
  const invoiceCode = `INV-${requestId.split('-')[1]}`;

  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .insert({
      invoice_code: invoiceCode,
      request_id: requestId,
      generated_by_user_id: userId,
      status: 'generated',
      subtotal,
      tax_total: taxTotal,
      grand_total: grandTotal,
    })
    .select()
    .single();

  if (invError) {
    console.error('Error generating invoice:', invError);
    return null;
  }

  for (const item of items) {
    await supabase.from('invoice_items').insert({
      invoice_id: invoice.id,
      fertilizer_id: item.sku,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      unit_cost: item.unitCost,
      tax: item.tax,
      total: item.total,
    });
  }

  await supabase
    .from('transport_requests')
    .update({
      status: 'invoiced',
      invoice_id: invoice.id,
      invoice_generated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  return invoice;
}

export async function releaseInvoice(invoiceId: string, userId: string) {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
      released_by_user_id: userId,
    })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    console.error('Error releasing invoice:', error);
    return null;
  }

  await supabase
    .from('transport_requests')
    .update({ status: 'released' })
    .eq('invoice_id', invoiceId);

  return invoice;
}

export async function markInvoicePaid(invoiceId: string, paymentMethod: 'cash' | 'credit' | 'account') {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      payment_status: 'paid',
      payment_method: paymentMethod,
      paid_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    console.error('Error marking invoice paid:', error);
    return null;
  }

  await supabase
    .from('transport_requests')
    .update({ status: 'paid' })
    .eq('invoice_id', invoiceId);

  return invoice;
}