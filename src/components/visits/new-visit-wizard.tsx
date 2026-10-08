"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import {
  createClientQuickAction,
  createEquipmentQuickAction,
  createServiceVisitAction,
  getCompatiblePartsAction,
} from "@/app/actions";
import type { Client, Equipment, QuoteUnit } from "@/types/database";
import {
  appendDiagnosis,
  calculateVisitTotal,
  toggleSelection,
} from "@/lib/field-service/workflow";
import { formatCompanyPhone } from "@/lib/auth/validation";

type VisitType =
  | "PREVENTIVE"
  | "CORRECTIVE"
  | "INSPECTION"
  | "INSTALLATION";

type ItemStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

type VisitItem = {
  equipment_id: string;
  diagnosis: string;
  recommendation: string;
  status: ItemStatus;
};

type Material = {
  id: string;
  equipment_id?: string;
  line_type: "PRODUCT" | "MATERIAL";
  description: string;
  quantity: number;
  unit: QuoteUnit;
  unit_price: number | null;
};

type Service = {
  id: string;
  equipment_id?: string;
  line_type: "SERVICE" | "LABOR";
  description: string;
  quantity: number;
  unit_price: number;
};

type Photo = {
  file: File;
  type: "PROBLEM" | "BEFORE" | "GENERAL";
};

const steps = [
  "Cliente",
  "Equipamentos",
  "Diagnóstico",
  "Materiais",
  "Revisão",
];

const visitTypes: Array<[VisitType, string, string]> = [
  ["PREVENTIVE", "Preventiva", "Rotina e prevenção"],
  ["CORRECTIVE", "Corretiva", "Falha ou reparo"],
  ["INSPECTION", "Inspeção", "Avaliação técnica"],
  ["INSTALLATION", "Instalação", "Novo equipamento"],
];

const quickTags = [
  "Cabo de aço",
  "Roldana",
  "Lona",
  "Prancha",
  "Rolamento",
  "Correia",
  "Parafuso/porca",
  "Lubrificação",
  "Ajuste",
  "Estofado",
  "Outro",
];

const units: QuoteUnit[] = [
  "UNIDADE",
  "METRO",
  "CENTIMETRO",
  "METRO_QUADRADO",
  "QUILO",
  "LITRO",
  "KIT",
];

type ClientCard = Pick<
  Client,
  "id" | "name" | "responsible_name" | "phone" | "email" | "city"
>;

type EquipmentCard = Pick<
  Equipment,
  | "id"
  | "client_id"
  | "name"
  | "brand"
  | "model"
  | "location"
  | "status"
  | "category"
  | "serial_number"
  | "equipment_model_id"
>;

