export interface HR_TimeOffRequest {
    id: string;
    created: string;
    updated: string;
    collectionId: string;
    collectionName: string;

    // Employee Information
    employee_email: string;
    employee_name: string;
    today_date: string;
    department: string;
    vacation_days_available: number;
    as_of_date: string;
    num_days_requested: number;
    total_hours_requested: number;
    start_date: string;
    end_date: string;
    return_date: string;

    // Type of Request
    request_type:
    | 'WD'
    | 'VAC'
    | 'HOL'
    | 'SICK'
    | 'BER'
    | 'OT'
    | 'JURY'
    | 'UNPD';
    other_type_details?: string;
    reason?: string;
    comments?: string;

    // Certification
    employee_signature: string;
    employee_signature_date: string;

    // Approval
    status: 'Pending' | 'Approved' | 'Rejected' | 'Draft';
    supervisor_approval_by: string;
    supervisor_approval_date: string;
    hr_approval_by: string;
    hr_approval_date: string;
    approval_comments?: string;
}
