import * as React from 'react';
import styles from './TimeLog.module.scss';
import type { ITimeLogProps, ITimeLogState, ITimeLogEntry } from './ITimeLogProps';
import { TextField, PrimaryButton, Dropdown, IDropdownOption, Spinner, SpinnerSize, IconButton } from 'office-ui-fabric-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TimeLogService, IEmployeeSettings } from '../services/TimeLogService';
import { TimeUtils } from '../utils/TimeUtils';
import { SupervisorDashboard } from './sections/SupervisorDashboard';
import { UserSettings } from './sections/UserSettings';
import { TimeSheetGrid } from './sections/TimeSheetGrid';
import { CompTimeSection } from './sections/CompTimeSection';
import { ActionButtons } from './sections/ActionButtons';
import { TimesheetFooter } from './sections/TimesheetFooter';

export default class TimeLog extends React.Component<ITimeLogProps, ITimeLogState> {
  
  private _service: TimeLogService;

  constructor(props: ITimeLogProps) {
    super(props);
    this._service = new TimeLogService(props.context);

    
    // Initialize Periods (Current + Past 12)
    const periods = this._generatePeriods(12);
    const currentPeriod = periods[0]; // First one is current/closest

    // Initialize Logs for current period
    const initialLogs = this._generateEmptyLogs(currentPeriod.start, currentPeriod.end);

    this.state = {
      periodStart: currentPeriod.start,
      periodEnd: currentPeriod.end,
      logs: initialLogs,
      compTimeRationale: '', // Deprecated
      compTimeEntries: [{ rationale: '', date: '' }], // Start with one empty entry
      compTimeDate: '', // Deprecated
      status: 'Draft',
      currentView: 'MyTimeSheet',
      pendingApprovals: [],
      availablePeriods: periods,
      isLoading: true,
      isSaving: false,
      userDepartment: '',
      isSupervisor: false,
      directReports: [],
      notification: undefined,
      additionalInformation: '',

      userSettings: undefined,
      tempSettings: undefined
    };
  }

  private _generatePeriods(count: number): { key: string, text: string, start: string, end: string }[] {
      const periods = [];
      let date = new Date();
      
      // Adjust to start of current period
      if (date.getDate() > 15) {
          date.setDate(16);
      } else {
          date.setDate(1);
      }

      for (let i = 0; i < count; i++) {
          const year = date.getFullYear();
          const month = date.getMonth();
          const day = date.getDate();
          
          let startStr = '', endStr = '', label = '';

          if (day <= 15) {
              // 1st - 15th
              startStr = new Date(year, month, 1).toLocaleDateString();
              endStr = new Date(year, month, 15).toLocaleDateString();
              label = `${new Date(year, month, 1).toLocaleString('default', { month: 'long' })} 1 - 15, ${year}`;
              
              // Move back to previous period (16th of prev month)
              date = new Date(year, month - 1, 16);
          } else {
              // 16th - End
              startStr = new Date(year, month, 16).toLocaleDateString();
              endStr = new Date(year, month + 1, 0).toLocaleDateString();
              label = `${new Date(year, month, 1).toLocaleString('default', { month: 'long' })} 16 - End, ${year}`;
              
              // Move back to previous period (1st of current month)
              date = new Date(year, month, 1);
          }

          periods.push({
              key: startStr, // Use start date as key
              text: label,
              start: startStr,
              end: endStr
          });
      }
      return periods;
  }

  private _generateEmptyLogs(startStr: string, endStr: string, settings?: IEmployeeSettings): ITimeLogEntry[] {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const logs: ITimeLogEntry[] = [];
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      // Loop from start to end
      const current = new Date(start.getTime());
      // eslint-disable-next-line no-unmodified-loop-condition
      while (current <= end) {
          const dateStr = current.toISOString().split('T')[0]; // YYYY-MM-DD
          const dayName = days[current.getDay()];
          const isWeekend = current.getDay() === 0 || current.getDay() === 6;

          logs.push({
            date: dateStr,
            dayName: dayName,
            timeIn: isWeekend ? '' : (settings?.DefaultTimeIn || '08:00'),
            lunchOut: isWeekend ? '' : (settings?.DefaultLunchOut || '12:00'),
            lunchIn: isWeekend ? '' : (settings?.DefaultLunchIn || '13:00'),
            timeOut: isWeekend ? '' : (settings?.DefaultTimeOut || '17:00'),
            reg: isWeekend ? '0' : '8',
            wd: '0',
            vac: '0',
            hol: '0',
            sick: '0',
            bereav: '0',
            ot: '0',
            juryDuty: '0',
            unpaid: '0',
            dailyTotal: isWeekend ? '0.00' : '8.00'
          });

          current.setDate(current.getDate() + 1);
      }
      return logs;
  }

