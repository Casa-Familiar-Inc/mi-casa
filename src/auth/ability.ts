import { AbilityBuilder, CreateAbility, createMongoAbility, MongoAbility, createAliasResolver } from "@casl/ability";

export type Subjects =
    | "User"
    | "TimeSheets"
    | "TimeOff"
    | "Expenses"
    | "employees"
    | "Supervisor"
    | "TimeOffApprovals"
    | "it-category"
    | "CompanyCalendar"
    | "holidays"
    | "organization"
    | "departments"
    | "Accounting"
    | "dashboard"
    | "all";


export type Actions = "manage" | "create" | "read" | "update" | "delete" | "list" | "show" | "edit";

export type AppAbility = MongoAbility<[Actions, Subjects | Record<string, any>]>;
export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>;

// Helper to detect subject type (crucial for Refine objects vs strings)
export const detectSubjectType = (subject: any) => {
    if (typeof subject === "string") return subject;
    if (subject && typeof subject === "object") {
        // CASL v6+ often uses __caslSubjectType__ for objects created via subject()
        if (subject.__caslSubjectType__) return subject.__caslSubjectType__;

        // CASL uses a symbol to store the subject name
        const typeSymbol = Symbol.for('type');
        if (subject[typeSymbol]) return subject[typeSymbol];

        if (subject.resource) return subject.resource; // Refine passes resource objects
        if (subject.name) return subject.name;         // Menu items
        if (subject.__type) return subject.__type;     // Custom tagging
        // Drizzle/Class detection fallback
        if (subject.constructor && subject.constructor.name !== "Object") return subject.constructor.name;
    }
    return "all";
};

import { subject as caslSubject } from "@casl/ability";
export const subject = (name: Subjects, object: any) => caslSubject(name, object);

export interface UserPayload {
    id: string;
    role?: string | null;
    isSupervisor: boolean;
    directReports?: string[] | string | null;
}

export function defineAbilityFor(user: UserPayload) {
    debugger;
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
    can("update", "TimeSheets", { user_id: user.id, status: "Draft" });

    // TimeOff: Ownership rules
    can(["update", "delete", "read"], "TimeOff", { user_id: user.id });

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
