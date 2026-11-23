import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { confirm } from "@/components/ui/Confirm";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormChecks, FormError } from "@/components/ui/Field";
import { Section } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { unwrap } from "@/lib/api";
import { can, hasRole, useSession } from "@/lib/session";
import { vehicleDb, type VehicleRow } from "./vehicleData";
import { blankVehicle, normalizeVin, vehicleTitle, vehicleValidation, type VehicleDraft } from "./vehicleFields";

type VehicleSummary = Pick<VehicleRow,
  "id" | "company_id" | "client_id" | "vin" | "year" | "make" | "model" | "trim" |
  "engine" | "license_plate" | "plate_region" | "odometer_value" | "odometer_unit" |
  "odometer_recorded_at" | "notes" | "archived_at" | "created_at" | "updated_at"
>;

const vehicleFields = "id, company_id, client_id, vin, year, make, model, trim, engine, license_plate, plate_region, odometer_value, odometer_unit, odometer_recorded_at, notes, archived_at, created_at, updated_at";

export function ClientVehicles({ clientId }: { clientId: string }) {
  const session = useSession();
  const queryClient = useQueryClient();
  const canManage = hasRole(session, "admin", "office", "estimator") && can(session, "sales");
  const [editing, setEditing] = useState<VehicleSummary | null | undefined>(undefined);
  const [showArchived, setShowArchived] = useState(false);
  const key = ["automotive-vehicles", session.company.id, clientId];

  const vehicles = useQuery({
    queryKey: key,
    enabled: canManage && Boolean(clientId),
    queryFn: async () => unwrap(
      await vehicleDb().from("automotive_vehicles")
        .select(vehicleFields)
        .eq("company_id", session.company.id)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
    ) as VehicleSummary[],
  });

  const toggleArchived = useMutation({
    meta: { success: "Vehicle updated" },
    mutationFn: async (vehicle: VehicleSummary) =>
      unwrap(await vehicleDb().from("automotive_vehicles")
        .update({ archived_at: vehicle.archived_at ? null : new Date().toISOString() })
        .eq("company_id", session.company.id)
        .eq("client_id", clientId)
        .eq("id", vehicle.id)
        .select("id").single()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  if (!canManage) return null;
  const active = (vehicles.data ?? []).filter((v) => !v.archived_at);
  const visible = showArchived ? (vehicles.data ?? []) : active;
  const archivedCount = (vehicles.data?.length ?? 0) - active.length;

  return (
    <>
      <Section
        title="Vehicles"
        count={active.length || undefined}
        action={<button type="button" onClick={() => setEditing(null)}>Add vehicle</button>}
      >
        {vehicles.isPending && <div className="rel"><div className="rel-row"><Skeleton width="55%" /></div></div>}
        {vehicles.error && <ErrorState compact error={vehicles.error} onRetry={() => vehicles.refetch()} />}
        {vehicles.data && visible.length === 0 && (
          <EmptyState
            inline
            title={showArchived ? "No registered vehicles" : "No active vehicles yet"}
            action={<Button icon="plus" onClick={() => setEditing(null)}>Add vehicle</Button>}
          />
        )}
        {visible.length > 0 && (
          <ul className="rel" role="list" aria-label="Customer vehicles">
            {visible.map((vehicle) => (
              <li className="rel-row" key={vehicle.id}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <strong>{vehicleTitle(vehicle)}</strong>
                  {vehicle.archived_at && <span className="muted small"> · Archived</span>}
                  <div className="muted small">
                    {[
                      vehicle.trim,
                      vehicle.vin && `VIN ${vehicle.vin}`,
                      vehicle.license_plate && `Plate ${vehicle.license_plate}`,
                      vehicle.odometer_value != null && `${vehicle.odometer_value.toLocaleString()} ${vehicle.odometer_unit}`,
                    ].filter(Boolean).join(" · ") || "Vehicle details not provided"}
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <Button size="sm" onClick={() => setEditing(vehicle)}>Edit</Button>
                  <Button
                    size="sm"
                    loading={toggleArchived.isPending && toggleArchived.variables?.id === vehicle.id}
                    onClick={async () => {
                      if (!vehicle.archived_at && !(await confirm({
                        title: `Archive ${vehicleTitle(vehicle)}?`,
                        body: "The vehicle will remain in your records, but it won't appear in the active list.",
                        confirmLabel: "Archive vehicle",
                      }))) return;
                      toggleArchived.mutate(vehicle);
                    }}
                  >
                    {vehicle.archived_at ? "Restore" : "Archive"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {archivedCount > 0 && (
          <button type="button" className="link-btn" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? "Hide archived" : `Show ${archivedCount} archived`}
          </button>
        )}
      </Section>
      {editing !== undefined && (
        <VehicleDialog
          key={editing?.id ?? "new"}
          clientId={clientId}
          vehicle={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  );
}

function VehicleDialog({ clientId, vehicle, onClose }: {
  clientId: string;
  vehicle: VehicleSummary | null;
  onClose: () => void;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const insertId = useRef<string | null>(null);
  const submitting = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fields, setFields] = useState<VehicleDraft>({
    ...blankVehicle(),
    ...(vehicle ? {
      vin: vehicle.vin ?? "",
      year: vehicle.year == null ? "" : String(vehicle.year),
      make: vehicle.make ?? "",
      model: vehicle.model ?? "",
      trim: vehicle.trim ?? "",
      engine: vehicle.engine ?? "",
      license_plate: vehicle.license_plate ?? "",
      plate_region: vehicle.plate_region ?? "",
      odometer_value: vehicle.odometer_value == null ? "" : String(vehicle.odometer_value),
      odometer_unit: vehicle.odometer_unit,
      notes: vehicle.notes ?? "",
    } : {}),
  });
  const set = (field: keyof VehicleDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields((old) => ({ ...old, [field]: event.target.value }));

  const save = useMutation({
    meta: { inline: true, success: vehicle ? "Vehicle saved" : "Vehicle added" },
    mutationFn: async () => {
      const db = vehicleDb();
      const reading = fields.odometer_value === "" ? null : Number(fields.odometer_value);
      const unchangedReading = vehicle &&
        vehicle.odometer_value === reading &&
        vehicle.odometer_unit === fields.odometer_unit;
      const row = {
        vin: normalizeVin(fields.vin) || null,
        year: fields.year ? Number(fields.year) : null,
        make: fields.make.trim() || null,
        model: fields.model.trim() || null,
        trim: fields.trim.trim() || null,
        engine: fields.engine.trim() || null,
        license_plate: fields.license_plate.trim() || null,
        plate_region: fields.plate_region.trim() || null,
        odometer_value: reading,
        odometer_unit: fields.odometer_unit,
        odometer_recorded_at: reading == null ? null :
          unchangedReading && vehicle?.odometer_recorded_at ? vehicle.odometer_recorded_at : new Date().toISOString(),
        notes: fields.notes.trim() || null,
      };
      if (vehicle) {
        return unwrap(await db.from("automotive_vehicles").update(row)
          .eq("company_id", session.company.id).eq("client_id", clientId).eq("id", vehicle.id)
          .select("id").single());
      }

      // Stable ID across retries. If the first insert succeeded but the response was lost,
      // the same form cannot create a second vehicle with a second ID.
      if (!insertId.current) insertId.current = crypto.randomUUID();
      const { data, error } = await db.from("automotive_vehicles")
        .insert({ id: insertId.current, company_id: session.company.id, client_id: clientId, ...row })
        .select("id").single();
      if (error?.code === "23505") {
        const existing = unwrap(await db.from("automotive_vehicles").select("id")
          .eq("company_id", session.company.id).eq("client_id", clientId)
          .eq("id", insertId.current).maybeSingle());
        if (existing) return existing;
      }
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automotive-vehicles", session.company.id, clientId] });
      onClose();
    },
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    const reason = vehicleValidation(fields);
    setErrorMessage(reason);
    if (reason) return;
    submitting.current = true;
    try {
      await save.mutateAsync();
    } catch {
      // FormError displays the failed write; allow an explicit retry.
    } finally {
      submitting.current = false;
    }
  };

  return (
    <Dialog open onClose={save.isPending ? () => undefined : onClose} title={vehicle ? "Edit vehicle" : "Add vehicle"} size="lg">
      <form onSubmit={submit}>
        <p className="muted small">Register a customer's vehicle. You can enter its VIN or its make and model.</p>
        <Field label="VIN" optional>
          <input className="input" value={fields.vin} onChange={set("vin")}
            maxLength={24} placeholder="17-character VIN" autoCapitalize="characters" spellCheck={false} />
        </Field>
        <div className="form-grid-3">
          <Field label="Year" optional>
            <input className="input" value={fields.year} onChange={set("year")} maxLength={4}
              inputMode="numeric" placeholder="2020" />
          </Field>
          <Field label="Make" optional>
            <input className="input" value={fields.make} onChange={set("make")} maxLength={80} placeholder="Toyota" />
          </Field>
          <Field label="Model" optional>
            <input className="input" value={fields.model} onChange={set("model")} maxLength={80} placeholder="Camry" />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Trim" optional>
            <input className="input" value={fields.trim} onChange={set("trim")} maxLength={80} />
          </Field>
          <Field label="Engine" optional>
            <input className="input" value={fields.engine} onChange={set("engine")} maxLength={120} />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="License plate" optional>
            <input className="input" value={fields.license_plate} onChange={set("license_plate")} maxLength={32} />
          </Field>
          <Field label="State / Region" optional>
            <input className="input" value={fields.plate_region} onChange={set("plate_region")} maxLength={40} placeholder="AL" />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Odometer" optional>
            <input className="input" type="number" inputMode="numeric" min={0} max={2147483647} step={1}
              value={fields.odometer_value} onChange={set("odometer_value")} placeholder="125000" />
          </Field>
          <Field label="Units">
            <select className="select" value={fields.odometer_unit}
              onChange={(event) => setFields((old) => ({ ...old, odometer_unit: event.target.value as "mi" | "km" }))}>
              <option value="mi">Miles</option>
              <option value="km">Kilometers</option>
            </select>
          </Field>
        </div>
        <Field label="Vehicle notes" optional>
          <textarea className="textarea" value={fields.notes} onChange={set("notes")}
            maxLength={4000} placeholder="Customer-provided details, existing damage, or concerns" />
        </Field>
        {errorMessage && <p role="alert" className="form-error">{errorMessage}</p>}
        <FormError error={save.error} />
        <div className="form-actions">
          <FormChecks />
          <Button onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button variant="primary" type="submit" loading={save.isPending}>
            {vehicle ? "Save vehicle" : "Add vehicle"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
