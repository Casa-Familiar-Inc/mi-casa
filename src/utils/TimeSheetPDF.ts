import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HR_TimeSheetHeader, HR_TimeSheetLog } from '../types/timesheet';

export const generateTimeSheetPDF = (header: HR_TimeSheetHeader, logs: HR_TimeSheetLog[]) => {
    const doc = new jsPDF({ orientation: 'landscape' });

    // --- TITLE ---
    doc.setFontSize(18);
    doc.text("Employee Time Sheet", 14, 15);

    // --- HEADER INFO ---
    doc.setFontSize(11);
    doc.text(`Employee: ${header.employee_name}`, 14, 25);
    doc.text(`Period: ${header.period_start} to ${header.period_end}`, 14, 30);
    doc.text(`Status: ${header.status}`, 200, 25);
    doc.text(`Total Hours: ${header.total_hours.toFixed(2)}`, 200, 30);

    // --- TABLE ---
    // Define columns
    const columns = [
        { header: 'Date', dataKey: 'date' },
        { header: 'Day', dataKey: 'day_name' },
        { header: 'Time In', dataKey: 'time_in' },
        { header: 'L.Out', dataKey: 'lunch_out' },
        { header: 'L.In', dataKey: 'lunch_in' },
        { header: 'Time Out', dataKey: 'time_out' },
        { header: 'REG', dataKey: 'reg_hours' },
        { header: 'WD', dataKey: 'wd_hours' },
        { header: 'VAC', dataKey: 'vac_hours' },
        { header: 'HOL', dataKey: 'hol_hours' },
        { header: 'SICK', dataKey: 'sick_hours' },
        // { header: 'BER', dataKey: 'bereav_hours' },
        // { header: 'OT', dataKey: 'ot_hours' },
        // { header: 'JURY', dataKey: 'jury_duty_hours' },
        // { header: 'UNPD', dataKey: 'unpaid_hours' },
        { header: 'Total', dataKey: 'daily_total' },
    ];

    // Map data
    const tableData = logs.map(log => ({
        ...log,
        reg_hours: Number(log.reg_hours || 0).toFixed(2),
        daily_total: Number(log.daily_total || 0).toFixed(2)
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autoTable(doc, {
        startY: 35,
        head: [columns.map(c => c.header)],
        // body: tableData.map(r => columns.map(c => r[c.dataKey])), // If simplified
        body: tableData.map(row => [
            row.date,
            row.day_name,
            row.time_in,
            row.lunch_out,
            row.lunch_in,
            row.time_out,
            row.reg_hours,
            row.wd_hours || '',
            row.vac_hours || '',
            row.hol_hours || '',
            row.sick_hours || '',
            row.daily_total
        ]),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
        bodyStyles: { fontSize: 8, cellPadding: 1 },
        columnStyles: {
            0: { cellWidth: 22 }, // Date
            1: { cellWidth: 20 }, // Day
            // Times
            2: { cellWidth: 15 },
            3: { cellWidth: 15 },
            4: { cellWidth: 15 },
            5: { cellWidth: 15 },
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;

    // --- SIGNATURES ---
    doc.setLineWidth(0.5);

    // Employee
    doc.line(14, finalY, 100, finalY); // Line
    doc.setFontSize(10);
    doc.text("Employee Signature", 14, finalY + 5);

    if (header.employee_signed_by) {
        doc.setFont("helvetica", "italic");
        doc.text(`Digitally signed by ${header.employee_signed_by} on ${header.employee_signed_date}`, 14, finalY - 2);
    }

    // Supervisor
    doc.setDrawColor(0);
    doc.line(150, finalY, 250, finalY);
    doc.setFont("helvetica", "normal");
    doc.text("Supervisor Signature", 150, finalY + 5);

    if (header.supervisor_signed_by) {
        doc.setFont("helvetica", "italic");
        doc.text(`Digitally signed by ${header.supervisor_signed_by} on ${header.supervisor_signed_date}`, 150, finalY - 2);
    }

    // --- SAVE ---
    // If visualized, maybe window.open? Or save.
    // User asked to "Visualize", but "Save" is safer for popup blockers.
    // doc.output('dataurlnewwindow'); // This visualizes
    doc.save(`TimeSheet_${header.employee_name}_${header.period_start}.pdf`);
};