  public async componentDidMount(): Promise<void> {
      // Load department, direct reports, and data concurrently
      const deptPromise = this._service.getUserDepartment();
      const reportsPromise = this._service.getDirectReports();
      const settingsPromise = this._service.getUserSettings(this.props.userEmail);
      
      const [dept, reports, settings] = await Promise.all([deptPromise, reportsPromise, settingsPromise]);
      
      this.setState({ 
          userDepartment: dept,
          isSupervisor: reports.length > 0,
          directReports: reports,
          userSettings: settings || undefined
      }, () => {
          this._loadData().catch((err) => console.error(err));
      });
  }

  private _onPeriodChange = (option: IDropdownOption): void => {
      const period = this.state.availablePeriods.filter((p: { key: string }) => p.key === option.key)[0];
      if (period) {
          // Reset logs to empty for the new period first, then load data
          const emptyLogs = this._generateEmptyLogs(period.start, period.end, this.state.userSettings);
          this.setState({
              periodStart: period.start,
              periodEnd: period.end,
              logs: emptyLogs,
              status: 'Draft', // Reset status until loaded
              compTimeEntries: [{ rationale: '', date: '' }],
              compTimeRationale: '',
              employeeSignedBy: '',
              supervisorSignedBy: '',
              isLoading: true
          }, () => {
              this._loadData().catch(console.error);
          });
      }
  }

  private _loadData = async (employeeEmail?: string): Promise<void> => {
      this.setState({ isLoading: true });
      try {
          const targetEmail = employeeEmail || this.props.userEmail;
          const items = await this._service.getTimeSheet(targetEmail, this.state.periodStart);
          
          if (items.length > 0) {
              // Map SharePoint items back to ITimeLogEntry
              const logs: ITimeLogEntry[] = items.map(item => ({
                  date: item.Date,
              dayName: item.DayName,
              timeIn: item.TimeIn || '',
              lunchOut: item.LunchOut || '',
              lunchIn: item.LunchIn || '',
              timeOut: item.TimeOut || '',
              reg: (item.RegHours || 0).toString(),
              wd: (item.WdHours || 0).toString(),
              vac: (item.VacHours || 0).toString(),
              hol: (item.HolHours || 0).toString(),
              sick: (item.SickHours || 0).toString(),
              bereav: (item.BereavHours || 0).toString(),
              ot: (item.OtHours || 0).toString(),
              juryDuty: (item.JuryDutyHours || 0).toString(),
              unpaid: (item.UnpaidHours || 0).toString(),
              dailyTotal: (item.DailyTotal || 0).toString()
              }));
              
              logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

              // Parse Comp Time Rationale (JSON or String)
              let entries: { rationale: string, date: string }[] = [{ rationale: '', date: '' }];
              let rawRationale = items[0].CompTimeRationale || '';
              
              // DECODE HTML ENTITIES
              const decodeHtml = (html: string): string => {
                  const txt = document.createElement("textarea");
                  txt.innerHTML = html;
                  return txt.value;
              };
              
              // Attempt to decode if it looks like encoded JSON
              if (rawRationale.indexOf('&quot;') > -1 || rawRationale.indexOf('&#123;') > -1) {
                  rawRationale = decodeHtml(rawRationale);
              }

              try {
                  if (rawRationale.trim().indexOf('[') === 0) {
                      const parsed = JSON.parse(rawRationale);
                      if (parsed.length > 0 && typeof parsed[0] === 'object') {
                          entries = parsed;
                      } else if (parsed.length > 0 && typeof parsed[0] === 'string') {
                          entries = parsed.map((s: string) => ({ rationale: s, date: '' }));
                      }
                  } else if (rawRationale) {
                      entries = [{ rationale: rawRationale, date: items[0].CompTimeDate || '' }];
                  }
              } catch (e) {
                  console.warn("Error parsing rationale JSON", e);
                  entries = [{ rationale: rawRationale, date: items[0].CompTimeDate || '' }];
              }
              
              if (entries.length === 0) entries = [{ rationale: '', date: '' }];

              
              // Check if we are viewing ourselves in default mode
              const isMe = targetEmail.toLowerCase() === this.props.userEmail.toLowerCase();
              const isReviewMode = !!employeeEmail; // If explicitly passed, we are reviewing

              this.setState({
                  logs: logs,
                  compTimeRationale: rawRationale,
                  compTimeEntries: entries,
                  compTimeDate: items[0].CompTimeDate || '',
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  status: items[0].Status as any || 'Draft',
                  employeeSignedBy: items[0].EmployeeSignedBy,
                  employeeSignedDate: items[0].EmployeeSignedDate,
                  supervisorSignedBy: items[0].SupervisorSignedBy,
                  supervisorSignedDate: items[0].SupervisorSignedDate,
                  viewingEmployee: (isMe && !isReviewMode) ? undefined : items[0].Title, 
                  viewingEmployeeEmail: (isMe && !isReviewMode) ? undefined : items[0].EmployeeEmail,
                  additionalInformation: items[0].AdditionalInformation || ''
              });
          } else if (employeeEmail) {
              this._showError('No data found for this user.');
          } else {
             // If no data and it's me, apply default settings to the empty logs
             if (this.state.userSettings) {
                 const newLogs = this._generateEmptyLogs(this.state.periodStart, this.state.periodEnd, this.state.userSettings);
                 this.setState({ logs: newLogs, additionalInformation: '' });
             }
          }
      } catch (e) {
          console.error("Error loading data", e);
      } finally {
          this.setState({ isLoading: false });
      }
  }

