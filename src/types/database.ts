export type UUID = string;
export type ISODate = string;
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json | undefined };
type TableDefinition<Row> = { Row: Row & Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };

export type CompanyStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";
export type AppRole = "OWNER" | "ADMIN" | "MANAGER" | "TECHNICIAN" | "VIEWER";
export type MemberStatus = "ACTIVE" | "INVITED" | "SUSPENDED";
export type EquipmentStatus = "ACTIVE" | "MAINTENANCE" | "OUT_OF_SERVICE" | "RETIRED";
export type RequestPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type RequestStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CANCELLED";
export type WorkOrderType = "PREVENTIVE" | "CORRECTIVE" | "INSTALLATION" | "INSPECTION";
export type WorkOrderStatus = "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "WAITING_PARTS" | "COMPLETED" | "CANCELLED";
export type WorkOrderEquipmentStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PartStatus = "ACTIVE" | "INACTIVE" | "DISCONTINUED";
export type PhotoType = "BEFORE" | "AFTER" | "GENERAL";
export type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "EXPIRED" | "CONVERTED";
export type FinancialEntryType = "INCOME" | "EXPENSE";
export type FinancialEntryStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
export type ServiceVisitType = "PREVENTIVE" | "CORRECTIVE" | "INSPECTION" | "INSTALLATION";
export type ServiceVisitStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type ServiceVisitItemStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type ServicePhotoType = "PROBLEM" | "BEFORE" | "AFTER" | "GENERAL";
export type QuoteItemType = "PRODUCT" | "MATERIAL" | "SERVICE" | "LABOR";
export type QuoteUnit = "UNIDADE" | "METRO" | "CENTIMETRO" | "METRO_QUADRADO" | "QUILO" | "LITRO" | "KIT";
export type VisitLineType = "PRODUCT" | "MATERIAL" | "SERVICE" | "LABOR";
export type EquipmentModelCategory = "TREADMILL" | "CROSSOVER" | "BIKE" | "ELLIPTICAL" | "LEG_PRESS" | "LEG_EXTENSION" | "LEG_CURL" | "CHEST_PRESS" | "FREE_WEIGHT" | "OTHER";
export type TechnicalDocumentType = "MANUAL" | "PARTS_CATALOG" | "SCHEMATIC" | "SERVICE_BULLETIN" | "OTHER";
export type TechnicalConfidenceStatus = "OFFICIAL_MANUFACTURER" | "FIELD_VERIFIED" | "UNVERIFIED";
export type TechnicalSourceType = "MANUFACTURER_DOCUMENT" | "FIELD_INSPECTION" | "MANUAL" | "PARTS_CATALOG" | "SCHEMATIC" | "SERVICE_BULLETIN" | "WEB_SOURCE" | "OTHER";

