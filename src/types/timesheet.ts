export interface HR_TimeSheetHeader {
    id: string;
    user_id: string;
    created: string;
    updated: string;
    employee_email: string;
    employee_name: string;
    period_start: string;
    period_end: string;
    status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
    total_hours: number | string;
    additional_info: string;
    employee_signed_by: string;
    employee_signed_date: string;
    supervisor_signed_by: string;
    supervisor_signed_date: string;
    expand?: any;
    collectionId: string;
    collectionName: string;
}

export interface HR_TimeSheetLog {
    id: string;
    header: string; // Relation ID
    date: string;
    day_name: string;
    time_in: string;
    lunch_out: string;
    lunch_in: string;
    time_out: string;
    reg_hours: number;
    wd: number;
    vac: number;
    hol: number;
    sick: number;
    ber: number;
    ot: number;
    jury: number;
    unpd: number;
    daily_total: number;
}

export interface HR_CompTimeEntry {
    id: string;
    header: string; // Relation ID
    date: string;
    rationale: string;
}

export interface HR_EmployeeSettings {
    id: string;
    user_email: string;
    default_time_in: string;
    default_lunch_out: string;
    default_lunch_in: string;
    default_time_out: string;
}

// Composite type for full TimeSheet data used in UI
export interface TimeSheetFull {
    header: HR_TimeSheetHeader;
    logs: HR_TimeSheetLog[];
    compTime: HR_CompTimeEntry[];
}