  private _loadDashboard = async (): Promise<void> => {
      const allSubmitted = await this._service.getSubmittedTimeSheets();
      
      // Filter by Direct Reports (Email check)
      // If directReports is empty, show nothing (or show all if admin? Let's stick to direct reports for now)
      // Filter by Direct Reports (Email check)
      // Filter by Direct Reports (Email check)
      // IF Developer Mode is ON, or for testing: Include self in myReports so I can approve my own timesheets
      const myReports = [...(this.state.directReports || [])];
      if (this.props.developerMode) {
          myReports.push(this.props.userEmail);
      }
      const filtered = allSubmitted.filter(item => myReports.indexOf(item.EmployeeEmail) > -1);

      // Group by Employee and Period to show unique pending items
      const uniquePending: { employee: string, employeeEmail: string, period: string, periodStart: string, periodEnd: string, date: string }[] = [];
      const seenKeys: string[] = [];
      
      filtered.forEach(item => {
          const key = item.Title + '-' + item.PeriodStart;
          if (seenKeys.indexOf(key) === -1) {
              seenKeys.push(key);
              uniquePending.push({
                  employee: item.Title,
                  employeeEmail: item.EmployeeEmail,
                  period: item.PeriodStart + ' - ' + item.PeriodEnd,
                  periodStart: item.PeriodStart,
                  periodEnd: item.PeriodEnd,
                  date: item.EmployeeSignedDate
              });
          }
      });

      this.setState({
          currentView: 'SupervisorDashboard',
          pendingApprovals: uniquePending
      });
  }

  private _switchToMyTimeSheet = async (): Promise<void> => {
      this.setState({ currentView: 'MyTimeSheet', viewingEmployee: undefined });
      await this._loadData(); 
  }

  private _switchToSettings = (): void => {
      this.setState({ 
          currentView: 'UserSettings',
          tempSettings: this.state.userSettings ? { ...this.state.userSettings } : {
              DefaultTimeIn: '08:00',
              DefaultLunchOut: '12:00',
              DefaultLunchIn: '13:00',
              DefaultTimeOut: '17:00'
          }
      });
  }
  
  private _onSettingsChange = (field: keyof IEmployeeSettings, value: string): void => {
      if (this.state.tempSettings) {
          this.setState({
              tempSettings: { ...this.state.tempSettings, [field]: value }
          });
      }
  }

  private _onSaveSettings = async (): Promise<void> => {
      if (!this.state.tempSettings) return;
      
      this.setState({ isSaving: true });
      try {
          await this._service.saveUserSettings(this.props.userEmail, this.state.tempSettings);
          this.setState({ 
              userSettings: this.state.tempSettings,
              currentView: 'MyTimeSheet'
          });
          this._showSuccess('Settings saved successfully!');
      } catch (e) {
          console.error(e);
          this._showError('Error saving settings.');
      } finally {
          this.setState({ isSaving: false });
      }
  }

  private _viewEmployeeTimeSheet = async (employeeName: string, employeeEmail: string, periodStart: string, periodEnd: string): Promise<void> => {
      this.setState({ 
          currentView: 'MyTimeSheet', 
          viewingEmployee: employeeName,
          viewingEmployeeEmail: employeeEmail,
          periodStart: periodStart,
          periodEnd: periodEnd
      }, () => {
          this._loadData(employeeEmail).catch(console.error);
      });
  }

  private _calculateDailyTotal = (log: ITimeLogEntry): string => {
      return TimeUtils.calculateDailyTotal(log.timeIn, log.lunchOut, log.lunchIn, log.timeOut);
  }

  private _onUpdateLog = (index: number, field: keyof ITimeLogEntry, value: string): void => {
    const newLogs = [...this.state.logs];
    newLogs[index] = { ...newLogs[index], [field]: value };
    
    // Auto-calculate Daily Total if time fields change
    if (['timeIn', 'lunchOut', 'lunchIn', 'timeOut'].indexOf(field) > -1) {
        const total = this._calculateDailyTotal(newLogs[index]);
        newLogs[index].dailyTotal = total;
        // Simple logic: if total changes, default it to REG (user can adjust)
        newLogs[index].reg = total; 
    }

    // If Leave fields are modified, reset time fields to force re-entry
    if (['wd', 'vac', 'hol', 'sick', 'bereav', 'juryDuty', 'unpaid'].indexOf(field) > -1) {
        newLogs[index].timeIn = '';
        newLogs[index].lunchOut = '';
        newLogs[index].lunchIn = '';
        newLogs[index].timeOut = '';
        newLogs[index].dailyTotal = '0.00';
        newLogs[index].reg = '0';
    }

    this.setState({ logs: newLogs });
  }

