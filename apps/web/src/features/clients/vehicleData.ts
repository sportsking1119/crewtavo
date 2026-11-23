import type { Database } from "@crewtavo/core/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/api";

/**
 * Temporary narrow typing overlay for the additive automotive migration.
 * Regenerate packages/core/src/database.types.ts with npm run db:types once the migration is
 * applied in the canonical dev database; remove this overlay in the subsequent cleanup.
 * Never relax database RLS or treat the cast as an authorization mechanism.
 */
export type VehicleRow = {
  id: string;
  company_id: string;
  client_id: string;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  license_plate: string | null;
  plate_region: string | null;
  odometer_value: number | null;
  odometer_unit: "mi" | "km";
  odometer_recorded_at: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type VehicleInsert =
  Pick<VehicleRow, "company_id" | "client_id"> &
  Partial<Omit<VehicleRow, "company_id" | "client_id">>;
type VehicleTable = {
  Row: VehicleRow;
  Insert: VehicleInsert;
  Update: Partial<VehicleRow>;
  Relationships: [];
};
type AutomotiveDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & { automotive_vehicles: VehicleTable };
  };
};

export const vehicleDb = () => supabase() as unknown as SupabaseClient<AutomotiveDatabase>;

/** The database intentionally blocks deletion of clients that have registered vehicles. */
export async function clientHasVehicles(companyId: string, clientId: string): Promise<boolean> {
  const { count, error } = await vehicleDb()
    .from("automotive_vehicles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("client_id", clientId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
