// Fertilizer Pricing Database - Simulates fetching from backend DB

export interface FertilizerPrice {
  sku: string;
  name: string;
  type: string;
  unitCost: number;
  taxRate: number;
  inStock: boolean;
  availableStock: number;
}

export const fertilizerPrices: FertilizerPrice[] = [
  { sku: 'FER-UREA-50', name: 'Urea (46-0-0) - 50kg bag', type: 'Urea', unitCost: 4500, taxRate: 0.05, inStock: true, availableStock: 450 },
  { sku: 'FER-DAP-50', name: 'DAP (18-46-0) - 50kg bag', type: 'DAP', unitCost: 8200, taxRate: 0.05, inStock: true, availableStock: 280 },
  { sku: 'FER-MOP-50', name: 'MOP (0-0-60) - 50kg bag', type: 'MOP', unitCost: 6800, taxRate: 0.05, inStock: true, availableStock: 320 },
  { sku: 'FER-NPK-50', name: 'NPK (15-15-15) - 50kg bag', type: 'NPK', unitCost: 7500, taxRate: 0.05, inStock: true, availableStock: 180 },
  { sku: 'FER-TSP-50', name: 'TSP (0-46-0) - 50kg bag', type: 'TSP', unitCost: 5200, taxRate: 0.05, inStock: true, availableStock: 150 },
  { sku: 'FER-SUL-50', name: 'Sulphur (90%) - 50kg bag', type: 'Sulphur', unitCost: 3200, taxRate: 0.05, inStock: false, availableStock: 0 },
];

// Simulates async DB fetch - returns price for a fertilizer type
export async function fetchFertilizerPrice(fertilizerType: string): Promise<FertilizerPrice | null> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const price = fertilizerPrices.find(p => p.type.toLowerCase() === fertilizerType.toLowerCase());
  return price || null;
}

// Get all available fertilizers
export async function fetchAllFertilizers(): Promise<FertilizerPrice[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return fertilizerPrices;
}

// Get stock status
export async function fetchStockStatus(fertilizerType: string): Promise<{ inStock: boolean; availableStock: number }> {
  const price = await fetchFertilizerPrice(fertilizerType);
  return {
    inStock: price?.inStock || false,
    availableStock: price?.availableStock || 0
  };
}