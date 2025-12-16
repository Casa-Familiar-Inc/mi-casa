import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

// REPLACE THESE WITH YOUR SUPERUSER CREDENTIALS
const ADMIN_EMAIL = 'nefil@casafamiliar.org';
const ADMIN_PASSWORD = 'Kimne02100..';

async function main() {
    try {
        await pb.collection("_superusers").authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log("Authenticated as superuser.");

        // 0. Update 'users' collection with new fields
        // We need job_title and direct_reports for the Supervisor feature
        try {
            const usersCol = await pb.collections.getOne('users');
            // Check if fields exist, if not add them
            const fields = usersCol.fields || [];
            const hasJobTitle = fields.some(f => f.name === 'job_title');
            const hasDirectReports = fields.some(f => f.name === 'direct_reports');
            const hasIsSupervisor = fields.some(f => f.name === 'is_supervisor');
            
            // Force update if any field is missing
            if (!hasJobTitle || !hasDirectReports || !hasIsSupervisor) {
                console.log("Updating 'users' collection schema...");
                const newFields = JSON.parse(JSON.stringify(fields)); // Deep copy
                
                if (!hasJobTitle) {
                    console.log("Adding job_title field");
                    newFields.push({ name: 'job_title', type: 'text' });
                }
                if (!hasDirectReports) {
                    console.log("Adding direct_reports field");
                    newFields.push({ name: 'direct_reports', type: 'json' });
                }
                if (!hasIsSupervisor) {
                    console.log("Adding is_supervisor field");
                    newFields.push({ name: 'is_supervisor', type: 'bool' });
                }
                await pb.collections.update('users', { fields: newFields });
                console.log("'users' collection updated.");
            } else {
                 console.log("'users' collection already has required fields.");
            }
        } catch (e) {
            console.error("Error updating users collection:", e);
        }

        // 1. Employee Settings
        await createCollection({
            name: 'HR_EmployeeSettings',
            type: 'base',
            listRule: '@request.auth.email = user_email', // Users can see their own settings
            viewRule: '@request.auth.email = user_email',
            createRule: '@request.auth.id != ""', 
            updateRule: '@request.auth.email = user_email',
            deleteRule: null, // No delete
            fields: [
                { name: 'user_email', type: 'text', required: true },
                { name: 'default_time_in', type: 'text' },
                { name: 'default_lunch_out', type: 'text' },
                { name: 'default_lunch_in', type: 'text' },
                { name: 'default_time_out', type: 'text' }
            ],
            indexes: [
                'CREATE UNIQUE INDEX idx_user_email ON HR_EmployeeSettings (user_email)'
            ]
        });

        // 2. TimeSheet Headers
        let headerCollectionId = '';
        try {
            const headerCol = await pb.collections.getOne('HR_TimeSheetHeaders').catch(() => null);
            if (headerCol) {
                headerCollectionId = headerCol.id;
                console.log("HR_TimeSheetHeaders exists, ID:", headerCollectionId);
                // Update if needed, but for now we assume it's good or handled by createCollection logic if we were strictly following it. 
                // But since we need the ID for the next steps, and createCollection is valid for updates too.
            }
        } catch (e) {}

        if (!headerCollectionId) {
             // We need to create it and get the ID
             // But my createCollection helper doesn't return the ID explicitly or we need to refactor.
             // Let's refactor createCollection to return the collection object.
        }

        const headerColResult = await createCollection({
            name: 'HR_TimeSheetHeaders',
            type: 'base',
            listRule: '@request.auth.email = employee_email || @request.auth.is_supervisor = true', // Restoring Strict Rule
            viewRule: '@request.auth.email = employee_email || @request.auth.is_supervisor = true',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.email = employee_email || @request.auth.is_supervisor = true',
            deleteRule: '@request.auth.email = employee_email',
            fields: [
                { name: 'employee_email', type: 'text', required: true },
                { name: 'employee_name', type: 'text' },
                { name: 'period_start', type: 'text', required: true },
                { name: 'period_end', type: 'text', required: true },
                { 
                    name: 'status', 
                    type: 'select', 
                    maxSelect: 1,
                    values: ['Draft', 'Submitted', 'Approved', 'Rejected']
                },
                { name: 'total_hours', type: 'number' },
                { name: 'additional_info', type: 'editor' },
                { name: 'employee_signed_by', type: 'text' },
                { name: 'employee_signed_date', type: 'text' },
                { name: 'supervisor_signed_by', type: 'text' },
                { name: 'supervisor_signed_date', type: 'text' }
            ]
        });
        
        // Fetch again to be sure (or modify createCollection to return it)
        const headerCol = await pb.collections.getOne('HR_TimeSheetHeaders');
        headerCollectionId = headerCol.id;

        // 3. TimeSheet Logs
        await createCollection({
            name: 'HR_TimeSheetLogs',
            type: 'base',
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id != ""',
            deleteRule: '@request.auth.id != ""',
            fields: [
                { name: 'header', type: 'relation', collectionId: headerCollectionId, cascadeDelete: true, maxSelect: 1, required: true },
                { name: 'date', type: 'text' },
                { name: 'day_name', type: 'text' },
                { name: 'time_in', type: 'text' },
                { name: 'lunch_out', type: 'text' },
                { name: 'lunch_in', type: 'text' },
                { name: 'time_out', type: 'text' },
                { name: 'reg_hours', type: 'number' },
                { name: 'wd_hours', type: 'number' },
                { name: 'vac_hours', type: 'number' },
                { name: 'hol_hours', type: 'number' },
                { name: 'sick_hours', type: 'number' },
                { name: 'bereav_hours', type: 'number' },
                { name: 'ot_hours', type: 'number' },
                { name: 'jury_duty_hours', type: 'number' },
                { name: 'unpaid_hours', type: 'number' },
                { name: 'daily_total', type: 'number' }
            ]
        });

        // 4. Comp Time Entries
        await createCollection({
            name: 'HR_CompTimeEntries',
            type: 'base',
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id != ""',
            deleteRule: '@request.auth.id != ""',
            fields: [
                { name: 'header', type: 'relation', collectionId: headerCollectionId, cascadeDelete: true, maxSelect: 1, required: true },
                { name: 'date', type: 'text' },
                { name: 'rationale', type: 'text' }
            ]
        });

    } catch (e) {
        console.error("Script failed:", e);
    }
}

async function createCollection(def) {
    try {
        const existing = await pb.collections.getOne(def.name).catch(() => null);
        if (existing) {
            console.log(`Collection ${def.name} already exists. Updating...`);
            // We usually can't easily update everything without care, but we'll try basic prop updates
            await pb.collections.update(existing.id, def);
        } else {
            console.log(`Creating collection ${def.name}...`);
            await pb.collections.create(def);
        }
    } catch (e) {
        console.error(`Error processing collection ${def.name}:`, JSON.stringify(e.response || e, null, 2));
    }
}

main();
