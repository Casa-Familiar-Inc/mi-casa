import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { HR_TimeSheetHeader, TimeSheetFull } from "../types/timesheet";
import { HR_TimeOffRequest } from "../types/timeoff";

// Helper to format dates consistently
const formatDate = (dateUnparsed: string | Date | undefined) => {
    if (!dateUnparsed) return "N/A";
    try {
        return format(new Date(dateUnparsed), "MM/dd/yyyy");
    } catch (e) {
        return String(dateUnparsed);
    }
};

const formatDateTime = (dateUnparsed: string | Date | undefined) => {
    if (!dateUnparsed) return "N/A";
    try {
        return format(new Date(dateUnparsed), "MM/dd/yyyy HH:mm");
    } catch (e) {
        return String(dateUnparsed);
    }
};

export const generateBulkTimesheetPDF = (timesheets: TimeSheetFull[], periodStart: string) => {
    const doc = new jsPDF();
    const totalSheets = timesheets.length;

    timesheets.forEach((sheet, index) => {
        if (index > 0) doc.addPage();

        const { header, logs, compTime } = sheet;

        // Header
        doc.setFontSize(18);
        doc.text("Mi Casa Family Services - Timesheet", 14, 20);

        doc.setFontSize(10);
        doc.text(`Employee: ${header.employee_name}`, 14, 30);
        doc.text(`Email: ${header.employee_email}`, 14, 35);
        doc.text(`Period: ${formatDate(header.period_start)} - ${formatDate(header.period_end)}`, 14, 40);
        doc.text(`Status: ${header.status}`, 150, 30);
        doc.text(`Total Hours: ${header.total_hours}`, 150, 40);

        // Daily Logs Table
        const logRows = logs.map(log => [
            formatDate(log.date),
            log.day_name,
            log.time_in ? log.time_in.substring(0, 5) : '',
            log.lunch_out ? log.lunch_out.substring(0, 5) : '',
            log.lunch_in ? log.lunch_in.substring(0, 5) : '',
            log.time_out ? log.time_out.substring(0, 5) : '',
            log.reg_hours,
            log.vac || 0,
            log.sick || 0,
            log.hol || 0,
            (log.ber || 0) + (log.jury || 0) + (log.unpd || 0), // Sum of other leaves
            log.daily_total
        ]);

        autoTable(doc, {
            startY: 50,
            head: [['Date', 'Day', 'In', 'L.Out', 'L.In', 'Out', 'Reg', 'Vac', 'Sick', 'Hol', 'Other', 'Total']],
            body: logRows,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1 },
            headStyles: { fillColor: [66, 66, 66] }
        });

        // Comp Time Table (if any)
        let finalY = (doc as any).lastAutoTable.finalY + 10;

        if (compTime && compTime.length > 0) {
            doc.text("Compensatory Time / Overtime Rationale", 14, finalY);
            finalY += 5;
            autoTable(doc, {
                startY: finalY,
                head: [['Date', 'Rationale']],
                body: compTime.map(c => [formatDate(c.date), c.rationale]),
                theme: 'striped',
                styles: { fontSize: 8 }
            });
            finalY = (doc as any).lastAutoTable.finalY + 10;
        }

        // Signatures
        doc.setFontSize(10);
        doc.text("Signatures:", 14, finalY + 10);

        doc.text(`Employee: ${header.employee_signed_by || '____________________'}`, 14, finalY + 20);
        doc.text(`Date: ${formatDateTime(header.employee_signed_date) || '____________________'}`, 120, finalY + 20);

        doc.text(`Supervisor: ${header.supervisor_signed_by || '____________________'}`, 14, finalY + 30);
        doc.text(`Date: ${formatDateTime(header.supervisor_signed_date) || '____________________'}`, 120, finalY + 30);

        // Footer
        doc.setFontSize(8);
        doc.text(`Page ${index + 1} of ${totalSheets} - Generated on ${new Date().toLocaleDateString()}`, 100, 280, { align: 'center' });
    });

    doc.save(`Timesheets_${formatDate(periodStart).replace(/\//g, '-')}.pdf`);
};

export const generateBulkTimeOffPDF = (requests: HR_TimeOffRequest[], start: string, end: string) => {
    const doc = new jsPDF();
    const totalRequests = requests.length;

    requests.forEach((req, index) => {
        if (index > 0) doc.addPage();

        doc.setFontSize(18);
        doc.text("Mi Casa Family Services - Time Off Request", 14, 20);

        doc.setFontSize(11);
        doc.text(`Request ID: ${req.id}`, 14, 30);
        doc.text(`Date of Request: ${formatDate(req.created)}`, 14, 38);

        doc.setLineWidth(0.5);
        doc.line(14, 42, 196, 42);

        // Employee Info
        doc.text("Employee Information", 14, 50);
        doc.setFontSize(10);
        doc.text(`Name: ${req.employee_name}`, 14, 58);
        doc.text(`Email: ${req.employee_email}`, 14, 64);
        doc.text(`Department: ${req.department || 'N/A'}`, 120, 58);

        // Request Details
        doc.setFontSize(11);
        doc.text("Request Details", 14, 75);

        autoTable(doc, {
            startY: 80,
            body: [
                ['Request Type', req.request_type],
                ['Start Date', formatDate(req.start_date)],
                ['End Date', formatDate(req.end_date)],
                ['Return Date', formatDate(req.return_date)],
                ['Total Days', req.num_days_requested],
                ['Total Hours', req.total_hours_requested],
                ['Reason', req.reason || 'N/A'],
                ['Comments', req.comments || 'N/A']
            ],
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
        });

        // Signatures and Approvals
        let finalY = (doc as any).lastAutoTable.finalY + 15;

        doc.setFillColor(240, 240, 240);
        doc.rect(14, finalY, 182, 40, 'F');

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text("Approvals", 18, finalY + 8);

        doc.setFontSize(10);
        doc.text(`Status: ${req.status.toUpperCase()}`, 18, finalY + 18);

        doc.text(`Employee Signature: ${req.employee_signature || 'Pending'}`, 18, finalY + 26);
        doc.text(`Date: ${formatDate(req.employee_signature_date)}`, 120, finalY + 26);

        doc.text(`Supervisor Approval: ${req.supervisor_approval_by || 'Pending'}`, 18, finalY + 34);
        doc.text(`Date: ${formatDate(req.supervisor_approval_date)}`, 120, finalY + 34);

        // Footer
        doc.setFontSize(8);
        doc.text(`Page ${index + 1} of ${totalRequests} - Export Range: ${start} to ${end}`, 100, 280, { align: 'center' });
    });

    doc.save(`TimeOffRequests_${start}_${end}.pdf`);
};