export function NewVisitWizard({
  initialClients,
  initialEquipment,
}: {
  initialClients: ClientCard[];
  initialEquipment: EquipmentCard[];
}) {
  const [step, setStep] = useState(0);
  const [clients, setClients] = useState(initialClients);
  const [equipment, setEquipment] = useState(initialEquipment);
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [visitType, setVisitType] =
    useState<VisitType>("CORRECTIVE");
  const [items, setItems] = useState<Record<string, VisitItem>>({});
  const [materials, setMaterials] = useState<Material[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [photos, setPhotos] = useState<Record<string, Photo[]>>({});
  const [compatibleParts, setCompatibleParts] = useState<
    Record<
      string,
      Array<{
        part: {
          id: string;
          name: string;
          unit: QuoteUnit;
        };
        link?: {
          quantity: number | null;
          technical_value: string | null;
        };
      }>
    >
  >({});
  const [showClientForm, setShowClientForm] = useState(false);
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedClient = clients.find(
    (client) => client.id === clientId,
  );

  const clientEquipment = equipment.filter(
    (item) => item.client_id === clientId,
  );

  const filteredClients = clients.filter((client) =>
    `${client.name} ${client.responsible_name ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const chosenEquipment = selectedEquipment
    .map((id) => equipment.find((item) => item.id === id))
    .filter(Boolean) as EquipmentCard[];

  const total = calculateVisitTotal([
    ...materials.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unit_price,
    })),
    ...services.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unit_price,
    })),
  ]);

  function selectClient(id: string) {
    setClientId(id);
    setSelectedEquipment([]);
    setItems({});
    setStep(1);
    setNotice("");
  }

  function toggleEquipment(id: string) {
    setSelectedEquipment((current) =>
      toggleSelection(current, id),
    );

    setItems((current) =>
      current[id]
        ? current
        : {
            ...current,
            [id]: {
              equipment_id: id,
              diagnosis: "",
              recommendation: "",
              status: "COMPLETED",
            },
          },
    );
  }

  function updateItem(
    id: string,
    field: keyof VisitItem,
    value: string,
  ) {
    setItems((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value,
      },
    }));
  }

  function addShortcut(id: string, text: string) {
    updateItem(
      id,
      "diagnosis",
      appendDiagnosis(items[id]?.diagnosis ?? "", text),
    );
  }

  function handlePhotos(
    equipmentId: string,
    type: Photo["type"],
    files: FileList | null,
  ) {
    if (!files) return;

    setPhotos((current) => ({
      ...current,
      [equipmentId]: [
        ...(current[equipmentId] ?? []),
        ...Array.from(files).map((file) => ({
          file,
          type,
        })),
      ],
    }));
  }

  function removePhoto(equipmentId: string, index: number) {
    setPhotos((current) => ({
      ...current,
      [equipmentId]: (current[equipmentId] ?? []).filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  }

  async function handleQuickClient(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setNotice("");

    const result = await createClientQuickAction(
      new FormData(event.currentTarget),
    );

    if (result.error || !result.data) {
      setNotice(
        result.error ?? "Erro ao cadastrar academia.",
      );
      return;
    }

    setClients((current) => [...current, result.data!]);
    setShowClientForm(false);
    selectClient(result.data.id);
  }

  async function handleQuickEquipment(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setNotice("");

    const result = await createEquipmentQuickAction(
      new FormData(event.currentTarget),
    );

    if (result.error || !result.data) {
      setNotice(
        result.error ?? "Erro ao cadastrar equipamento.",
      );
      return;
    }

    const created = {
      ...result.data,
      client_id: clientId,
      category: null,
      serial_number: null,
    } as EquipmentCard;

    setEquipment((current) => [...current, created]);

    setSelectedEquipment((current) => [
      ...current,
      created.id,
    ]);

    setItems((current) => ({
      ...current,
      [created.id]: {
        equipment_id: created.id,
        diagnosis: "",
        recommendation: "",
        status: "COMPLETED",
      },
    }));

    setShowEquipmentForm(false);
  }

  async function loadCompatibleParts(item: EquipmentCard) {
    if (!item.equipment_model_id) return;

    const result = await getCompatiblePartsAction(
      item.equipment_model_id,
    );

    setCompatibleParts((current) => ({
      ...current,
      [item.id]: result.data,
    }));
  }

  function addCompatiblePart(
    item: EquipmentCard,
    part: {
      part: {
        name: string;
        unit: QuoteUnit;
      };
      link?: {
        quantity: number | null;
        technical_value: string | null;
      };
    },
  ) {
    setMaterials((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        equipment_id: item.id,
        line_type: "MATERIAL",
        description: part.part.name,
        quantity: part.link?.quantity ?? 1,
        unit: part.part.unit,
        unit_price: null,
      },
    ]);
  }

  function next() {
    setNotice("");

    if (step === 0 && !clientId) {
      setNotice(
        "Selecione uma academia para continuar.",
      );
      return;
    }

    if (step === 1 && selectedEquipment.length === 0) {
      setNotice(
        "Selecione pelo menos um equipamento.",
      );
      return;
    }

    if (step < steps.length - 1) {
      setStep((current) => current + 1);
    }
  }

  function back() {
    setNotice("");

    if (step > 0) {
      setStep((current) => current - 1);
    } else {
      window.history.back();
    }
  }

  async function saveVisit() {
    setSaving(true);
    setNotice("");

    const formData = new FormData();

    formData.set(
      "payload",
      JSON.stringify({
        clientId,
        type: visitType,
        notes: "",
        items: selectedEquipment.map((id) => items[id]),
        materials,
        services,
      }),
    );

    const photoMetadata: Array<{
      field: string;
      equipmentId: string;
      type: Photo["type"];
    }> = [];

    Object.entries(photos).forEach(
      ([equipmentId, files]) =>
        files.forEach((photo, index) => {
          const field = `photo_${equipmentId}_${index}`;
          formData.append(field, photo.file);

          photoMetadata.push({
            field,
            equipmentId,
            type: photo.type,
          });
        }),
    );

    formData.set(
      "photoMetadata",
      JSON.stringify(photoMetadata),
    );

    const result =
      await createServiceVisitAction(formData);

    if (result.error) {
      setNotice(result.error);
      setSaving(false);
    }
  }

  return (
    <div className="pb-24">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/visitas"
            className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Visitas
          </Link>

          <p className="font-mono text-xs uppercase tracking-[0.2em] text-teal-300">
            Atendimento em campo
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-white">
            Nova visita
          </h1>
        </div>

        <div className="hidden rounded-lg border border-teal-300/20 bg-teal-300/5 px-4 py-3 text-right sm:block">
          <p className="text-xs text-slate-500">
            Etapa
          </p>

          <p className="font-mono text-sm text-teal-200">
            {step + 1} / {steps.length}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-5 gap-1">
        {steps.map((label, index) => (
          <div key={label} className="min-w-0">
            <div
              className={`h-1 rounded-full ${
                index <= step
                  ? "bg-teal-300"
                  : "bg-white/10"
              }`}
            />

            <p
              className={`mt-2 truncate text-[10px] uppercase tracking-[0.08em] ${
                index === step
                  ? "text-teal-200"
                  : "text-slate-500"
              }`}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {notice && (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100"
        >
          {notice}
        </p>
      )}

      <div>
        {step === 0 && (
          <section className="space-y-5">
            <SectionTitle
              title="Escolha a academia"
              subtitle="Comece pelo cliente atendido nesta visita."
              action={
                <button
                  type="button"
                  onClick={() =>
                    setShowClientForm(
                      (value) => !value,
                    )
                  }
                  className="button-secondary"
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar cliente
                </button>
              }
            />

            {showClientForm && (
              <QuickClientForm
                onSubmit={handleQuickClient}
              />
            )}

            <label className="block">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar academia ou responsável"
                className="input"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredClients.map((client) => (
                <button
                  type="button"
                  key={client.id}
                  onClick={() =>
                    selectClient(client.id)
                  }
                  className={`rounded-xl border p-4 text-left transition ${
                    clientId === client.id
                      ? "border-teal-300 bg-teal-300/10"
                      : "border-white/10 bg-white/[0.03] hover:border-teal-300/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        {client.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {client.responsible_name ||
                          "Responsável não informado"}
                      </p>

                      <p className="mt-3 text-xs text-slate-500">
                        {client.phone ||
                          "Telefone não informado"}
                        {client.city
                          ? ` · ${client.city}`
                          : ""}
                      </p>
                    </div>

                    {clientId === client.id && (
                      <Check className="h-5 w-5 shrink-0 text-teal-300" />
                    )}
                  </div>

                  <span className="mt-4 inline-flex text-xs font-semibold text-teal-300">
                    Selecionar
                  </span>
                </button>
              ))}
            </div>

            {filteredClients.length === 0 && (
              <Empty text="Nenhuma academia encontrada." />
            )}
          </section>
        )}

        {step === 1 && (
          <section className="space-y-5">
            <SectionTitle
              title="Equipamentos da academia"
              subtitle={
                selectedClient?.name ??
                "Selecione os equipamentos envolvidos."
              }
              action={
                <button
                  type="button"
                  onClick={() =>
                    setShowEquipmentForm(
                      (value) => !value,
                    )
                  }
                  className="button-secondary"
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar equipamento
                </button>
              }
            />

            {showEquipmentForm && (
              <QuickEquipmentForm
                clientId={clientId}
                onSubmit={handleQuickEquipment}
              />
            )}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {clientEquipment.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 transition ${
                    selectedEquipment.includes(item.id)
                      ? "border-teal-300 bg-teal-300/10"
                      : "border-white/10 bg-white/[0.03] hover:border-teal-300/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      toggleEquipment(item.id)
                    }
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {item.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {[item.brand, item.model]
                            .filter(Boolean)
                            .join(" · ") ||
                            "Marca/modelo não informado"}
                        </p>

                        <p className="mt-3 text-xs text-slate-500">
                          {item.location ||
                            "Localização não informada"}{" "}
                          · {item.status}
                        </p>
                      </div>

                      <span
                        className={`grid h-6 w-6 place-items-center rounded-full border text-xs ${
                          selectedEquipment.includes(
                            item.id,
                          )
                            ? "border-teal-300 bg-teal-300 text-[#071015]"
                            : "border-white/20 text-transparent"
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </span>
                    </div>
                  </button>

                  {item.equipment_model_id && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                      <Link
                        href={`/biblioteca-tecnica/modelos/${item.equipment_model_id}`}
                        className="text-xs font-semibold text-teal-300"
                      >
                        Ver ficha técnica
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          loadCompatibleParts(item)
                        }
                        className="text-xs font-semibold text-slate-300 hover:text-white"
                      >
                        Peças compatíveis
                      </button>
                    </div>
                  )}

                  {compatibleParts[item.id]?.length ? (
                    <div className="mt-3 space-y-2">
                      {compatibleParts[item.id].map(
                        (part) => (
                          <button
                            type="button"
                            key={part.part.id}
                            onClick={() =>
                              addCompatiblePart(
                                item,
                                part,
                              )
                            }
                            className="block w-full rounded-md bg-black/20 px-3 py-2 text-left text-xs text-teal-100 hover:bg-teal-300/10"
                          >
                            + {part.part.name}
                            {part.link?.technical_value
                              ? ` · ${part.link.technical_value}`
                              : ""}
                          </button>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {clientEquipment.length === 0 && (
              <Empty text="Esta academia ainda não possui equipamentos." />
            )}
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <SectionTitle
              title="Diagnóstico da visita"
              subtitle="Registre o essencial por equipamento. Você pode complementar depois."
            />

            <div className="grid gap-5 xl:grid-cols-2">
              {chosenEquipment.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        {item.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        {item.location ||
                          "Local não informado"}
                      </p>
                    </div>

                    <select
                      value={
                        items[item.id]?.status ??
                        "COMPLETED"
                      }
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          "status",
                          event.target.value,
                        )
                      }
                      className="select"
                    >
                      <option value="COMPLETED">
                        OK
                      </option>
                      <option value="IN_PROGRESS">
                        ATENÇÃO
                      </option>
                      <option value="PENDING">
                        TROCAR
                      </option>
                      <option value="CANCELLED">
                        PARADO
                      </option>
                    </select>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {quickTags.map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() =>
                          addShortcut(
                            item.id,
                            tag,
                          )
                        }
                        className="tag"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>

                  <label className="mt-4 block text-sm text-slate-300">
                    Diagnóstico

                    <textarea
                      value={
                        items[item.id]
                          ?.diagnosis ?? ""
                      }
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          "diagnosis",
                          event.target.value,
                        )
                      }
                      rows={3}
                      className="input mt-2 resize-y"
                      placeholder="O que foi encontrado?"
                    />
                  </label>

                  <label className="mt-4 block text-sm text-slate-300">
                    Recomendação

                    <textarea
                      value={
                        items[item.id]
                          ?.recommendation ?? ""
                      }
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          "recommendation",
                          event.target.value,
                        )
                      }
                      rows={2}
                      className="input mt-2 resize-y"
                      placeholder="Próximo passo recomendado"
                    />
                  </label>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <PhotoInput
                      label="Problema"
                      type="PROBLEM"
                      equipmentId={item.id}
                      onChange={handlePhotos}
                    />

                    <PhotoInput
                      label="Antes"
                      type="BEFORE"
                      equipmentId={item.id}
                      onChange={handlePhotos}
                    />

                    <PhotoInput
                      label="Geral"
                      type="GENERAL"
                      equipmentId={item.id}
                      onChange={handlePhotos}
                    />
                  </div>

                  {photos[item.id]?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {photos[item.id].map(
                        (photo, index) => (
                          <span
                            key={`${photo.file.name}-${index}`}
                            className="inline-flex max-w-full items-center gap-2 rounded-md bg-white/10 px-2 py-1 text-xs text-slate-300"
                          >
                            <span className="max-w-28 truncate">
                              {photo.file.name}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                removePhoto(
                                  item.id,
                                  index,
                                )
                              }
                              aria-label="Remover foto"
                            >
                              <Trash2 className="h-3 w-3 text-rose-300" />
                            </button>
                          </span>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-teal-300/20 bg-teal-300/5 p-4 text-sm text-slate-300">
              <Camera className="mb-2 h-5 w-5 text-teal-300" />
              As fotos ficam vinculadas à empresa,
              visita e equipamento no Storage privado.
            </div>
          </section>
        )}

        {step === 3 && (
          <MaterialsStep
            equipment={chosenEquipment}
            materials={materials}
            services={services}
            setMaterials={setMaterials}
            setServices={setServices}
          />
        )}

        {step === 4 && (
          <ReviewStep
            client={selectedClient}
            equipment={chosenEquipment}
            items={items}
            materials={materials}
            services={services}
            visitType={visitType}
            total={total}
            setVisitType={setVisitType}
          />
        )}

        <div className="mt-8 rounded-xl border border-white/10 bg-[#09141a]/95 p-3 shadow-2xl shadow-black/20 backdrop-blur sm:flex sm:items-center sm:justify-between sm:p-4">
          <button
            type="button"
            onClick={back}
            className="button-secondary w-full justify-center sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="button-primary mt-2 w-full justify-center sm:mt-0 sm:w-auto"
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={saveVisit}
              disabled={saving}
              className="button-primary mt-2 w-full justify-center sm:mt-0 sm:w-auto"
            >
              {saving
                ? "Salvando..."
                : "Salvar visita"}
              <Check className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {step === 0 && (
        <div className="mt-6">
          <div className="grid gap-3 sm:grid-cols-4">
            {visitTypes.map(
              ([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() =>
                    setVisitType(value)
                  }
                  className={`rounded-lg border p-3 text-left text-sm ${
                    visitType === value
                      ? "border-teal-300 text-teal-100"
                      : "border-white/10 text-slate-400"
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-white">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          {subtitle}
        </p>
      </div>

      {action}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function QuickClientForm({
  onSubmit,
}: {
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>,
  ) => void;
}) {
  const [phone, setPhone] = useState("");

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-teal-300/20 bg-teal-300/5 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="name"
          required
          placeholder="Nome da academia"
          className="input"
        />

        <input
          name="responsibleName"
          placeholder="Responsável"
          className="input"
        />

        <input
          name="phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => setPhone(formatCompanyPhone(event.target.value))}
          placeholder="(00) 00000-0000"
          className="input"
        />

        <input
          name="email"
          type="email"
          placeholder="E-mail opcional"
          className="input"
        />

        <input
          name="city"
          placeholder="Cidade opcional"
          className="input sm:col-span-2"
        />
      </div>

      <button
        className="button-primary mt-3"
        type="submit"
      >
        Salvar e selecionar
      </button>
    </form>
  );
}

function QuickEquipmentForm({
  clientId,
  onSubmit,
}: {
  clientId: string;
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>,
  ) => void;
}) {
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");
  const [model, setModel] = useState("");
  const [equipmentModelId, setEquipmentModelId] = useState("");

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-teal-300/20 bg-teal-300/5 p-4"
    >
      <input
        type="hidden"
        name="clientId"
        value={clientId}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="name"
          required
          placeholder="Nome do equipamento"
          className="input"
        />

        <TechnicalAutocomplete
          kind="category"
          value={category}
          placeholder="Categoria"
          onChange={(value) => { setCategory(value); setBrand(""); setManufacturerId(""); setModel(""); setEquipmentModelId(""); }}
          onSelect={(item) => { setCategory(item.id); setBrand(""); setManufacturerId(""); setModel(""); setEquipmentModelId(""); }}
        />
        <TechnicalAutocomplete
          kind="manufacturer"
          value={brand}
          category={category}
          placeholder="Marca"
          onChange={(value) => { setBrand(value); setManufacturerId(""); setModel(""); setEquipmentModelId(""); }}
          onSelect={(item) => { setBrand(item.label); setManufacturerId(item.id); setModel(""); setEquipmentModelId(""); }}
        />
        <TechnicalAutocomplete
          kind="model"
          value={model}
          category={category}
          manufacturerId={manufacturerId}
          placeholder="Modelo"
          onChange={(value) => { setModel(value); setEquipmentModelId(""); }}
          onSelect={(item) => { setModel(item.label); setEquipmentModelId(item.id); }}
        />
        <input type="hidden" name="equipmentModelId" value={equipmentModelId} />

        <input
          name="serialNumber"
          placeholder="Número de série opcional"
          className="input"
        />

        <input
          name="location"
          placeholder="Localização opcional"
          className="input"
        />
      </div>

      <button
        className="button-primary mt-3"
        type="submit"
      >
        Salvar e selecionar
      </button>
    </form>
  );
}

type TechnicalSuggestion = { id: string; label: string; model_name?: string; model_code?: string | null };

function TechnicalAutocomplete({ kind, value, category, manufacturerId, placeholder, onChange, onSelect }: { kind: "category" | "manufacturer" | "model"; value: string; category?: string; manufacturerId?: string; placeholder: string; onChange: (value: string) => void; onSelect: (item: TechnicalSuggestion) => void }) {
  const [items, setItems] = useState<TechnicalSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (kind !== "category" && !category) { window.setTimeout(() => setItems([]), 0); return; }
    if (kind === "model" && !manufacturerId) { window.setTimeout(() => setItems([]), 0); return; }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ kind, q: value });
      if (category) params.set("category", category);
      if (manufacturerId) params.set("manufacturerId", manufacturerId);
      try { const response = await fetch(`/api/visitas/technical-catalog?${params.toString()}`, { cache: "no-store" }); const payload = await response.json() as { items?: Array<Record<string, string | null>> }; const next = (payload.items ?? []).map((item) => ({ id: String(item.id ?? item.code), label: String(item.label ?? item.model_name ?? ""), model_name: item.model_name ?? undefined, model_code: item.model_code })); setItems(next); setActiveIndex(0); setOpen(true); } catch { setItems([]); setOpen(true); } finally { setLoading(false); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [kind, value, category, manufacturerId]);

  function keyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setOpen(false); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, Math.max(items.length - 1, 0))); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
    if (event.key === "Enter" && open && items[activeIndex]) { event.preventDefault(); onSelect(items[activeIndex]); setOpen(false); }
  }

  return <div ref={wrapperRef} className="relative z-30"><input ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} onFocus={() => setOpen(true)} onKeyDown={keyDown} placeholder={placeholder} autoComplete="off" role="combobox" aria-expanded={open} aria-controls={`${kind}-suggestions`} className="input w-full" />{open && (items.length > 0 || loading || value.length > 0 || kind === "category") && <div id={`${kind}-suggestions`} role="listbox" className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-white/15 bg-[#0b171d] p-1 shadow-2xl">{loading ? <p className="px-3 py-2 text-xs text-slate-500">Buscando na biblioteca…</p> : items.length ? items.map((item, index) => <button type="button" role="option" aria-selected={index === activeIndex} key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(item); setOpen(false); }} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${index === activeIndex ? "bg-teal-300/15 text-teal-100" : "text-slate-300 hover:bg-white/5"}`}>{item.label}{item.model_code ? <span className="ml-2 text-xs text-slate-500">{item.model_code}</span> : null}</button>) : <div className="px-3 py-2 text-xs text-slate-500"><span>Não encontrado — continuar com este valor.</span>{kind === "model" ? <Link href="/biblioteca-tecnica/modelos/novo" className="ml-1 text-teal-300">+ Cadastrar novo modelo</Link> : null}</div>}</div>}</div>;
}

function PhotoInput({
  label,
  type,
  equipmentId,
  onChange,
}: {
  label: string;
  type: Photo["type"];
  equipmentId: string;
  onChange: (
    equipmentId: string,
    type: Photo["type"],
    files: FileList | null,
  ) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 px-2 py-3 text-center text-xs text-slate-400 transition hover:border-teal-300/50 hover:text-teal-100">
      <Camera className="h-4 w-4 text-teal-300" />
      {label}

      <input
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        onChange={(event) =>
          onChange(
            equipmentId,
            type,
            event.target.files,
          )
        }
      />
    </label>
  );
}

function MaterialsStep({
  equipment,
  materials,
  services,
  setMaterials,
  setServices,
}: {
  equipment: EquipmentCard[];
  materials: Material[];
  services: Service[];
  setMaterials: (items: Material[]) => void;
  setServices: (items: Service[]) => void;
}) {
  const [kind, setKind] =
    useState<"material" | "service">("material");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] =
    useState<QuoteUnit>("UNIDADE");
  const [price, setPrice] = useState("");
  const [equipmentId, setEquipmentId] =
    useState("");

  function add() {
    if (!description.trim()) return;

    if (kind === "material") {
      setMaterials([
        ...materials,
        {
          id: crypto.randomUUID(),
          equipment_id:
            equipmentId || undefined,
          line_type: "MATERIAL",
          description: description.trim(),
          quantity: Number(quantity) || 1,
          unit,
          unit_price: price
            ? Number(price)
            : null,
        },
      ]);
    } else {
      setServices([
        ...services,
        {
          id: crypto.randomUUID(),
          equipment_id:
            equipmentId || undefined,
          line_type: "LABOR",
          description: description.trim(),
          quantity: Number(quantity) || 1,
          unit_price: Number(price) || 0,
        },
      ]);
    }

    setDescription("");
    setPrice("");
  }

  return (
    <section className="space-y-5">
      <SectionTitle
        title="Materiais e mão de obra"
        subtitle="Adicione somente o que foi usado ou recomendado."
      />

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setKind("material")
            }
            className={
              kind === "material"
                ? "button-primary"
                : "button-secondary"
            }
          >
            + Material
          </button>

          <button
            type="button"
            onClick={() =>
              setKind("service")
            }
            className={
              kind === "service"
                ? "button-primary"
                : "button-secondary"
            }
          >
            + Serviço / Mão de obra
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="Descrição"
            className="input lg:col-span-2"
          />

          <input
            value={quantity}
            onChange={(event) =>
              setQuantity(event.target.value)
            }
            type="number"
            min="0.001"
            step="0.001"
            placeholder="Quantidade"
            className="input"
          />

          {kind === "material" ? (
            <select
              value={unit}
              onChange={(event) =>
                setUnit(
                  event.target
                    .value as QuoteUnit,
                )
              }
              className="select"
            >
              {units.map((value) => (
                <option key={value}>
                  {value}
                </option>
              ))}
            </select>
          ) : (
            <div className="hidden lg:block" />
          )}

          <input
            value={price}
            onChange={(event) =>
              setPrice(event.target.value)
            }
            type="number"
            min="0"
            step="0.01"
            placeholder="Valor unitário"
            className="input"
          />

          <select
            value={equipmentId}
            onChange={(event) =>
              setEquipmentId(
                event.target.value,
              )
            }
            className="select"
          >
            <option value="">Todos</option>

            {equipment.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={add}
          className="button-primary mt-3"
        >
          Adicionar
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {[
          ...materials.map((item) => ({
            ...item,
            kind: "Material",
          })),
          ...services.map((item) => ({
            ...item,
            kind: "Serviço",
          })),
        ].map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"
          >
            <div>
              <p className="text-sm font-semibold text-white">
                {item.description}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {item.kind} · {item.quantity}{" "}
                {"unit" in item
                  ? item.unit
                  : "serviço"}
              </p>
            </div>

            <span className="text-sm text-teal-200">
              {"unit_price" in item &&
              item.unit_price != null
                ? `R$ ${(item.unit_price *
                    item.quantity).toFixed(
                    2,
                  )}`
                : "—"}
            </span>
          </div>
        ))}
      </div>

      {materials.length + services.length ===
        0 && (
        <Empty text="Nenhum material ou serviço adicionado ainda." />
      )}
    </section>
  );
}

