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
export type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "EXPIRED";
export type FinancialEntryType = "INCOME" | "EXPENSE";
export type FinancialEntryStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";

export interface Timestamps { created_at: ISODate; updated_at: ISODate; }
export interface Company extends Timestamps { id: UUID; name: string; document: string | null; phone: string | null; email: string | null; status: CompanyStatus; }
export interface Profile extends Timestamps { id: UUID; full_name: string; phone: string | null; avatar_path: string | null; }
export interface UserRole { code: AppRole; name: string; description: string; }
export interface CompanyMember extends Timestamps { id: UUID; company_id: UUID; profile_id: UUID; role_code: AppRole; status: MemberStatus; }
export interface Client extends Timestamps { id: UUID; company_id: UUID; name: string; trade_name: string | null; document: string | null; phone: string | null; whatsapp: string | null; email: string | null; address: string | null; city: string | null; state: string | null; notes: string | null; status: string; }
export interface Equipment extends Timestamps { id: UUID; company_id: UUID; client_id: UUID; asset_code: string; name: string; category: string | null; brand: string | null; model: string | null; serial_number: string | null; purchase_date: string | null; installation_date: string | null; location: string | null; status: EquipmentStatus; notes: string | null; }
export interface ServiceRequest { id: UUID; company_id: UUID; client_id: UUID; equipment_id: UUID | null; opened_by: UUID; title: string; description: string; priority: RequestPriority; status: RequestStatus; opened_at: ISODate; closed_at: ISODate | null; }
export interface WorkOrder extends Timestamps { id: UUID; company_id: UUID; client_id: UUID; service_request_id: UUID | null; assigned_technician_id: UUID | null; type: WorkOrderType; status: WorkOrderStatus; scheduled_at: ISODate | null; started_at: ISODate | null; finished_at: ISODate | null; diagnosis: string | null; solution: string | null; customer_notes: string | null; internal_notes: string | null; }
export interface WorkOrderEquipment { work_order_id: UUID; equipment_id: UUID; problem_description: string | null; service_performed: string | null; status: WorkOrderEquipmentStatus; }
export interface TechnicianProfile { profile_id: UUID; company_id: UUID; specialties: string[]; active: boolean; }
export interface Part extends Timestamps { id: UUID; company_id: UUID; name: string; sku: string | null; brand: string | null; unit_cost: number; sale_price: number; stock_quantity: number; minimum_stock: number; status: PartStatus; }
export interface WorkOrderPart { work_order_id: UUID; part_id: UUID; quantity: number; unit_cost: number; unit_price: number; }
export interface WorkOrderPhoto { id: UUID; company_id: UUID; work_order_id: UUID; equipment_id: UUID | null; type: PhotoType; storage_path: string; caption: string | null; created_at: ISODate; }
export interface WorkOrderSignature { id: UUID; company_id: UUID; work_order_id: UUID; signer_name: string; signer_document: string | null; signature_path: string; signed_at: ISODate; }
export interface Quote { id: UUID; company_id: UUID; client_id: UUID; work_order_id: UUID | null; status: QuoteStatus; subtotal: number; discount: number; total: number; valid_until: string | null; notes: string | null; created_at: ISODate; }
export interface QuoteItem { quote_id: UUID; line_number: number; description: string; quantity: number; unit_price: number; total: number; }
export interface FinancialEntry extends Timestamps { id: UUID; company_id: UUID; client_id: UUID | null; work_order_id: UUID | null; quote_id: UUID | null; type: FinancialEntryType; category: string; description: string; amount: number; due_date: string | null; paid_at: ISODate | null; status: FinancialEntryStatus; }
export interface AuditLog { id: UUID; company_id: UUID; user_id: UUID; entity_type: string; entity_id: UUID; action: string; metadata: Json; created_at: ISODate; }

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
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
