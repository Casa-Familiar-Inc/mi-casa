import { AbilityBuilder, CreateAbility, createMongoAbility, MongoAbility } from "@casl/ability";

export type Subjects =
    | "User"
    | "TimeSheet"
    | "TimeOff"
    | "Loan"
    | "Employee"
    | "Supervisor"
    | "IT"
    | "HR"
    | "CompanyCalendar"
    | "all";


export type Actions = "manage" | "create" | "read" | "update" | "delete" | "list" | "show" | "edit";

// Extend actions to include Refine specifics if needed ('list', 'show', 'edit', 'create', 'delete')
// Refine maps: list->read, show->read, create->create, edit->update, delete->delete normally.
// But we can keep it simple.

export type AppAbility = MongoAbility;
export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>;

export interface UserPayload {
    id: string;
    role?: string | null;
    isSupervisor: boolean;
    allowedScreens: string[];
    directReports?: string[] | string | null;
}

export function defineAbilityFor(user: UserPayload) {
    // console.log("Defining Ability for:", user); // DEBUG
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    const role = user.role || 'user';
    const screens = user.allowedScreens || [];

    // --- ADMIN ---
    if (role === 'admin') {
        can("manage", "all");
        return build();
    }

    // --- DASHBOARD ---
    // Refine uses 'list' for menu visibility
    can("list", "dashboard");
    can("show", "dashboard");

    // --- SCREENS MAPPING ---
    // Refine Resource Name vs Subject. 
    // Resource: "TimeSheets", Subject: "TimeSheet"
    // Resource: "TimeSheets", Subject: "TimeSheets" (if strict mapping)
    // Let's use string matching for simplicity or map them.
    // In App.tsx we used resource names directly.
    // Let's align subjects with Resource Names for Frontend convenience.

    // Resource: "TimeSheets"
    if (screens.includes("TimeSheets")) {
        can("list", "TimeSheets");
        can("create", "TimeSheets");
        can("show", "TimeSheets");
        can("edit", "TimeSheets");
    }

    if (screens.includes("TimeOff")) {
        can("list", "TimeOff");
        can("create", "TimeOff");
        can("show", "TimeOff");
    }

    if (screens.includes("loans")) { // Lowercase in list.tsx, handle both case logic?
        can("list", "loans");
        can("show", "loans");
    }

    if (screens.includes("Supervisor")) {
        can("list", "Supervisor");
        can("show", "Supervisor");
        can("manage", "Supervisor");
    }

    if (screens.includes("TimeOffApprovals")) {
        can("list", "TimeOffApprovals");
        can("show", "TimeOffApprovals");
        can("manage", "TimeOffApprovals");
    }

    if (screens.includes("employees")) {
        can("manage", "employees"); // Manage user list
    }

    if (screens.includes("it-category")) {
        can("manage", "it-category");
    }

    if (screens.includes("CompanyCalendar")) {
        can("list", "CompanyCalendar");
        can("show", "CompanyCalendar");
        can("manage", "CompanyCalendar");
    }


    // HR Role Specials
    if (role === 'hr') {
        can("manage", "TimeOff");
        can("list", "TimeSheets"); // HR Audit
        can("list", "employees");
    }

    return build();
}