export interface Timestamps { created_at: ISODate; updated_at: ISODate; }
export interface Company extends Timestamps { id: UUID; name: string; document: string | null; phone: string | null; email: string | null; status: CompanyStatus; commercial_name?: string | null; legal_name?: string | null; logo_path?: string | null; whatsapp?: string | null; address?: string | null; city?: string | null; state?: string | null; website?: string | null; }
export interface Profile extends Timestamps { id: UUID; full_name: string; phone: string | null; avatar_path: string | null; }
export interface UserRole { code: AppRole; name: string; description: string; }
export interface CompanyMember extends Timestamps { id: UUID; company_id: UUID; profile_id: UUID; role_code: AppRole; status: MemberStatus; }
export interface Client extends Timestamps { id: UUID; company_id: UUID; name: string; trade_name: string | null; document: string | null; phone: string | null; whatsapp: string | null; email: string | null; address: string | null; city: string | null; state: string | null; notes: string | null; status: string; responsible_name?: string | null; last_visit_at?: ISODate | null; }
export interface Equipment extends Timestamps { id: UUID; company_id: UUID; client_id: UUID; asset_code: string; name: string; category: string | null; brand: string | null; model: string | null; serial_number: string | null; purchase_date: string | null; installation_date: string | null; location: string | null; status: EquipmentStatus; notes: string | null; primary_photo_path?: string | null; equipment_model_id?: UUID | null; }
export interface ServiceRequest { id: UUID; company_id: UUID; client_id: UUID; equipment_id: UUID | null; opened_by: UUID; title: string; description: string; priority: RequestPriority; status: RequestStatus; opened_at: ISODate; closed_at: ISODate | null; }
export interface WorkOrder extends Timestamps { id: UUID; company_id: UUID; client_id: UUID; service_request_id: UUID | null; assigned_technician_id: UUID | null; type: WorkOrderType; status: WorkOrderStatus; scheduled_at: ISODate | null; started_at: ISODate | null; finished_at: ISODate | null; diagnosis: string | null; solution: string | null; customer_notes: string | null; internal_notes: string | null; }
export interface WorkOrderEquipment { work_order_id: UUID; equipment_id: UUID; problem_description: string | null; service_performed: string | null; status: WorkOrderEquipmentStatus; }
export interface TechnicianProfile { profile_id: UUID; company_id: UUID; specialties: string[]; active: boolean; }
export interface Part extends Timestamps { id: UUID; company_id: UUID; name: string; sku: string | null; brand: string | null; unit_cost: number; sale_price: number; stock_quantity: number; minimum_stock: number; status: PartStatus; }
export interface WorkOrderPart { work_order_id: UUID; part_id: UUID; quantity: number; unit_cost: number; unit_price: number; }
export interface WorkOrderPhoto { id: UUID; company_id: UUID; work_order_id: UUID; equipment_id: UUID | null; type: PhotoType; storage_path: string; caption: string | null; created_at: ISODate; }
export interface WorkOrderSignature { id: UUID; company_id: UUID; work_order_id: UUID; signer_name: string; signer_document: string | null; signature_path: string; signed_at: ISODate; }
export interface Quote { id: UUID; company_id: UUID; client_id: UUID; work_order_id: UUID | null; service_visit_id: UUID | null; quote_number: string; status: QuoteStatus; issued_at: ISODate; subtotal: number; discount: number; total: number; valid_until: string | null; notes: string | null; created_at: ISODate; }
export interface QuoteItem { quote_id: UUID; line_number: number; equipment_id: UUID | null; item_type: QuoteItemType; description: string; quantity: number; unit: QuoteUnit; unit_price: number; total: number; technical_part_id: UUID | null; }
export interface FinancialEntry extends Timestamps { id: UUID; company_id: UUID; client_id: UUID | null; work_order_id: UUID | null; quote_id: UUID | null; type: FinancialEntryType; category: string; description: string; amount: number; due_date: string | null; paid_at: ISODate | null; status: FinancialEntryStatus; }
export interface AuditLog { id: UUID; company_id: UUID; user_id: UUID; entity_type: string; entity_id: UUID; action: string; metadata: Json; created_at: ISODate; }
export interface ServiceVisit extends Timestamps { id: UUID; company_id: UUID; client_id: UUID; technician_id: UUID; type: ServiceVisitType; status: ServiceVisitStatus; started_at: ISODate | null; finished_at: ISODate | null; notes: string | null; }
export interface ServiceVisitItem { visit_id: UUID; equipment_id: UUID; diagnosis: string | null; recommendation: string | null; status: ServiceVisitItemStatus; }
export interface ServicePhoto { id: UUID; company_id: UUID; visit_id: UUID | null; equipment_id: UUID | null; quote_id: UUID | null; work_order_id: UUID | null; type: ServicePhotoType; storage_path: string; caption: string | null; created_at: ISODate; }
export interface QuoteEquipment { quote_id: UUID; equipment_id: UUID; }
export interface QuotePhoto { quote_id: UUID; photo_id: UUID; }
export interface ServiceVisitMaterial { id: UUID; visit_id: UUID; equipment_id: UUID | null; part_id: UUID | null; line_type: VisitLineType; description: string; quantity: number; unit: QuoteUnit; unit_price: number | null; created_at: ISODate; }
export interface ServiceVisitService { id: UUID; visit_id: UUID; equipment_id: UUID | null; line_type: VisitLineType; description: string; quantity: number; unit_price: number; created_at: ISODate; }
export interface Manufacturer extends Timestamps { id: UUID; company_id: UUID; name: string; website: string | null; notes: string | null; }
export interface EquipmentModel extends Timestamps { id: UUID; company_id: UUID; manufacturer_id: UUID; category: EquipmentModelCategory; model_name: string; model_code: string | null; description: string | null; photo_path: string | null; notes: string | null; }
export interface TechnicalComponent extends Timestamps { id: UUID; company_id: UUID; name: string; parent_component_id: UUID | null; description: string | null; }
export interface ProvenanceFields { confidence_status: TechnicalConfidenceStatus; source_type: TechnicalSourceType | null; source_document_id: UUID | null; source_page: string | null; source_url: string | null; source_notes: string | null; verified_at: ISODate | null; verified_by: UUID | null; }
export interface TechnicalPart extends Timestamps, ProvenanceFields { id: UUID; company_id: UUID; name: string; code: string | null; part_type: string; description: string | null; unit: QuoteUnit; specification: Json; manufacturer_reference: string | null; notes: string | null; }
export interface ModelComponent extends ProvenanceFields { model_id: UUID; component_id: UUID; notes: string | null; }
export interface ModelPart extends ProvenanceFields { model_id: UUID; part_id: UUID; component_id: UUID | null; quantity: number | null; technical_value: string | null; notes: string | null; is_recommended: boolean; }
export interface TechnicalDocument extends Timestamps, ProvenanceFields { id: UUID; company_id: UUID; manufacturer_id: UUID | null; equipment_model_id: UUID | null; title: string; document_type: TechnicalDocumentType; file_path: string | null; version: string | null; notes: string | null; }
export interface TechnicalSpecification extends Timestamps, ProvenanceFields { id: UUID; company_id: UUID; equipment_model_id: UUID | null; technical_part_id: UUID | null; specification_key: string; specification_value: string; unit: string | null; }

