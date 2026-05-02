export enum CaseStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  CLOSED = 'Closed',
}

export type CaseType = string;

export interface CaseFile {
  name: string;
  url: string;
}

export interface CaseHistoryEvent {
  id: string;
  date: string; // YYYY-MM-DD
  event: string;
  description?: string;
}

export interface InvolvedParty {
  id: string;
  name: string;
  role: string;
}

export interface CaseNote {
  id: string;
  date: string; // YYYY-MM-DD
  content: string;
}

export interface Case {
  id: string;
  userId: string;
  fileNumber: string;
  caseTitle: string;
  clientName: string; // Stays for display consistency
  clientId: string; // Link to the client document
  status: CaseStatus;
  caseDate: string; // YYYY-MM-DD
  courtDate: string; // YYYY-MM-DD
  caseType: CaseType;
  description: string;
  files?: CaseFile[];
  history?: CaseHistoryEvent[];
  parties?: InvolvedParty[];
  notes?: CaseNote[];
}

export interface Task {
  id: string;
  userId: string;
  caseId: string | null; // Can be a general task
  description: string;
  dueDate: string; // YYYY-MM-DD
  isDone: boolean;
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
}

export interface User {
  id:string;
  name: string;
  email: string;
  phone?: string;
}

export type Theme = 'light' | 'dark';

export type NavigationTab = 'dashboard' | 'cases' | 'agenda' | 'tasks' | 'settings' | 'clients';