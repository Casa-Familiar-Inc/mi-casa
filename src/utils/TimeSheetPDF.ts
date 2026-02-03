import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HR_TimeSheetHeader, HR_TimeSheetLog } from '../types/timesheet';
import { TimeUtils } from './TimeUtils';

export const generateTimeSheetPDF = (header: HR_TimeSheetHeader, logs: HR_TimeSheetLog[]) => {
    const doc = new jsPDF({ orientation: 'portrait', format: 'letter' });
    const pageWidth = doc.internal.pageSize.width;

    // --- HEADER ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("CASA FAMILIAR", pageWidth / 2, 15, { align: 'center' });
    doc.text("EMPLOYEE TIME SHEET", pageWidth / 2, 20, { align: 'center' });

    // Period Logic: try to infer "11/16/2025 - 11/30/2025" from header or logs
    // Assuming header.period_start is YYYY-MM-DD
    const formatDate = (d: string) => {
        if (!d) return '';
        const [y, m, day] = d.split('-');
        return `${m}/${day}/${y}`;
    };
    doc.text(`FOR THE PERIOD ${formatDate(header.period_start)} - ${formatDate(header.period_end)}`, pageWidth / 2, 25, { align: 'center' });

    // Name Line
    doc.setFontSize(11);
    doc.text("Employee Name:", 40, 40);
    doc.setFontSize(12);
    doc.text(header.employee_name || "______________________", 80, 40);
    doc.setLineWidth(0.5);
    doc.line(80, 41, 170, 41); // Underline

    // --- TABLE ---
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
        { header: 'Bereav', dataKey: 'bereav_hours' },
        { header: 'OT', dataKey: 'ot_hours' },
        { header: 'Jury Duty', dataKey: 'jury_duty_hours' },
        { header: 'Unpaid', dataKey: 'unpaid_hours' },
    ];

    const tableData = logs.map(log => {
        // Parse date for "11   16" format if possible, or just MM/DD
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
                { content: 'TIME', colSpan: 2, styles: { halign: 'center' } },
                { content: 'LUNCH', colSpan: 2, styles: { halign: 'center' } }, // Based on image headers seem grouped: TIME (IN/OUT/IN/OUT)? Image shows TIME [IN OUT IN OUT] actually column grouping is tricky. 
                // Image: [DATE] [DAY] [TIME [IN] [OUT] [IN] [OUT] ] ? No, typical timesheet is IN, L.OUT, L.IN, OUT.
                // Image Header: | TIME | LUNCH | TIME | -> IN | OUT | IN | OUT ? 
                // Let's stick to standard: IN | OUT | IN | OUT. 
                // Use simplified header for now:
                // [DATE, DAY, IN, OUT, IN, OUT, HOURS TO BE PAID (colspan 9)]
                { content: 'HOURS TO BE PAID', colSpan: 9, styles: { halign: 'center' } }
            ],
            [
                'IN', 'OUT', 'IN', 'OUT',
                'REG', 'WD', 'VAC', 'HOL', 'SICK', 'Bereav', 'OT', 'Jury Duty', 'Unpaid'
            ]
        ],
        body: [...tableData, subtotals],
        theme: 'plain', // We'll draw lines manually if needed or grid
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
            lineWidth: 0.2, // Bold border
            fontStyle: 'bold'
        },
        footStyles: {
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 12 }, // Date
            1: { cellWidth: 20 }, // Day
            // Times
            2: { cellWidth: 12 },
            3: { cellWidth: 12 },
            4: { cellWidth: 12 },
            5: { cellWidth: 12 },
        },
        tableLineColor: [0, 0, 0],
        tableLineWidth: 0.1,
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // --- FOOTER SECTION ---

    // HOURS THIS PERIOD BOX
    // Location: Below table, Left aligned
    const boxY = finalY;

    // Box 1: "HOURS THIS PERIOD" Label + Total
    doc.setLineWidth(0.5);
    doc.rect(14, boxY, 40, 20); // Outer Box

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("HOURS THIS PERIOD", 34, boxY + 5, { align: 'center' });

    doc.setFontSize(16);
    doc.text(Number(header.total_hours).toFixed(2), 34, boxY + 15, { align: 'center' });


    // COMPENSATORY TIME RATIONALE
    // Location: Right side
    const compX = 110;
    const compWidth = 90;
    const compHeight = 60;

    doc.rect(compX, boxY, compWidth, compHeight);

    doc.setFontSize(8);
    doc.text("COMPENSATORY TIME RATIONALE:", compX + 2, boxY + 5);
    doc.text("DATE:           PURPOSE:", compX + 2, boxY + 10);

    // Draw lines for writing
    for (let i = 0; i < 5; i++) {
        const lineY = boxY + 20 + (i * 8);
        doc.line(compX + 2, lineY, compX + 25, lineY); // Date line
        doc.line(compX + 30, lineY, compX + compWidth - 2, lineY); // Purpose line
    }


    // SIGNATURES
    // Bottom Left area
    const sigY = boxY + 40;

    doc.setFontSize(10);
    doc.text(header.employee_name || '', 20, sigY - 2);
    doc.line(20, sigY, 90, sigY);
    doc.setFontSize(8);
    doc.text("EMPLOYEE'S SIGNATURE", 55, sigY + 4, { align: 'center' });
    if (header.employee_signed_by) {
        doc.setFontSize(6);
        doc.text(`Signed: ${TimeUtils.formatDisplayDateTime(header.employee_signed_date)}`, 20, sigY + 8);
    }

    const supY = sigY + 25;
    doc.setFontSize(10);
    doc.text(header.supervisor_signed_by || '', 20, supY - 2);
    doc.line(20, supY, 90, supY);
    doc.setFontSize(8);
    doc.text("SUPERVISOR'S SIGNATURE", 55, supY + 4, { align: 'center' });
    if (header.supervisor_signed_by) {
        doc.setFontSize(6);
        doc.text(`Signed: ${TimeUtils.formatDisplayDateTime(header.supervisor_signed_date)}`, 20, supY + 8);
    }

    doc.save(`TimeSheet_${header.employee_name}.pdf`);
};