export interface Database {
  public: {
    Tables: {
      companies: TableDefinition<Company>;
      profiles: TableDefinition<Profile>;
      user_roles: TableDefinition<UserRole>;
      company_members: TableDefinition<CompanyMember>;
      clients: TableDefinition<Client>;
      equipment: TableDefinition<Equipment>;
      service_requests: TableDefinition<ServiceRequest>;
      work_orders: TableDefinition<WorkOrder>;
      work_order_equipment: TableDefinition<WorkOrderEquipment>;
      technician_profiles: TableDefinition<TechnicianProfile>;
      parts: TableDefinition<Part>;
      work_order_parts: TableDefinition<WorkOrderPart>;
      work_order_photos: TableDefinition<WorkOrderPhoto>;
      work_order_signatures: TableDefinition<WorkOrderSignature>;
      quotes: TableDefinition<Quote>;
      quote_items: TableDefinition<QuoteItem>;
      financial_entries: TableDefinition<FinancialEntry>;
      audit_logs: TableDefinition<AuditLog>;
      service_visits: TableDefinition<ServiceVisit>;
      service_visit_items: TableDefinition<ServiceVisitItem>;
      service_photos: TableDefinition<ServicePhoto>;
      quote_equipments: TableDefinition<QuoteEquipment>;
      quote_photos: TableDefinition<QuotePhoto>;
      service_visit_materials: TableDefinition<ServiceVisitMaterial>;
      service_visit_services: TableDefinition<ServiceVisitService>;
      manufacturers: TableDefinition<Manufacturer>;
      equipment_models: TableDefinition<EquipmentModel>;
      technical_components: TableDefinition<TechnicalComponent>;
      technical_parts: TableDefinition<TechnicalPart>;
      model_components: TableDefinition<ModelComponent>;
      model_parts: TableDefinition<ModelPart>;
      technical_documents: TableDefinition<TechnicalDocument>;
      technical_specifications: TableDefinition<TechnicalSpecification>;
    };
    Functions: {
      create_company_onboarding: {
        Args: {
          p_name: string;
          p_document: string | null;
          p_phone: string | null;
          p_email: string | null;
        };
        Returns: UUID;
      };
      create_service_visit: {
        Args: {
          p_client_id: UUID;
          p_type: ServiceVisitType;
          p_notes: string | null;
          p_items: Json;
          p_materials: Json;
          p_services: Json;
        };
        Returns: UUID;
      };
      create_client_quick: {
        Args: { p_name: string; p_responsible_name: string | null; p_phone: string | null; p_email: string | null; p_city: string | null };
        Returns: UUID;
      };
      create_equipment_quick: {
        Args: { p_client_id: UUID; p_name: string; p_category: string | null; p_brand: string | null; p_model: string | null; p_serial_number: string | null; p_location: string | null };
        Returns: UUID;
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
