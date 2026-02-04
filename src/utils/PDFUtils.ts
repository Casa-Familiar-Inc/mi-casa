import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { HR_TimeSheetHeader, TimeSheetFull, HR_TimeSheetLog } from "../types/timesheet";
import { HR_TimeOffRequest } from "../types/timeoff";
import { TimeUtils } from "./TimeUtils";

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
    const doc = new jsPDF({ orientation: 'portrait', format: 'letter' });
    const pageWidth = doc.internal.pageSize.width;

    // Filter for Approved only
    const approvedSheets = timesheets.filter(s => s.header.status === 'Approved');
    const totalSheets = approvedSheets.length;

    if (totalSheets === 0) {
        doc.text("No Approved Timesheets to display.", 14, 20);
        doc.save(`Timesheets_Bulk_${periodStart}_(Empty).pdf`);
        return;
    }

    approvedSheets.forEach((sheet, index) => {
        if (index > 0) doc.addPage();

        const { header, logs } = sheet;

        // --- HEADER ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("CASA FAMILIAR", pageWidth / 2, 15, { align: 'center' });
        doc.text("EMPLOYEE TIME SHEET", pageWidth / 2, 20, { align: 'center' });

        // Period Logic
        const formatDateStr = (d: string) => {
            if (!d) return '';
            const [y, m, day] = d.split('-');
            return `${m}/${day}/${y}`;
        };
        doc.text(`FOR THE PERIOD ${formatDateStr(header.period_start)} - ${formatDateStr(header.period_end)}`, pageWidth / 2, 25, { align: 'center' });

        // Name Line
        doc.setFontSize(11);
        doc.text("Employee Name:", 40, 40);
        doc.setFontSize(12);
        doc.text(header.employee_name || "______________________", 80, 40);
        doc.setLineWidth(0.5);
        doc.line(80, 41, 170, 41); // Underline

        // --- TABLE ---
        const tableData = logs.map(log => {
            const d = log.date.split('-'); // YYYY-MM-DD
            return [
                d.length === 3 ? `${d[1]}/${d[2]}` : log.date, // Date
                log.day_name.toUpperCase(),
                log.time_in,
                log.lunch_out,
                log.lunch_in,
                log.time_out,
                log.reg_hours,
                log.wd || '',
                log.vac || '',
                log.hol || '',
                log.sick || '',
                log.ber || '',
                log.ot || '',
                log.jury || '',
                log.unpd || ''
            ];
        });

        // Calculate Subtotals
        const calculateSum = (key: keyof HR_TimeSheetLog) =>
            logs.reduce((sum, log) => sum + Number(log[key] || 0), 0);

        const subtotals = [
            '', // Date
            'SUBTOTALS--->', // Day
            '', '', '', '', // Times
            calculateSum('reg_hours').toString(),
            calculateSum('wd') || '',
            calculateSum('vac') || '',
            calculateSum('hol') || '',
            calculateSum('sick') || '',
            calculateSum('ber') || '',
            calculateSum('ot') || '',
            calculateSum('jury') || '',
            calculateSum('unpd') || '',
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        autoTable(doc, {
            startY: 50,
            head: [
                [
                    { content: 'DATE', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
                    { content: 'DAY', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
                    { content: 'HOURS (IN/OUT)', colSpan: 4, styles: { halign: 'center' } },
                    { content: 'HOURS TO BE PAID', colSpan: 9, styles: { halign: 'center' } }
                ],
                [
                    'IN', 'OUT', 'IN', 'OUT',
                    'REG', 'WD', 'VAC', 'HOL', 'SICK', 'Bereav', 'OT', 'Jury', 'Unpd'
                ]
            ],
            body: [...tableData, subtotals],
            theme: 'plain',
            styles: {
                fontSize: 7,
                cellPadding: 1,
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                valign: 'middle',
                halign: 'center'
            },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                lineWidth: 0.2,
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 12 }, // Date
                1: { cellWidth: 20 }, // Day
                2: { cellWidth: 12 }, 3: { cellWidth: 12 }, 4: { cellWidth: 12 }, 5: { cellWidth: 12 }, // Time cols
            },
            tableLineColor: [0, 0, 0],
            tableLineWidth: 0.1,
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;

        // --- FOOTER SECTION ---
        // BOX 1: HOURS THIS PERIOD
        doc.setLineWidth(0.5);
        doc.rect(14, finalY, 40, 20);

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("HOURS THIS PERIOD", 34, finalY + 5, { align: 'center' });

        doc.setFontSize(16);
        doc.text(Number(header.total_hours).toFixed(2), 34, finalY + 15, { align: 'center' });

        // BOX 2: COMPENSATORY TIME RATIONALE
        const compX = 110;
        const compWidth = 90;
        const compHeight = 50;

        doc.rect(compX, finalY, compWidth, compHeight);
        doc.setFontSize(8);
        doc.text("COMPENSATORY TIME RATIONALE:", compX + 2, finalY + 5);
        doc.text("DATE:           PURPOSE:", compX + 2, finalY + 10);

        for (let i = 0; i < 4; i++) {
            const lineY = finalY + 20 + (i * 8);
            doc.line(compX + 2, lineY, compX + 25, lineY);
            doc.line(compX + 30, lineY, compX + compWidth - 2, lineY);
        }

        // SIGNATURES
        const sigY = finalY + 50 + 15; // Below comp box

        doc.setFontSize(10);
        // Employee
        doc.text(header.employee_name || '', 20, sigY - 2);
        doc.line(20, sigY, 90, sigY);
        doc.setFontSize(8);
        doc.text("EMPLOYEE'S SIGNATURE", 55, sigY + 4, { align: 'center' });
        if (header.employee_signed_by) {
            doc.setFontSize(6);
            doc.text(`Signed: ${TimeUtils.formatDisplayDateTime(header.employee_signed_date)}`, 20, sigY + 8);
        }

        // Supervisor
        const supY = sigY + 20; // 2 lines below
        doc.setFontSize(10);
        doc.text(header.supervisor_signed_by || '', 20, supY - 2);
        doc.line(20, supY, 90, supY);
        doc.setFontSize(8);
        doc.text("SUPERVISOR'S SIGNATURE", 55, supY + 4, { align: 'center' });
        if (header.supervisor_signed_by) {
            doc.setFontSize(6);
            doc.text(`Signed: ${TimeUtils.formatDisplayDateTime(header.supervisor_signed_date)}`, 20, supY + 8);
        }
    });

    doc.save(`Timesheets_Bulk_${periodStart}.pdf`);
};

export const generateBulkTimeOffPDF = (requests: HR_TimeOffRequest[]) => {
    const doc = new jsPDF();
    const approvedReqs = requests.filter(r => r.status === 'Approved');

    if (approvedReqs.length === 0) {
        doc.text("No Approved Time Off Requests.", 14, 20);
        doc.save("TimeOff_Bulk_(Empty).pdf");
        return;
    }

    approvedReqs.forEach((req, index) => {
        if (index > 0) doc.addPage();

        doc.setFontSize(18);
        doc.text("Casa Familiar - Time Off Request", 14, 20);
        // Basic placeholder for now, matching previous logic
        doc.setFontSize(12);
        doc.text(JSON.stringify(req, null, 2), 14, 30);
    });

    doc.save("TimeOff_Bulk.pdf");
};

