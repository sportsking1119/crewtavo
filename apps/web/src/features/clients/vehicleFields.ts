/** Pure vehicle field rules, shared by the browser form and its unit tests. */
export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
export const normalizeVin = (raw: string) => raw.toUpperCase().replace(/[\s-]/g, "");
export const validVin = (raw: string) => raw === "" || VIN_PATTERN.test(normalizeVin(raw));

export type VehicleDraft = {
  vin: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  engine: string;
  license_plate: string;
  plate_region: string;
  odometer_value: string;
  odometer_unit: "mi" | "km";
  notes: string;
};

export const blankVehicle = (): VehicleDraft => ({
  vin: "", year: "", make: "", model: "", trim: "", engine: "",
  license_plate: "", plate_region: "", odometer_value: "", odometer_unit: "mi", notes: "",
});

export function vehicleValidation(d: VehicleDraft): string | null {
  const vin = normalizeVin(d.vin);
  if (vin && !VIN_PATTERN.test(vin)) return "VIN must be 17 characters, using letters and numbers except I, O and Q.";
  if (!vin && (!d.make.trim() || !d.model.trim())) return "Add a make and model, or enter a VIN.";
  if (d.year && (!/^\d{4}$/.test(d.year) || Number(d.year) < 1886 || Number(d.year) > 2200)) return "Enter a valid four-digit vehicle year.";
  if (d.odometer_value && (!/^\d+$/.test(d.odometer_value) || Number(d.odometer_value) > 2147483647)) return "Enter a valid whole-number odometer reading.";
  return null;
}

export function vehicleTitle(v: { vin?: string | null; year?: number | null; make?: string | null; model?: string | null }): string {
  const name = [v.year, v.make, v.model].filter(Boolean).join(" ").trim();
  return name || (v.vin ? `VIN ${v.vin}` : "Vehicle");
}
