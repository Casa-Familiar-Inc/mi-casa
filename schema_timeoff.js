import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

// REPLACE THESE WITH YOUR SUPERUSER CREDENTIALS
const ADMIN_EMAIL = 'nefil@casafamiliar.org';
const ADMIN_PASSWORD = 'Kimne02100..';

async function main() {
    try {
        await pb.collection("_superusers").authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log("Authenticated as superuser.");

        // 1. Time Off Requests Collection
        await createCollection({
            name: 'HR_TimeOffRequests',
            type: 'base',
            listRule: '@request.auth.email = employee_email || @request.auth.is_supervisor = true',
            viewRule: '@request.auth.email = employee_email || @request.auth.is_supervisor = true',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.email = employee_email || @request.auth.is_supervisor = true',
            deleteRule: '@request.auth.email = employee_email',
            fields: [
                { name: 'employee_email', type: 'text', required: true },
                { name: 'employee_name', type: 'text' },
                { name: 'today_date', type: 'text' },
                { name: 'department', type: 'text' },
                { name: 'vacation_days_available', type: 'number' },
                { name: 'as_of_date', type: 'text' },
                { name: 'num_days_requested', type: 'number' },
                { name: 'total_hours_requested', type: 'number' },
                { name: 'start_date', type: 'text', required: true },
                { name: 'end_date', type: 'text', required: true },
                { name: 'return_date', type: 'text' },
                {
                    name: 'request_type',
                    type: 'select',
                    maxSelect: 1,
                    values: [
                        'Vacation',
                        'Personal Leave',
                        'Bereavement Leave',
                        'Jury Duty',
                        'Unpaid Leave',
                        'Other',
                        'Military Leave',
                        'Family and Medical Leave',
                        'Sick Time',
                        'Comp-Time',
                        'Request to Earn Comp-Time'
                    ]
                },
                { name: 'other_type_details', type: 'text' },
                { name: 'reason', type: 'text' },
                { name: 'comments', type: 'text' },
                { name: 'employee_signature', type: 'text' },
                { name: 'employee_signature_date', type: 'text' },
                {
                    name: 'status',
                    type: 'select',
                    maxSelect: 1,
                    values: ['Draft', 'Pending', 'Approved', 'Rejected']
                },
                { name: 'supervisor_approval_by', type: 'text' },
                { name: 'supervisor_approval_date', type: 'text' },
                { name: 'hr_approval_by', type: 'text' },
                { name: 'hr_approval_date', type: 'text' },
                { name: 'approval_comments', type: 'text' }
            ]
        });

        console.log("Schema initialization completed successfully.");

    } catch (e) {
        console.error("Script failed:", e);
    }
}

async function createCollection(def) {
    try {
        const existing = await pb.collections.getOne(def.name).catch(() => null);
        if (existing) {
            console.log(`Collection ${def.name} already exists. Updating...`);
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
