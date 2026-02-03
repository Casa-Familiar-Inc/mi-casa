import { useState, useEffect } from "react";
import { format, startOfWeek, addDays, subWeeks } from "date-fns";
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from "../../../components/ui/card"; // Adjust imports based on actual path
import { Button } from "../../../components/ui/button";
import { Calendar } from "../../../components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../../../components/ui/popover";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../../components/ui/table";
import { 
    Download, 
    Calendar as CalendarIcon, 
    Users, 
    CheckCircle2, 
    Clock, 
    AlertCircle 
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { TimeSheetService } from "../../../services/timeSheetService";
import { TimeOffService } from "../../../services/timeOffService";
import { generateBulkTimesheetPDF, generateBulkTimeOffPDF } from "../../../utils/PDFUtils";
import { HR_TimeSheetHeader } from "../../../types/timesheet";
import { HR_TimeOffRequest } from "../../../types/timeoff";
import { toast } from "sonner";

export const HRAuditDashboard = () => {
    // State for Timesheets
    const [tsStart, setTsStart] = useState<Date | undefined>(
        startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }) 
    );
    const [tsEnd, setTsEnd] = useState<Date | undefined>(
        addDays(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), 6)
    );
    const [timesheets, setTimesheets] = useState<HR_TimeSheetHeader[]>([]);
    const [loadingTimesheets, setLoadingTimesheets] = useState(false);

    // State for Time Off
    const [timeOffStart, setTimeOffStart] = useState<Date | undefined>(subWeeks(new Date(), 1));
    const [timeOffEnd, setTimeOffEnd] = useState<Date | undefined>(new Date());
    const [timeOffRequests, setTimeOffRequests] = useState<HR_TimeOffRequest[]>([]);
    const [loadingTimeOff, setLoadingTimeOff] = useState(false);

    // Fetch Timesheets when dates change
    useEffect(() => {
        if (!tsStart || !tsEnd) return;
        const fetchTimesheets = async () => {
            setLoadingTimesheets(true);
            try {
                const s = format(tsStart, "yyyy-MM-dd");
                const e = format(tsEnd, "yyyy-MM-dd");
                const data = await TimeSheetService.getAllTimeSheets(s, e);
                setTimesheets(data);
                toast.success(`Loaded ${data.length} timesheets`);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load timesheets");
            } finally {
                setLoadingTimesheets(false);
            }
        };
        fetchTimesheets();
    }, [tsStart, tsEnd]);

    // Fetch TimeOff Requests when dates change (optional auto-fetch or manual?)
    // Let's make it manual or effect-based. Effect-based is smoother.
    useEffect(() => {
        if (!timeOffStart || !timeOffEnd) return;
        const fetchTimeOff = async () => {
            setLoadingTimeOff(true);
            try {
                const s = format(timeOffStart, "yyyy-MM-dd");
                const e = format(timeOffEnd, "yyyy-MM-dd");
                const data = await TimeOffService.getAllRequestsByPeriod(s, e);
                setTimeOffRequests(data);
                toast.success(`Loaded ${data.length} time off requests`);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load time off requests");
            } finally {
                setLoadingTimeOff(false);
            }
        };
        fetchTimeOff();
    }, [timeOffStart, timeOffEnd]);

    // Metrics Calculation
    const tsStats = {
        total: timesheets.length,
        submitted: timesheets.filter(t => t.status === 'Submitted' || t.status === 'Approved').length, // Assuming Approved also counts a submitted workflow
        approved: timesheets.filter(t => t.status === 'Approved').length,
        pending: timesheets.filter(t => t.status !== 'Approved' && t.status !== 'Rejected').length, // Rough approximation
        waiting_supervisor: timesheets.filter(t => t.status === 'Submitted').length
    };

    const handleDownloadTimesheets = async () => {
        if (!tsStart || !tsEnd || timesheets.length === 0) {
            toast.warning("No timesheets to download");
            return;
        }

        try {
            toast.info("Generating PDF... Please wait.");
            
            // We need full details (logs) for the PDF, so we might need to fetch them individually 
            // OR ensure the backend returns everything in the list (unlikely based on type definition usually, but let's check).
            // The type `HR_TimeSheetHeader` implies headers only. `TimeSheetFull` has logs.
            // Our service `getAllTimeSheets` currently returns generic list. 
            // If it returns only headers, we need to fetch details for each.
            
            // Let's assume we need to fetch details concurrently.
            // CAUTION: This might be many requests. 
            // Optimization: Create a bulk fetch endpoint or fetch in batches.
            // For now, client-side batching.
            
            const detailedTimesheetsPromises = timesheets.map(t => TimeSheetService.getTimeSheetById(t.id));
            const detailedTimesheets = (await Promise.all(detailedTimesheetsPromises)).filter(Boolean); // removes nulls

            generateBulkTimesheetPDF(detailedTimesheets as any, format(tsStart, "yyyy-MM-dd"));
            toast.success("Timesheets PDF downloaded!");
        } catch (e) {
            console.error(e);
            toast.error("Failed to generate PDF");
        }
    };

    const handleDownloadTimeOff = async () => {
        if (!timeOffStart || !timeOffEnd || timeOffRequests.length === 0) {
            toast.warning("No requests to download");
            return;
        }
        try {
            toast.info("Generating PDF...");
            generateBulkTimeOffPDF(timeOffRequests, format(timeOffStart, "yyyy-MM-dd"), format(timeOffEnd, "yyyy-MM-dd"));
            toast.success("Time Off Requests PDF downloaded!");
        } catch (e) {
            console.error(e);
            toast.error("Failed to generate PDF");
        }
    };

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">HR Audit Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Monitor timesheets and time off requests for payroll and audit purposes.
                    </p>
                </div>
            </div>

            {/* Timesheets Section */}
            <section className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-2">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        Timesheets (Weekly)
                    </h2>
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !tsStart && "text-muted-foreground")}>
                                    {tsStart ? format(tsStart, "PPP") : <span>Start Date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={tsStart}
                                    onSelect={setTsStart}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !tsEnd && "text-muted-foreground")}>
                                    {tsEnd ? format(tsEnd, "PPP") : <span>End Date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={tsEnd}
                                    onSelect={setTsEnd}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Button onClick={handleDownloadTimesheets} disabled={loadingTimesheets || timesheets.length === 0}>
                            <Download className="mr-2 h-4 w-4" />
                            Export PDF
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{tsStats.total}</div>
                            <p className="text-xs text-muted-foreground">Timesheets found</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{tsStats.waiting_supervisor}</div>
                            <p className="text-xs text-muted-foreground">Waiting for implementation</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Approved</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{tsStats.approved}</div>
                            <p className="text-xs text-muted-foreground">Ready for payroll</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Total Hours</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingTimesheets ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">Loading...</TableCell>
                                    </TableRow>
                                ) : timesheets.length > 0 ? (
                                    timesheets.map((ts) => (
                                        <TableRow key={ts.id}>
                                            <TableCell className="font-medium">{ts.employee_name}</TableCell>
                                            <TableCell>{ts.employee_email}</TableCell>
                                            <TableCell>{format(new Date(ts.period_start), 'MM/dd')} - {format(new Date(ts.period_end), 'MM/dd')}</TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                                    ts.status === 'Approved' ? "bg-green-100 text-green-800 border-green-200" :
                                                    ts.status === 'Submitted' ? "bg-amber-100 text-amber-800 border-amber-200" :
                                                    ts.status === 'Rejected' ? "bg-red-100 text-red-800 border-red-200" :
                                                    "bg-gray-100 text-gray-800 border-gray-200"
                                                )}>
                                                    {ts.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">{ts.total_hours}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            No timesheets found for this period.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </section>

             {/* Time Off Section */}
             <section className="space-y-4 pt-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-2">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-purple-500" />
                        Time Off Requests
                    </h2>
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !timeOffStart && "text-muted-foreground")}>
                                    {timeOffStart ? format(timeOffStart, "PPP") : <span>Start Date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar mode="single" selected={timeOffStart} onSelect={setTimeOffStart} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !timeOffEnd && "text-muted-foreground")}>
                                    {timeOffEnd ? format(timeOffEnd, "PPP") : <span>End Date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar mode="single" selected={timeOffEnd} onSelect={setTimeOffEnd} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Button onClick={handleDownloadTimeOff} variant="secondary" disabled={loadingTimeOff || timeOffRequests.length === 0}>
                            <Download className="mr-2 h-4 w-4" />
                            Export PDF
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Request ID</TableHead>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Dates</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Days</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {loadingTimeOff ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">Loading...</TableCell>
                                    </TableRow>
                                ) : timeOffRequests.length > 0 ? (
                                    timeOffRequests.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{req.id.slice(0, 8)}...</TableCell>
                                            <TableCell className="font-medium">{req.employee_name}</TableCell>
                                            <TableCell>{req.request_type}</TableCell>
                                            <TableCell>{format(new Date(req.start_date), 'MM/dd')} - {format(new Date(req.end_date), 'MM/dd')}</TableCell>
                                             <TableCell>
                                                <span className={cn(
                                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                                    req.status === 'Approved' ? "bg-green-100 text-green-800 border-green-200" :
                                                    req.status === 'Pending' ? "bg-blue-100 text-blue-800 border-blue-200" :
                                                    req.status === 'Rejected' ? "bg-red-100 text-red-800 border-red-200" :
                                                    "bg-gray-100 text-gray-800 border-gray-200"
                                                )}>
                                                    {req.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">{req.num_days_requested}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                            No requests found for this period.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
             </section>
        </div>
    );
};
