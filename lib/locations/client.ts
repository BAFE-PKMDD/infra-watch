/**
 * PSGC Location Sync Client
 * Handles fetching location data from https://psgc.bafe.gov.ph/api/v1/all
 */

export interface PsgcApiLocation {
  geo_code1: string;
  phcode_reg: string;
  reg_code1: string;
  reg_shortname: string;
  reg_name: string;
  phcode_prov: string;
  prov_code1: string;
  prov_name: string;
  phcode_mun: string;
  dist_code: string | null;
  district: string | null;
  city_class: string | null;
  mun_code1: string;
  mun_name: string;
  phcode_bgy: string;
  bgy_code1: string;
  bgy_name: string;
  lat: string;
  long: string;
  reg_code: string;
  prov_code: string;
  mun_code: string;
  bgy_code: string;
  geo_code: string;
}

/**
 * Fetch all locations from the PSGC API
 */
export async function fetchAllPsgcLocations(): Promise<PsgcApiLocation[]> {
  const url = process.env.PSGC_API_URL;

  if (!url) {
    throw new Error("PSGC_API_URL environment variable is not set");
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Higher timeout for large data
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from PSGC API: ${response.statusText}`);
    }

    const data = await response.json();

    // The API might return the array directly or wrapped in an object
    if (Array.isArray(data)) {
      return data;
    } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data;
    }

    throw new Error("Invalid response format from PSGC API");
  } catch (error) {
    console.error("Error fetching PSGC locations:", error);
    throw error;
  }
}
