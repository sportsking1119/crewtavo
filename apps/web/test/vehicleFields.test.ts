import { describe, expect, it } from "vitest";
import { blankVehicle, normalizeVin, validVin, vehicleTitle, vehicleValidation } from "../src/features/clients/vehicleFields";

describe("automotive vehicle registration", () => {
  it("normalizes VIN without losing significant characters", () => {
    expect(normalizeVin(" 1hg-cm82633a004352 ")).toBe("1HGCM82633A004352");
    expect(validVin("1hgcm82633a004352")).toBe(true);
    expect(validVin("1HGCM82633A00435O")).toBe(false);
    expect(validVin("short")).toBe(false);
    expect(validVin("")).toBe(true);
  });

  it("requires either a valid VIN or make and model", () => {
    const empty = blankVehicle();
    expect(vehicleValidation(empty)).toMatch(/make and model/i);
    expect(vehicleValidation({ ...empty, vin: "1HGCM82633A004352" })).toBeNull();
    expect(vehicleValidation({ ...empty, make: "Honda", model: "Accord" })).toBeNull();
    expect(vehicleValidation({ ...empty, make: "Honda" })).toMatch(/make and model/i);
    expect(vehicleValidation({ ...empty, vin: "12345", make: "Honda", model: "Accord" })).toMatch(/VIN/i);
  });

  it("validates year and odometer without silently accepting decimals or negative readings", () => {
    const base = { ...blankVehicle(), make: "Ford", model: "F-150" };
    expect(vehicleValidation({ ...base, year: "2024", odometer_value: "121045" })).toBeNull();
    expect(vehicleValidation({ ...base, year: "1885" })).toMatch(/year/i);
    expect(vehicleValidation({ ...base, year: "20ab" })).toMatch(/year/i);
    expect(vehicleValidation({ ...base, odometer_value: "-1" })).toMatch(/odometer/i);
    expect(vehicleValidation({ ...base, odometer_value: "32.5" })).toMatch(/odometer/i);
    expect(vehicleValidation({ ...base, odometer_value: "2147483648" })).toMatch(/odometer/i);
  });

  it("builds useful titles even with missing vehicle data", () => {
    expect(vehicleTitle({ year: 2024, make: "Honda", model: "Civic" })).toBe("2024 Honda Civic");
    expect(vehicleTitle({ make: "Ford" })).toBe("Ford");
    expect(vehicleTitle({ vin: "1HGCM82633A004352" })).toBe("VIN 1HGCM82633A004352");
    expect(vehicleTitle({})).toBe("Vehicle");
  });
});
