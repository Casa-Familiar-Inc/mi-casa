import { IEmployeeSettings } from '../services/TimeLogService';
import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface ITimeLogProps {
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
  userEmail: string;
  exportLibraryTitle: string;
  developerMode?: boolean;
  context: WebPartContext;
}

export interface ITimeLogState {
  periodStart: string;
  periodEnd: string;
  logs: ITimeLogEntry[];
  compTimeRationale: string;
  compTimeDate: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  employeeSignedBy?: string;
  employeeSignedDate?: string;
  supervisorSignedBy?: string;
  supervisorSignedDate?: string;

  // Dashboard State
  currentView: 'MyTimeSheet' | 'SupervisorDashboard' | 'UserSettings';
  pendingApprovals: { employee: string, employeeEmail: string, period: string, periodStart: string, periodEnd: string, date: string }[];
  viewingEmployee?: string; // If viewing someone else's sheet
  viewingEmployeeEmail?: string; // To preserve email when approving

  // New Features
  compTimeEntries: { rationale: string, date: string }[]; // Structured entries
  availablePeriods: { key: string, text: string, start: string, end: string }[];
  isLoading: boolean;
  isSaving: boolean;
  userDepartment?: string;
  isSupervisor?: boolean;
  directReports?: string[]; // List of emails
  notification?: {
    message: string;
    type: 'info' | 'confirm' | 'error' | 'success';
    onConfirm?: () => void;
    onCancel?: () => void;
  };
  additionalInformation?: string;

  userSettings?: IEmployeeSettings;
  tempSettings?: IEmployeeSettings; // For editing
}

export interface ITimeLogEntry {
  date: string;
  dayName: string;
  timeIn: string;
  lunchOut: string;
  lunchIn: string;
  timeOut: string;

  // Pay Code Hours Breakdown
  reg: string;
  wd: string;
  vac: string;
  hol: string;
  sick: string;
  bereav: string;
  ot: string;
  juryDuty: string;
  unpaid: string;

  dailyTotal: string;
}