  private _onRationaleChange = (index: number, field: 'rationale' | 'date', value: string): void => {
      const newEntries = [...this.state.compTimeEntries];
      newEntries[index] = { ...newEntries[index], [field]: value };
      
      // Sync legacy compTimeDate if we are editing the first line's date
      let newCompTimeDate = this.state.compTimeDate;
      if (index === 0 && field === 'date') {
          newCompTimeDate = value;
      }

      this.setState({ 
          compTimeEntries: newEntries,
          compTimeDate: newCompTimeDate
      });
  }

  private _addRationaleLine = (): void => {
      this.setState({ compTimeEntries: [...this.state.compTimeEntries, { rationale: '', date: '' }] });
  }

  private _removeRationaleLine = (index: number): void => {
      const newEntries = [...this.state.compTimeEntries];
      newEntries.splice(index, 1);
      this.setState({ compTimeEntries: newEntries });
  }

  private _showSuccess = (message: string): void => {
      this.setState({ notification: { message, type: 'success' } });
  }

  private _showError = (message: string): void => {
      this.setState({ notification: { message, type: 'error' } });
  }

  private _confirmAction = (message: string, onConfirm: () => void): void => {
      this.setState({ 
          notification: { 
              message, 
              type: 'confirm', 
              onConfirm: () => {
                  this._closeNotification();
                  onConfirm();
              },
              onCancel: this._closeNotification
          } 
      });
  }

  private _closeNotification = (): void => {
      this.setState({ notification: undefined });
  }

  private _saveWithStatus = async (
      status: string, 
      empBy: string, 
      empDate: string, 
      supBy: string, 
      supDate: string
    ): Promise<void> => {
      if (this.state.isSaving) return;
      this.setState({ isSaving: true });
      try {
          const targetUser = this.state.viewingEmployee || this.props.userDisplayName;
          const rationaleJson = JSON.stringify(this.state.compTimeEntries);

          await this._service.saveTimeSheet(
              targetUser,
              this.state.viewingEmployee ? (this.state.viewingEmployeeEmail || '') : this.props.userEmail,
              this.state.periodStart,
              this.state.periodEnd,
              this.state.logs,
              rationaleJson,
              this.state.compTimeDate,
              this.state.additionalInformation || '',
              status,
              empBy,
              empDate,
              supBy,
              supDate
          );
          
          this.setState({ 
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              status: status as any,
              employeeSignedBy: empBy,
              employeeSignedDate: empDate,
              supervisorSignedBy: supBy,
              supervisorSignedDate: supDate,
              compTimeRationale: rationaleJson
          });

          this._showSuccess(`Time Sheet ${status} successfully!`);
          
          if (status === 'Approved' && this.state.viewingEmployee) {
              this._confirmAction('Return to Dashboard?', () => {
                  this._loadDashboard().catch(console.error);
              });
          }

      } catch (e) {
          console.error(e);
          this._showError('Error saving Time Sheet.');
      } finally {
          this.setState({ isSaving: false });
      }
  }

  private _onSaveDraft = async (): Promise<void> => {
      await this._saveWithStatus('Draft', '', '', '', '');
  }

  private _onSignAndSubmit = async (): Promise<void> => {
      this._confirmAction('Are you sure you want to sign and submit? You will not be able to edit after this.', async () => {
          const now = new Date().toLocaleString();
          const signedBy = this.props.userDisplayName;
          await this._saveWithStatus('Submitted', signedBy, now, '', '');

          // Send Email to Supervisor
          try {
              let managerEmail = await this._service.getManagerEmail();
              let subject = `Timesheet Submitted: ${signedBy} - ${this.state.periodStart}`;
              
              if (this.props.developerMode) {
                  managerEmail = this.props.userEmail;
                  subject = `[DEV: Redirected] ${subject}`;
                  console.log("Developer Mode: Email redirected to current user.");
              }

              if (managerEmail) {
                  const body = `
                      <p>Hello,</p>
                      <p><strong>${signedBy}</strong> has submitted their timesheet for the period <strong>${this.state.periodStart} - ${this.state.periodEnd}</strong>.</p>
                      <p>Please review and approve it from your dashboard.</p>
                      <p><a href="${window.location.href}">Click here to view</a></p>
                  `;
                  await this._service.sendEmail([managerEmail], subject, body);
                  this._showSuccess(`Time Sheet Submitted! Email sent to ${this.props.developerMode ? 'YOU (Dev Mode)' : managerEmail}`);
              } else {
                  console.warn("Could not find manager email for notification.");
                  this._showError("Time Sheet Submitted, but Manager Email NOT found. Notification not sent.");
              }
          } catch (emailError) {
              console.error("Error sending submission email", emailError);
              this._showError("Time Sheet Submitted, but Email Failed to Send. Check console.");
          }
      });
  }

