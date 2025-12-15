import * as React from 'react';
import { PrimaryButton, DetailsList, SelectionMode } from 'office-ui-fabric-react';

export interface IPendingApproval {
    employee: string;
    employeeEmail: string;
    period: string;
    periodStart: string;
    periodEnd: string;
    date: string;
}

export interface ISupervisorDashboardProps {
    pendingApprovals: IPendingApproval[];
    onBack: () => void;
    onReview: (emp: string, email: string, pStart: string, pEnd: string) => void;
    hasTeamsContext: boolean;
    styles: { timeLog: string; teams?: string; container: string };
}

export const SupervisorDashboard: React.FC<ISupervisorDashboardProps> = (props) => {
    const { pendingApprovals, onBack, onReview, hasTeamsContext, styles } = props;

    return (
        <section className={`${styles.timeLog} ${hasTeamsContext ? styles.teams : ''}`}>
            <div className={styles.container}>
                <h2>Supervisor Dashboard</h2>
                <PrimaryButton text="Back to My Time Sheet" onClick={onBack} style={{ marginBottom: 20 }} />
                
                <h3>Pending Approvals</h3>
                {pendingApprovals.length === 0 ? (
                    <p>No pending approvals found.</p>
                ) : (
                    <DetailsList 
                        items={pendingApprovals}
                        columns={[
                            { key: 'emp', name: 'Employee', fieldName: 'employee', minWidth: 150, maxWidth: 200, onRender: (item) => item.employee },
                            { key: 'per', name: 'Period', fieldName: 'period', minWidth: 150, maxWidth: 200, onRender: (item) => `${item.periodStart} - ${item.periodEnd}` },
                            { key: 'date', name: 'Submitted Date', fieldName: 'date', minWidth: 100, maxWidth: 150, onRender: (item) => item.date },
                            { key: 'action', name: 'Action', minWidth: 100, onRender: (item): JSX.Element => (
                                <PrimaryButton text="Review" onClick={() => onReview(item.employee, item.employeeEmail, item.periodStart, item.periodEnd)} />
                            )}
                        ]}
                        selectionMode={SelectionMode.none}
                    />
                )}
            </div>
        </section>
    );
};
