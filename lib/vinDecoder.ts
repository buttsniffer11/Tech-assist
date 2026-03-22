import { VehicleData } from '@/types';

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i;

export function validateVin(vin: string): boolean {
  return VIN_REGEX.test(vin);
}

interface NhtsaResult {
  Variable: string;
  Value: string | null;
}

export async function decodeVin(vin: string): Promise<Omit<VehicleData, 'paintCode' | 'paintStages'>> {
  if (!validateVin(vin)) {
    throw new Error('Invalid VIN — must be 17 alphanumeric characters (no I, O, or Q).');
  }

  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin.toUpperCase()}?format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NHTSA API error: ${res.status}`);

  const data = await res.json();
  const results: NhtsaResult[] = data.Results;

  const get = (variable: string) =>
    results.find((r) => r.Variable === variable)?.Value ?? '';

  return {
    vin: vin.toUpperCase(),
    make: get('Make'),
    model: get('Model'),
    year: get('Model Year'),
    bodyStyle: get('Body Class'),
  };
}