  private _onApprove = async (): Promise<void> => {
      // Capture state variables BEFORE the async confirmation to prevent closure issues or state mutations
      const empBy = this.state.employeeSignedBy;
      const empDate = this.state.employeeSignedDate;

      if (!empBy && this.state.status === 'Submitted') {
          console.warn("Approving a Submitted timesheet with no employee signature! This might indicate data corruption.");
      }

      this._confirmAction('Are you sure you want to approve this time sheet?', async () => {
          const now = new Date().toLocaleString();
          const signedBy = this.props.userDisplayName; 
          // Use captured variables
          await this._saveWithStatus('Approved', empBy || '', empDate || '', signedBy, now);

          // Send Email to Employee
          try {
              let empEmail = this.state.viewingEmployeeEmail;
              let subject = `Timesheet Approved: ${this.state.periodStart}`;

              if (this.props.developerMode) {
                  empEmail = this.props.userEmail;
                  subject = `[DEV: Redirected] ${subject}`;
                  console.log("Developer Mode: Email redirected to current user.");
              }

              if (empEmail) {
                  const body = `
                      <p>Hello,</p>
                      <p>Your timesheet for the period <strong>${this.state.periodStart} - ${this.state.periodEnd}</strong> has been <strong>APPROVED</strong> by ${signedBy}.</p>
                      <p>No further action is required.</p>
                  `;
                  await this._service.sendEmail([empEmail], subject, body);
                  this._showSuccess(`Time Sheet Approved! Email sent to ${this.props.developerMode ? 'YOU (Dev Mode)' : empEmail}`);
              }
          } catch (emailError) {
              console.error("Error sending approval email", emailError);
              this._showError("Time Sheet Approved, but Email Failed to Send. Check console.");
          }
      });
  }

  private _onReject = async (): Promise<void> => {
      this._confirmAction('Are you sure you want to REJECT this time sheet? It will be returned to Draft status for the employee to correct.', async () => {
          await this._saveWithStatus('Rejected', '', '', '', '');
      });
  }

  private _generatePDF = async (): Promise<void> => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    doc.setFontSize(16);
    doc.text('Casa Familiar', 14, 10);

    doc.setFontSize(14);
    doc.text('Employee Time Sheet', 14, 18);
    
    // Calculate Total Hours for Header (Sum of all vertical columns to match UI Grand Total)
    const totalHours = this.state.logs.reduce((sum, l) => 
        sum + 
        (parseFloat(l.reg || '0')) +
        (parseFloat(l.wd || '0')) +
        (parseFloat(l.vac || '0')) +
        (parseFloat(l.hol || '0')) +
        (parseFloat(l.sick || '0')) +
        (parseFloat(l.bereav || '0')) +
        (parseFloat(l.ot || '0')) +
        (parseFloat(l.juryDuty || '0')) +
        (parseFloat(l.unpaid || '0'))
    , 0).toFixed(2);

    doc.setFontSize(10);
    doc.text(`Employee Name: ${this.state.viewingEmployee || this.props.userDisplayName}`, 14, 26);
    doc.text(`Period: ${this.state.periodStart} - ${this.state.periodEnd}`, pageWidth - 100, 26);
    doc.text(`Hours This Period: ${totalHours}`, pageWidth - 50, 26);

    const tableData = this.state.logs.map(log => [
      log.date,
      log.dayName,
      log.timeIn,
      log.lunchOut,
      log.lunchIn,
      log.timeOut,
      log.reg,
      log.wd,
      log.vac,
      log.hol,
      log.sick,
      log.bereav,
      log.ot,
      log.juryDuty,
      log.unpaid
    ]);

    const totals = ['TOTALS', '', '', '', '', '',
        this.state.logs.reduce((sum, l) => sum + parseFloat(l.reg || '0'), 0).toFixed(2),
        this.state.logs.reduce((sum, l) => sum + parseFloat(l.wd || '0'), 0).toFixed(2),
        this.state.logs.reduce((sum, l) => sum + parseFloat(l.vac || '0'), 0).toFixed(2),
        this.state.logs.reduce((sum, l) => sum + parseFloat(l.hol || '0'), 0).toFixed(2),
        this.state.logs.reduce((sum, l) => sum + parseFloat(l.sick || '0'), 0).toFixed(2),
        this.state.logs.reduce((sum, l) => sum + parseFloat(l.bereav || '0'), 0).toFixed(2),
        this.state.logs.reduce((sum, l) => sum + parseFloat(l.ot || '0'), 0).toFixed(2),
        this.state.logs.reduce((sum, l) => sum + parseFloat(l.juryDuty || '0'), 0).toFixed(2),
        this.state.logs.reduce((sum, l) => sum + parseFloat(l.unpaid || '0'), 0).toFixed(2)
    ];