function ReviewStep({
  client,
  equipment,
  items,
  materials,
  services,
  visitType,
  total,
  setVisitType,
}: {
  client?: ClientCard;
  equipment: EquipmentCard[];
  items: Record<string, VisitItem>;
  materials: Material[];
  services: Service[];
  visitType: VisitType;
  total: number;
  setVisitType: (type: VisitType) => void;
}) {
  return (
    <section className="space-y-5">
      <SectionTitle
        title="Revise antes de salvar"
        subtitle="Confira os dados da visita e finalize o atendimento."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="summary-card">
          <p className="eyebrow">
            Academia
          </p>

          <p className="mt-2 font-semibold text-white">
            {client?.name}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            {client?.responsible_name ||
              "Responsável não informado"}
          </p>
        </div>

        <div className="summary-card">
          <p className="eyebrow">
            Tipo de visita
          </p>

          <select
            value={visitType}
            onChange={(event) =>
              setVisitType(
                event.target.value as VisitType,
              )
            }
            className="select mt-2 w-full"
          >
            {visitTypes.map(
              ([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="summary-card">
          <p className="eyebrow">
            Equipamentos e diagnóstico
          </p>

          <div className="mt-3 space-y-3">
            {equipment.map((item) => (
              <div
                key={item.id}
                className="border-b border-white/10 pb-3 last:border-0 last:pb-0"
              >
                <p className="font-semibold text-white">
                  {item.name}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {items[item.id]
                    ?.diagnosis ||
                    "Sem diagnóstico descrito"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {items[item.id]
                    ?.recommendation ||
                    "Sem recomendação"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="summary-card">
          <p className="eyebrow">
            Materiais e serviços
          </p>

          <p className="mt-2 text-sm text-slate-300">
            {materials.length} material(is) ·{" "}
            {services.length} serviço(s)
          </p>

          <p className="mt-4 text-2xl font-semibold text-teal-200">
            R$ {total.toFixed(2)}
          </p>
        </div>
      </div>
    </section>
  );
}
