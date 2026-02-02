import { AbilityBuilder, CreateAbility, createMongoAbility, MongoAbility, createAliasResolver } from "@casl/ability";

export type Subjects =
    | "User"
    | "TimeSheets"
    | "TimeOff"
    | "employees"
    | "Supervisor"
    | "TimeOffApprovals"
    | "it-category"
    | "CompanyCalendar"
    | "departments"
    | "all";


export type Actions = "manage" | "create" | "read" | "update" | "delete" | "list" | "show" | "edit";

// Extend actions to include Refine specifics if needed ('list', 'show', 'edit', 'create', 'delete')
// Refine maps: list->read, show->read, create->create, edit->update, delete->delete normally.
// But we can keep it simple.

export type AppAbility = MongoAbility;
export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>;

// Helper to detect subject type (crucial for Refine objects vs strings)
export const detectSubjectType = (subject: any) => {
    if (typeof subject === "string") return subject;
    if (subject && typeof subject === "object") {
        if (subject.resource) return subject.resource; // Refine passes resource objects
        if (subject.name) return subject.name;         // Menu items
        if (subject.__type) return subject.__type;     // Custom tagging
    }
    return "all";
};

export interface UserPayload {
    id: string;
    role?: string | null;
    isSupervisor: boolean;
    allowedScreens: string[];
    directReports?: string[] | string | null;
}

export function defineAbilityFor(user: UserPayload) {
    const resolveAction = createAliasResolver({
        list: 'read',
        show: 'read',
        edit: 'update'
    });

    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    // Configure ability with custom subject detection
    const abilityOptions = {
        detectSubjectType,
        resolveAction
    };
    const role = user.role || 'user';
    const screens = user.allowedScreens || [];

    // --- GRANULAR PERMISSIONS PARSING ---
    screens.forEach(screenPerm => {
        if (screenPerm.includes(':')) {
            const [subject, action] = screenPerm.split(':').map(s => s.trim());
            if (action === 'read') {
                // @ts-ignore
                can('list', subject);
                // @ts-ignore
                can('show', subject);
                // @ts-ignore
                can('read', subject);
            } else if (action === 'update') {
                // @ts-ignore
                can('edit', subject);
                // @ts-ignore
                can('update', subject);
            } else {
                // @ts-ignore
                can(action, subject);
            }
        } else {
            // Legacy / Full access for that specific screen
            // @ts-ignore
            can("manage", screenPerm.trim());
        }
    });

    // --- DEBUG ---
    console.log("[Ability] Parsed Screens:", screens);

    // --- ADMIN ---
    if (role === 'admin') {
        can("manage", "all");
        return build(abilityOptions);
    }

    // --- DASHBOARD ---
    can("read", "dashboard");

    // --- SCREENS MAPPING ---
    // The granular parser already handles 'read', 'create', 'update', 'delete' 
    // for all subjects in 'screens'. 

    // Additional ABAC rules (Logic checks beyond simple resource access)
    // We only call cannot/can with conditions here.

    // TimeSheets: Ownership update
    can("update", "TimeSheets", { userId: user.id });

    // TimeOff: Ownership rules
    can(["update", "delete", "read"], "TimeOff", { userId: user.id });

    // HR Role Specials (Global overrides)
    if (role === 'hr') {
        can("manage", "TimeOff");
        can("read", "TimeSheets");
        can("read", "employees");
        can("read", "departments");
    }

    const ability = build(abilityOptions);

    // Test check for TimeSheets
    console.log("[Ability] Test check TimeSheets:list ->", ability.can('list', 'TimeSheets'));
    console.log("[Ability] Rules count:", ability.rules.length);

    return ability;
}