    autoTable(doc, {
      head: [['Date', 'Day', 'In', 'L.Out', 'L.In', 'Out', 'REG', 'WD', 'VAC', 'HOL', 'SICK', 'BER', 'OT', 'JURY', 'UNPD']],
      body: [...tableData, totals],
      startY: 32,
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
      theme: 'grid'
    });

    // --- BOTTOM SECTION: Side-by-Side Layout ---
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableEnd = (doc as any).lastAutoTable.finalY;
    
    // Define start Y for bottom section
    let bottomSectionY = tableEnd + 10;
    
    // Check if we need a new page for the bottom section
    // Estimate height needed 
    const requiredHeight = 80; 
    if (bottomSectionY + requiredHeight > pageHeight) {
        doc.addPage();
        bottomSectionY = 20;
    }

    // --- LEFT SIDE: HOURS THIS PERIOD BOX ---
    const boxX = 14;
    const boxY = bottomSectionY;
    const boxWidth = 35;
    const boxHeight = 25;

    // Header Background
    doc.setFillColor(230, 230, 230); // Light Gray
    doc.rect(boxX, boxY, boxWidth, 8, 'F'); // Filled Rect
    
    // Box Border (Thick)
    doc.setLineWidth(0.7);
    doc.rect(boxX, boxY, boxWidth, boxHeight); // Stroke Rect

    // Header Text
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("HOURS THIS PERIOD", boxX + (boxWidth / 2), boxY + 5, { align: 'center' });

    // Total Value
    doc.setFontSize(18);
    doc.text(totalHours, boxX + (boxWidth / 2), boxY + 18, { align: 'center' });

    // --- LEFT SIDE: SIGNATURES ---
    let sigY = boxY + boxHeight + 15;
    const sigLineLength = 60;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Employee Signature
    doc.text(this.state.viewingEmployee || this.props.userDisplayName, boxX, sigY - 5);
    doc.line(boxX, sigY, boxX + sigLineLength, sigY);
    doc.setFont('helvetica', 'bold');
    doc.text("EMPLOYEE'S SIGNATURE", boxX + 5, sigY + 4);

    if (this.state.employeeSignedBy) {
         doc.setFontSize(7);
         doc.text(`(Digitally Signed: ${this.state.employeeSignedDate})`, boxX, sigY + 8);
    }

    sigY += 25; // Gap for next signature

    // Supervisor Signature
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    // Placeholder or actual supervisor name if available?
    // doc.text("Supervisor Name", boxX, sigY - 5); 
    doc.line(boxX, sigY, boxX + sigLineLength, sigY);
    doc.setFont('helvetica', 'bold');
    doc.text("SUPERVISOR'S SIGNATURE", boxX + 5, sigY + 4);

    if (this.state.supervisorSignedBy) {
        doc.setFontSize(7);
        doc.text(`(${this.state.supervisorSignedBy} - ${this.state.supervisorSignedDate})`, boxX, sigY + 8);
    }


    // --- RIGHT SIDE: COMPENSATORY TIME RATIONALE ---
    const compBoxX = pageWidth * 0.5;
    const compBoxY = bottomSectionY;
    const compBoxWidth = pageWidth * 0.45; // ~45% of width
    const compBoxHeight = 80;

    // Outer Border
    doc.setLineWidth(0.5);
    doc.rect(compBoxX, compBoxY, compBoxWidth, compBoxHeight);

    // Header Text
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold italic');
    doc.text("COMPENSATORY TIME RATIONALE:", compBoxX + 2, compBoxY + 5);
    
    // Sub-headers
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text("DATE:", compBoxX + 2, compBoxY + 10);
    doc.text("PURPOSE:", compBoxX + 30, compBoxY + 10);

    // Lines / Entries
    let lineY = compBoxY + 16;
    const maxLines = 8;
    
    // Existing Entries
    const entriesToPrint = this.state.compTimeEntries.slice(0, maxLines);
    
    entriesToPrint.forEach(entry => {
        // Date Line
        doc.line(compBoxX + 2, lineY, compBoxX + 25, lineY);
        if (entry.date) {
            doc.text(entry.date, compBoxX + 2, lineY - 1);
        }

        // Purpose Line
        doc.line(compBoxX + 30, lineY, compBoxX + compBoxWidth - 2, lineY);
        if (entry.rationale) {
             const splitRationale = doc.splitTextToSize(entry.rationale, (compBoxWidth - 35));
             // Warning: multiline might overlap next line if strict spacing. 
             // Ideally we shouldn't have multiline here for this simple layout or we spacing adapts.
             // For strict lines like the image, usually text is short or small.
             doc.text(splitRationale[0], compBoxX + 30, lineY - 1); 
        }
        
        lineY += 8;
    });

