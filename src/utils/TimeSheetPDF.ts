import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HR_TimeSheetHeader, HR_TimeSheetLog, HR_CompTimeEntry } from '../types/timesheet';
import { TimeUtils } from './TimeUtils';
import { loadLogoBase64, addLogoToPDF } from "./PDFHelpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateTimeSheetPDF = async (header: HR_TimeSheetHeader, logs: HR_TimeSheetLog[], compTimeEntries: HR_CompTimeEntry[] = []) => {
    const doc = new jsPDF({ orientation: 'portrait', format: 'letter' });
    const pageWidth = doc.internal.pageSize.width;
    const logoData = await loadLogoBase64();

    const formatDate = (d: string) => {
        if (!d) return '';
        const [y, m, day] = d.split('-');
        return `${m}/${day}/${y}`;
    };

    // --- HEADER ---
    addLogoToPDF(doc, logoData, pageWidth);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("CASA FAMILIAR", pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text("TIMESHEET RECORD", pageWidth / 2, 22, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${formatDate(header.period_start)} - ${formatDate(header.period_end)}`, 14, 35);
    doc.text(`Status: ${header.status || 'N/A'}`, pageWidth - 14, 35, { align: 'right' });

    doc.setDrawColor(200);
    doc.line(14, 38, pageWidth - 14, 38);

    // --- EMPLOYEE INFO TABLE ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autoTable(doc, {
        startY: 45,
        head: [[{ content: 'EMPLOYEE INFORMATION', colSpan: 2, styles: { halign: 'center', fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' } }]],
        body: [
            ['Employee Name:', header.employee_name || ''],
            ['Employee Email:', header.employee_email || ''],
            // ['Department:', header.department_name || 'N/A'], // Not available in header type
            // ['Pay Period ID:', header.pay_period_id || 'N/A'], // Not available in header type
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
        tableLineColor: [0, 0, 0],
    });

    // --- TIMESHEET LOGS TABLE ---
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const columns = [
        { header: 'DATE', dataKey: 'date_day' },
        { header: 'DAY', dataKey: 'day_name' },
        { header: 'IN', dataKey: 'time_in' },
        { header: 'OUT', dataKey: 'lunch_out' },
        { header: 'IN', dataKey: 'lunch_in' },
        { header: 'OUT', dataKey: 'time_out' },
        { header: 'REG', dataKey: 'reg_hours' },
        { header: 'WD', dataKey: 'wd_hours' },
        { header: 'VAC', dataKey: 'vac_hours' },
        { header: 'HOL', dataKey: 'hol_hours' },
        { header: 'SICK', dataKey: 'sick_hours' },
        { header: 'BER', dataKey: 'bereav_hours' },
        { header: 'OT', dataKey: 'ot_hours' },
        { header: 'JURY', dataKey: 'jury_duty_hours' },
        { header: 'UNPD', dataKey: 'unpaid_hours' },
    ];

    const calculateSum = (key: keyof HR_TimeSheetLog) =>
        logs.reduce((sum, log) => sum + Number(log[key] || 0), 0);

    const subtotals = [
        '', // Date
        'TOTALS', // Day
        '', '', '', '', // Times
        calculateSum('reg_hours').toFixed(2),
        calculateSum('wd') || '',
        calculateSum('vac') || '',
        calculateSum('hol') || '',
        calculateSum('sick') || '',
        calculateSum('ber') || '',
        calculateSum('ot') || '',
        calculateSum('jury') || '',
        calculateSum('unpd') || '',
    ];

    const tableData = logs.map(log => {
        const d = log.date.split('-');
        return [
            d.length === 3 ? `${d[1]}/${d[2]}` : log.date,
            log.day_name.toUpperCase().substring(0, 3),
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autoTable(doc, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [
            [
                { content: 'DATE', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
                { content: 'DAY', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
                { content: 'TIME', colSpan: 4, styles: { halign: 'center' } },
                { content: 'HOURS DISTRIBUTION', colSpan: 9, styles: { halign: 'center' } }
            ],
            [
                'IN', 'OUT', 'IN', 'OUT',
                'REG', 'WD', 'VAC', 'HOL', 'SICK', 'BER', 'OT', 'JURY', 'UNPD'
            ]
        ],
        body: [...tableData, subtotals],
        theme: 'grid',
        styles: {
            fontSize: 7,
            cellPadding: 1,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            valign: 'middle',
            halign: 'center'
        },
        headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            lineWidth: 0.2, // Bold border
            lineColor: [0, 0, 0],
            fontStyle: 'bold'
        },
        footStyles: {
            fontStyle: 'bold',
            fillColor: [240, 240, 240]
        },
        columnStyles: {
            0: { cellWidth: 10 }, // Date
            1: { cellWidth: 10 }, // Day
            // Times
            2: { cellWidth: 11 },
            3: { cellWidth: 11 },
            4: { cellWidth: 11 },
            5: { cellWidth: 11 },
        },
        tableLineColor: [0, 0, 0],
        tableLineWidth: 0.1,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY;

    // --- SUMMARY & COMP TIME SECTION ---
    const summaryY = finalY + 10;

    // Total Hours Box (Left)
    doc.setLineWidth(0.1);
    doc.rect(14, summaryY, 50, 20);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL HOURS FOR PERIOD", 39, summaryY + 6, { align: 'center' });
    doc.setFontSize(14);
    doc.text(Number(header.total_hours).toFixed(2), 39, summaryY + 15, { align: 'center' });

    // Compensatory Time Rationale (Right)
    const compX = 110;
    const compWidth = pageWidth - compX - 14;
    const compHeight = Math.max(25, (compTimeEntries.length * 7) + 15, 45); // Adjust height dynamic

    doc.rect(compX, summaryY, compWidth, compHeight);
    doc.setFontSize(8);
    doc.text("COMPENSATORY TIME RATIONALE:", compX + 2, summaryY + 5);
    doc.text("DATE", compX + 2, summaryY + 10);
    doc.text("PURPOSE", compX + 25, summaryY + 10);

    let currentLineY = summaryY + 15;

    // Check if we have entries
    const entriesToRender = compTimeEntries.length > 0 ? compTimeEntries : [{}, {}, {}, {}]; // 4 empty lines if 0

    entriesToRender.forEach(entry => {
        // Date Line
        doc.line(compX + 2, currentLineY, compX + 22, currentLineY);
        // Date Text
        if ((entry as any).date) {
            doc.text(formatDate((entry as any).date), compX + 2, currentLineY - 1);
        }

        // Purpose Line
        doc.line(compX + 25, currentLineY, compX + compWidth - 2, currentLineY);
        // Purpose Text
        if ((entry as any).rationale) {
            doc.text((entry as any).rationale || '', compX + 25, currentLineY - 1);
        }

        currentLineY += 7;
    });


    // --- SIGNATURES ---
    // Push signatures below the Comp Time box
    const sigY = summaryY + compHeight + 25;

    // Employee Signature
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(header.employee_name || '', 14, sigY - 2);
    doc.line(14, sigY, 100, sigY);
    doc.setFontSize(8);
    doc.text("EMPLOYEE'S SIGNATURE", 57, sigY + 4, { align: 'center' });

    if (header.employee_signed_by) {
        doc.setFontSize(7);
        doc.text(`Signed: ${TimeUtils.formatDisplayDateTime(header.employee_signed_date)}`, 14, sigY + 8);
    }

    // Supervisor Signature
    const supX = 115;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(header.supervisor_signed_by || '', supX, sigY - 2);
    doc.line(supX, sigY, pageWidth - 14, sigY);
    doc.setFontSize(8);
    doc.text("SUPERVISOR'S SIGNATURE", supX + 40, sigY + 4, { align: 'center' });

    if (header.supervisor_signed_by) {
        doc.setFontSize(7);
        doc.text(`Signed: ${TimeUtils.formatDisplayDateTime(header.supervisor_signed_date)}`, supX, sigY + 8);
    }

    // Disclaimer
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text("I certify that the hours shown above are correct and that I have performed the services as recorded.", pageWidth / 2, sigY + 25, { align: 'center' });

    doc.save(`Timesheet_${header.employee_name}_${header.period_start}.pdf`);
};
