export type FieldType = 
  | 'Text'
  | 'Long Text'
  | 'Email'
  | 'Phone'
  | 'Number'
  | 'Currency'
  | 'Date'
  | 'Checkbox'
  | 'Dropdown'
  | 'Multi Select'
  | 'Status'
  | 'Address'
  | 'URL'
  | 'File Upload'
  | 'Image Upload'
  | 'Relation'
  | 'Formula'
  | 'Auto Increment';

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  options?: string[]; // for Dropdown, Multi Select, Status
  relationTableId?: string; // for Relation
  formula?: string; // for Formula
}

export interface View {
  id: string;
  name: string;
  type: 'table' | 'kanban' | 'calendar' | 'list';
  filters?: { fieldId: string; operator: string; value: string }[];
  sorts?: { fieldId: string; direction: 'asc' | 'desc' }[];
  groupByFieldId?: string; // for Kanban
}

export interface Table {
  id: string;
  name: string;
  fields: Field[];
  views: View[];
}

export interface RecordData {
  id: string;
  tableId: string;
  createdAt: number;
  data: Record<string, any>;
}

export interface FormField {
  id: string;
  fieldId: string;
  label: string;
  required: boolean;
}

export interface Form {
  id: string;
  name: string;
  tableId: string;
  fields: FormField[];
}

export interface TeamMember {
  id: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Employee' | 'Viewer';
}

export interface Integration {
  id: string;
  name: string;
  type: 'API' | 'Database' | 'Webhook' | 'Embed' | 'CSV' | 'Internal';
  status: 'Active' | 'Inactive';
  config: Record<string, any>;
}

export interface Resource {
  id: string;
  name: string;
  type: 'Metric' | 'Chart' | 'List';
  config: Record<string, any>;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  tables: Table[];
  forms: Form[];
  team: TeamMember[];
  integrations: Integration[];
  resources: Resource[];
}