    // Fill remaining lines to look like the form
    for (let i = entriesToPrint.length; i < maxLines; i++) {
        doc.line(compBoxX + 2, lineY, compBoxX + 25, lineY);
        doc.line(compBoxX + 30, lineY, compBoxX + compBoxWidth - 2, lineY);
        lineY += 8;
    }

    doc.setFont('helvetica', 'normal'); // Reset font

    try {
        const blob = doc.output('blob');
        
        const userName = (this.state.viewingEmployee || this.props.userDisplayName).toLowerCase().replace(/ /g, '-');
        const periodDate = new Date(this.state.periodStart);
        const monthName = periodDate.toLocaleString('default', { month: 'long' }).toLowerCase();
        const periodNum = periodDate.getDate() <= 15 ? '1' : '2';
        const year = periodDate.getFullYear();
        const department = (this.state.userDepartment || 'NoDept').replace(/ /g, '-');
        
        const fileName = `timesheet-${userName}-${department}-${year}-${monthName}-${periodNum}.pdf`;
        
        const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        const folderPath = `${year}/${monthCap}/Period ${periodNum}/${this.state.userDepartment || 'NoDepartment'}`;
        const libraryName = this.props.exportLibraryTitle || 'Timesheets';

        this._confirmAction(`Do you want to upload the timesheet to SharePoint?\n\nLibrary: ${libraryName}\nFile: ${fileName}\nFolder: ${folderPath}`, async () => {
            try {
                const fileUrl = await this._service.uploadTimeSheetPDF(libraryName, folderPath, fileName, blob);
                this._showSuccess('TimeSheet uploaded successfully!');
                window.open(fileUrl, '_blank');
            } catch (e) {
                console.error("Upload failed", e);
                this._showError('Upload failed. Downloading local copy instead.');
                doc.save('Casa_Familiar_TimeSheet.pdf');
            }
        });

    } catch (e) {
        console.error("Upload failed", e);
        this._showError('Upload failed. Downloading local copy instead.');
        doc.save('Casa_Familiar_TimeSheet.pdf');
    }
  }

  public render(): React.ReactElement<ITimeLogProps> {
    const { hasTeamsContext } = this.props;
    const { status, employeeSignedBy, employeeSignedDate, supervisorSignedBy, supervisorSignedDate, currentView, pendingApprovals, viewingEmployee, availablePeriods, periodStart } = this.state;
    const isReadOnly = status !== 'Draft' && status !== 'Rejected';

    // Calculate Vertical Totals
    const verticalTotals = {
        reg: this.state.logs.reduce((sum, l) => sum + (parseFloat(l.reg) || 0), 0),
        wd: this.state.logs.reduce((sum, l) => sum + (parseFloat(l.wd) || 0), 0),
        vac: this.state.logs.reduce((sum, l) => sum + (parseFloat(l.vac) || 0), 0),
        hol: this.state.logs.reduce((sum, l) => sum + (parseFloat(l.hol) || 0), 0),
        sick: this.state.logs.reduce((sum, l) => sum + (parseFloat(l.sick) || 0), 0),
        bereav: this.state.logs.reduce((sum, l) => sum + (parseFloat(l.bereav) || 0), 0),
        ot: this.state.logs.reduce((sum, l) => sum + (parseFloat(l.ot) || 0), 0),
        juryDuty: this.state.logs.reduce((sum, l) => sum + (parseFloat(l.juryDuty) || 0), 0),
        unpaid: this.state.logs.reduce((sum, l) => sum + (parseFloat(l.unpaid) || 0), 0)
    };

    const grandTotal = Object.keys(verticalTotals).reduce((sum, key) => sum + (verticalTotals[key as keyof typeof verticalTotals] || 0), 0).toFixed(2);

    if (currentView === 'UserSettings') {
        return (
            <UserSettings 
                tempSettings={this.state.tempSettings}
                isSaving={this.state.isSaving}
                onChange={this._onSettingsChange}
                onSave={this._onSaveSettings}
                onCancel={this._switchToMyTimeSheet}
                hasTeamsContext={!!hasTeamsContext}
                styles={styles}
            />
        );
    }


    if (currentView === 'SupervisorDashboard') {
        return (
            <SupervisorDashboard 
                pendingApprovals={pendingApprovals}
                onBack={this._switchToMyTimeSheet}
                onReview={this._viewEmployeeTimeSheet}
                hasTeamsContext={!!hasTeamsContext}
                styles={styles}
            />
        );
    }






    // Create Totals Row
    const totalRow: ITimeLogEntry = {
        date: 'TOTALS', 
        dayName: '',
        timeIn: '',
        lunchOut: '',
        lunchIn: '',
        timeOut: '',
        reg: verticalTotals.reg.toFixed(2),
        wd: verticalTotals.wd.toFixed(2),
        vac: verticalTotals.vac.toFixed(2),
        hol: verticalTotals.hol.toFixed(2),
        sick: verticalTotals.sick.toFixed(2),
        bereav: verticalTotals.bereav.toFixed(2),
        ot: verticalTotals.ot.toFixed(2),
        juryDuty: verticalTotals.juryDuty.toFixed(2),
        unpaid: verticalTotals.unpaid.toFixed(2),
        dailyTotal: '' // Not used but required by interface
    };

    return (
      <section className={`${styles.timeLog} ${hasTeamsContext ? styles.teams : ''}`}>
        <div className={styles.container} style={{ maxWidth: '100%', position: 'relative', minHeight: '400px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2>{viewingEmployee ? `Reviewing: ${viewingEmployee}` : 'Employee Time Sheet'}</h2>
            <div>
                {!viewingEmployee && this.state.isSupervisor && <PrimaryButton text="Supervisor Dashboard" onClick={this._loadDashboard} />}
                {!viewingEmployee && <IconButton iconProps={{ iconName: 'Settings' }} title="Settings" onClick={this._switchToSettings} styles={{ root: { marginLeft: 10 } }} />}
                {viewingEmployee && <PrimaryButton text="Back to Dashboard" onClick={this._loadDashboard} />}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 20 }}>
             <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <span><strong>Employee:</strong> {viewingEmployee || this.props.userDisplayName}</span>
                 <span><strong>Status:</strong> {status}</span>
             </div>
             
             <Dropdown 
                label="Select Period"
                options={availablePeriods}
                selectedKey={periodStart}
                onChange={(e, o) => this._onPeriodChange(o!)}
                styles={{ dropdown: { width: 250 } }}
                disabled={!!viewingEmployee} 
             />

             {/* Removed 'Hours this Period' box from here */}
          </div>

          {(employeeSignedBy || supervisorSignedBy) && (
              <div style={{ marginBottom: 20, padding: 10, backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}>
                  {employeeSignedBy && <div><strong>Signed by Employee:</strong> {employeeSignedBy} on {employeeSignedDate}</div>}
                  {supervisorSignedBy && <div><strong>Approved by Supervisor:</strong> {supervisorSignedBy} on {supervisorSignedDate}</div>}
              </div>
          )}


          <div className={styles.grid}>
            <TimeSheetGrid 
                logs={this.state.logs}
                totalRow={totalRow}
                isReadOnly={isReadOnly}
                onUpdateLog={this._onUpdateLog}
            />
          </div>

          <div style={{ marginTop: 20, borderTop: '1px solid #ccc', paddingTop: 20 }}>
             <h3>Additional Information</h3>
             <TextField 
                 multiline 
                 rows={3} 
                 value={this.state.additionalInformation} 
                 onChange={(e, newVal) => this.setState({ additionalInformation: newVal })} 
                 readOnly={isReadOnly}
                 placeholder="Enter any additional notes..."
                 styles={{ root: { marginBottom: 20 } }}
             />
          </div>

             <TimesheetFooter grandTotal={grandTotal} >
                 <CompTimeSection 
                    compTimeEntries={this.state.compTimeEntries}
                    isReadOnly={isReadOnly}
                    onRationaleChange={this._onRationaleChange}
                    onAddLine={this._addRationaleLine}
                    onRemoveLine={this._removeRationaleLine}
                 />
             </TimesheetFooter>

             <ActionButtons 
                status={status}
                isSaving={this.state.isSaving}
                onSaveDraft={this._onSaveDraft}
                onSignAndSubmit={this._onSignAndSubmit}
                onApprove={this._onApprove}
                onReject={this._onReject}
                onGeneratePDF={this._generatePDF}
                viewingEmployee={viewingEmployee}
             />
          </div>

          {(this.state.isLoading || this.state.isSaving) && (
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(255,255,255,0.7)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 999
            }}>
                <Spinner size={SpinnerSize.large} label={this.state.isSaving ? "Saving Time Sheet..." : "Loading..."} />
            </div>
          )}

        {this.state.notification && (
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '30px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    maxWidth: '400px',
                    width: '90%',
                    textAlign: 'center'
                }}>
                    <h3 style={{ 
                        marginTop: 0, 
                        color: this.state.notification.type === 'error' ? '#a80000' : 
                               this.state.notification.type === 'success' ? '#107c10' : '#333' 
                    }}>
                        {this.state.notification.type === 'error' ? 'Error' : 
                         this.state.notification.type === 'success' ? 'Success' : 'Confirmation'}
                    </h3>
                    <p style={{ fontSize: '16px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{this.state.notification.message}</p>
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        {this.state.notification.type === 'confirm' ? (
                            <>
                                <PrimaryButton text="Confirm" onClick={this.state.notification.onConfirm} />
                                <PrimaryButton text="Cancel" onClick={this.state.notification.onCancel} styles={{ root: { backgroundColor: '#888', border: 'none' } }} />
                            </>
                        ) : (
                            <PrimaryButton text="OK" onClick={this._closeNotification} />
                        )}
                    </div>
                </div>
            </div>
        )}
      </section>
    );
  }
}
