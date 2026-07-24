/**
 * API payload types. Mirror backend enums and Pydantic schemas.
 * Change one, change the other in the same commit.
 */

export type Role =
  | "individual_taxpayer"
  | "business_owner"
  | "preparer"
  | "reviewer"
  | "firm_admin"
  | "seasonal_staff";

export type EntityType =
  | "individual"
  | "sole_prop"
  | "partnership"
  | "s_corp"
  | "c_corp";

export type ReturnStatus =
  | "intake"
  | "docs_requested"
  | "docs_received"
  | "in_preparation"
  | "pending_review"
  | "client_approval"
  | "filed"
  | "accepted";

export type FieldState =
  | "empty"
  | "ai_extracted"
  | "ai_calculated"
  | "client_answered"
  | "verified"
  | "locked";

export type DocType =
  | "w2"
  | "1099_nec"
  | "1099_int"
  | "1099_div"
  | "1098"
  | "k1"
  | "receipt"
  | "bank_statement"
  | "prior_return"
  | "other";

export type DocumentStatus =
  | "requested"
  | "uploaded"
  | "processing"
  | "extracted"
  | "needs_attention"
  | "accepted";

export type TransformKind =
  | "direct"
  | "sum"
  | "subtract"
  | "multiply"
  | "lookup"
  | "manual_override";

export type TaskStatus = "open" | "in_progress" | "blocked" | "done";

export type TaskPriority = "critical" | "high" | "normal" | "low";

export type Visibility = "internal" | "client_visible";

export type LinkTarget = "return" | "document" | "field" | "task";

export type RequestStatus = "outstanding" | "fulfilled" | "waived";

export type AnnotationKind =
  | "extraction"
  | "calculation"
  | "recommendation"
  | "warning"
  | "anomaly";

export type ConfidenceBand = "high" | "medium" | "low";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export interface HealthResponse {
  status: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  title: string | null;
}

export interface Membership {
  id: string;
  user_id: string;
  role: Role;
  client_id: string | null;
  label: string;
  client_name?: string | null;
}

export interface Client {
  id: string;
  display_name: string;
  entity_type: EntityType;
  primary_contact_id: string | null;
}

export interface TaxReturn {
  id: string;
  client_id: string;
  tax_year: number;
  form_type: string;
  status: ReturnStatus;
  preparer_id: string | null;
  reviewer_id: string | null;
  due_date: string;
  refund_estimate: string | null;
}

export interface ReturnSection {
  id: string;
  return_id: string;
  code: string;
  label: string;
  sort_order: number;
}

export interface ReturnField {
  id: string;
  section_id: string;
  line_ref: string;
  label: string;
  value: string | null;
  unit: string;
  state: FieldState;
  locked_reason: string | null;
  sort_order: number;
}

export interface Document {
  id: string;
  client_id: string;
  doc_type: DocType;
  title: string;
  filename: string;
  issuer: string | null;
  tax_year: number;
  page_count: number;
  status: DocumentStatus;
  uploaded_at: string | null;
  uploaded_by_id: string | null;
}

export interface Task {
  id: string;
  return_id: string;
  title: string;
  detail: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  owner_role: Role;
  owner_user_id: string | null;
  due_date: string | null;
  blocked_by_id: string | null;
  priority_score: number;
}

/* —— Task 2 response DTOs (mirror backend/app/schemas) —— */

export interface TaskListItem {
  id: string;
  return_id: string;
  return_tax_year: number;
  return_form_type: string;
  client_id: string;
  client_name: string;
  title: string;
  detail: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  owner_role: Role;
  owner_user_id: string | null;
  due_date: string | null;
  blocked_by_id: string | null;
  priority_score: number;
}

export interface ReturnsByStatusItem {
  status: ReturnStatus;
  staff_label: string;
  count: number;
}

export interface StaffLoadItem {
  user_id: string;
  name: string;
  open_tasks: number;
  overdue: number;
}

export interface FirmOverview {
  returns_by_status: ReturnsByStatusItem[];
  overdue_tasks: number;
  blocked_tasks: number;
  awaiting_client: number;
  staff_load: StaffLoadItem[];
}

export interface ReturnListItem {
  id: string;
  client_id: string;
  client_name: string;
  tax_year: number;
  status: ReturnStatus;
  staff_label: string;
  client_label: string;
  due_date: string;
  preparer_id: string | null;
  preparer_name: string | null;
  reviewer_id: string | null;
  reviewer_name: string | null;
  open_task_count: number;
  has_fields: boolean;
}

export interface ReturnFieldOut {
  id: string;
  line_ref: string;
  label: string;
  value: string | null;
  state: FieldState;
  locked_reason: string | null;
}

export interface ReturnSectionOut {
  id: string;
  code: string;
  label: string;
  sort_order: number;
  fields: ReturnFieldOut[];
}

export interface AiAnnotationOut {
  id: string;
  target_type: LinkTarget;
  target_id: string;
  kind: AnnotationKind;
  headline: string;
  rationale: string;
  uncertainty_note: string | null;
  suggested_action: string | null;
  suggested_value: string | null;
  confidence: number;
  band: ConfidenceBand;
  model_name: string;
  is_simulated: boolean;
}

