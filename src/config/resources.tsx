import {
    LayoutDashboard,
    Tags,
    Factory,
    Users,
    Clock,
    ShieldAlert,
    Calendar,
    Building
} from "lucide-react";

export const resources = [
    {
        name: "dashboard",
        list: "/",
        meta: {
            label: "Dashboard",
            icon: <LayoutDashboard className="h-4 w-4" />
        }
    },
    {
        name: "employees", // User Management
        list: "/admin/users",
        meta: {
            label: "Employees",
            icon: <Users className="h-4 w-4" />
        }
    },
    {
        name: "it-category",
        list: "/it-category",
        create: "/it-category/create",
        edit: "/it-category/edit/:id",
        show: "/it-category/show/:id",
        meta: {
            label: "IT Categories",
            icon: <Tags className="h-4 w-4" />
        }
    },
    {
        name: "it-manufacturer",
        list: "/it-manufacturer",
        meta: {
            label: "IT Manufacturers",
            icon: <Factory className="h-4 w-4" />
        }
    },
    {
        name: "departments",
        list: "/admin/departments",
        meta: {
            label: "Departments",
            icon: <Building className="h-4 w-4" />
        }
    },
    {
        name: "HR",
        meta: {
            label: "HR",
            icon: <Users className="h-4 w-4" />
        }
    },
    {
        name: "TimeSheets",
        list: "/timesheets",
        create: "/timesheets/entry",
        meta: {
            label: "TimeSheets",
            parent: "HR",
            icon: <Clock className="h-4 w-4" />
        },
    },
    {
        name: "TimeOff",
        list: "/hr/time-off",
        create: "/hr/time-off/new",
        meta: {
            label: "Time Off Request",
            parent: "HR",
            icon: <Calendar className="h-4 w-4" />
        },
    },

    {
        name: "Supervisor",
        list: "/supervisor",
        meta: {
            label: "Supervisor Dashboard",
            parent: "HR",
            icon: <ShieldAlert className="h-4 w-4" />
        }
    },
    {
        name: "CompanyCalendar",
        list: "/hr/holidays",
        meta: {
            label: "Casa Calendar",
            parent: "HR",
            icon: <Calendar className="h-4 w-4" />
        }
    },
    {
        name: "HRAudit",
        list: "/hr/audit",
        meta: {
            label: "Audit & Reports",
            parent: "HR",
            icon: <ShieldAlert className="h-4 w-4" />
        }
    }
];
