import * as React from 'react';
import { PrimaryButton } from 'office-ui-fabric-react';

export interface IActionButtonsProps {
    status: string;
    isSaving: boolean;
    onSaveDraft: () => void;
    onSignAndSubmit: () => void;
    onApprove: () => void;
    onReject: () => void;
    onGeneratePDF: () => void;
    viewingEmployee?: string;
}

export const ActionButtons: React.FC<IActionButtonsProps> = (props) => {
    const { status, isSaving, viewingEmployee, onSaveDraft, onSignAndSubmit, onApprove, onReject, onGeneratePDF } = props;

    return (
        <div style={{ display: 'flex', gap: 20, marginTop: 15, alignItems: 'end' }}>
            {(status === 'Draft' || status === 'Rejected') && !viewingEmployee && (
                <>
                    <PrimaryButton text="Save Draft" onClick={onSaveDraft} disabled={isSaving} />
                    <PrimaryButton text="Sign & Submit" onClick={onSignAndSubmit} styles={{ root: { backgroundColor: 'green' } }} disabled={isSaving} />
                </>
            )}

            {status === 'Submitted' && viewingEmployee && (
                <>
                    <PrimaryButton text="Approve" onClick={onApprove} styles={{ root: { backgroundColor: 'purple' } }} disabled={isSaving} />
                    <PrimaryButton text="Reject" onClick={onReject} styles={{ root: { backgroundColor: 'darkred' } }} disabled={isSaving} />
                </>
            )}

            {status === 'Approved' && (
                <PrimaryButton text="Export PDF" onClick={onGeneratePDF} />
            )}
        </div>
    );
};