export interface ThreadLinkOut {
  id: string;
  target_type: LinkTarget;
  target_id: string;
}

export interface MessageCreateRequest {
  body: string;
  visibility: Visibility;
}

export interface MessageOut {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  visibility: Visibility;
  created_at: string;
}

export interface RequestOut {
  id: string;
  label: string;
  status: RequestStatus;
  owner_user_id: string | null;
  due_date: string | null;
  fulfilled_by_document_id: string | null;
}

export interface ThreadOut {
  id: string;
  subject: string;
  visibility: Visibility;
  resolved_at: string | null;
  awaiting_role: Role | null;
  awaiting_user_id: string | null;
  is_resolved: boolean;
  links: ThreadLinkOut[];
  messages: MessageOut[];
  requests: RequestOut[];
}

export interface ClientNextStepOut {
  source: "request" | "document";
  id: string;
  headline: string;
  estimate_minutes: number;
}

export interface ReturnDetail {
  id: string;
  client_id: string;
  client_name: string;
  tax_year: number;
  form_type: string;
  status: ReturnStatus;
  staff_label: string;
  client_label: string;
  due_date: string;
  preparer_id: string | null;
  preparer_name: string | null;
  reviewer_id: string | null;
  reviewer_name: string | null;
  refund_estimate: string | null;
  sections: ReturnSectionOut[];
  annotations: Record<string, AiAnnotationOut>;
  threads: ThreadOut[];
  client_next_step: ClientNextStepOut | null;
}

export interface TraceAnnotationOut {
  confidence: number;
  band: ConfidenceBand;
  rationale: string;
  uncertainty_note: string | null;
}

export interface BBoxOut {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TraceDocumentOut {
  id: string;
  title: string;
  issuer: string | null;
}

export interface TracePageOut {
  id: string;
  page_no: number;
}

export interface TraceProvenanceOut {
  id: string;
  box_label: string;
  raw_value: string | null;
  document: TraceDocumentOut;
  page: TracePageOut;
  bbox: BBoxOut;
}

export interface TraceFieldSummary {
  id: string;
  line_ref: string;
  label: string;
  value: string | null;
  state: FieldState;
}

export interface TraceProvenanceInput {
  type: "provenance";
  operator: string;
  provenance: TraceProvenanceOut;
}

export interface TraceFieldInput {
  type: "field";
  operator: string;
  field: FieldTrace;
}

export type TraceInput = TraceProvenanceInput | TraceFieldInput;

export interface TraceTransformOut {
  kind: TransformKind;
  expression: string;
  human_explanation: string;
  inputs: TraceInput[];
}

export interface FieldTrace {
  field: TraceFieldSummary;
  annotation: TraceAnnotationOut | null;
  transform: TraceTransformOut | null;
  correction: AiCorrectionOut | null;
}

export interface AiCorrectionOut {
  id: string;
  annotation_id: string;
  user_id: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  created_at: string;
}

export interface FieldCorrectRequest {
  value: string | number;
  reason?: string;
}

export interface FieldCorrectResponse {
  field: ReturnFieldOut;
  correction: AiCorrectionOut;
}

export interface FieldVerifyResponse {
  field: ReturnFieldOut;
}

export interface DocumentListItem {
  id: string;
  client_id: string;
  doc_type: DocType;
  title: string;
  filename: string;
  issuer: string | null;
  tax_year: number;
  page_count: number;
  status: DocumentStatus;
  uploaded_at: string | null;
  uploaded_by_id: string | null;
}

export interface FulfillmentResult {
  request: RequestOut;
  document: DocumentListItem;
  return_status: ReturnStatus;
}

export interface DocumentListResponse {
  items: DocumentListItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface ClientListItem {
  id: string;
  display_name: string;
  entity_type: EntityType;
}

export interface DocumentPageOut {
  id: string;
  page_no: number;
  body_html: string;
}

export interface DocumentProvenanceOut {
  id: string;
  box_label: string;
  raw_value: string | null;
  page_id: string;
  page_no: number;
  bbox: BBoxOut;
  field_id: string;
  field_line_ref: string;
  field_label: string;
  field_state: FieldState;
}

export interface DocumentDetail {
  id: string;
  client_id: string;
  doc_type: DocType;
  title: string;
  filename: string;
  issuer: string | null;
  tax_year: number;
  page_count: number;
  status: DocumentStatus;
  uploaded_at: string | null;
  uploaded_by_id: string | null;
  pages: DocumentPageOut[];
  provenances: DocumentProvenanceOut[];
  threads: ThreadOut[];
}

export interface MembershipOut {
  id: string;
  user_id: string;
  role: Role;
  client_id: string | null;
  label: string;
  client_name: string | null;
}

export interface UserOut {
  id: string;
  name: string;
  email: string;
  initials: string;
  title: string | null;
  memberships: MembershipOut[];
}

export interface MeResponse {
  users: UserOut[];
  role_context: string | null;
  active_membership: MembershipOut | null;
  active_user: UserOut | null;
}
