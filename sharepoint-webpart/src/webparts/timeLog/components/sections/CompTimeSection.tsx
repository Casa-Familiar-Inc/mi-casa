import * as React from 'react';
import { TextField, PrimaryButton, IconButton } from 'office-ui-fabric-react';

export interface ICompTimeSectionProps {
    compTimeEntries: { rationale: string, date: string }[];
    isReadOnly: boolean;
    onRationaleChange: (index: number, field: 'rationale' | 'date', value: string) => void;
    onAddLine: () => void;
    onRemoveLine: (index: number) => void;
}

export const CompTimeSection: React.FC<ICompTimeSectionProps> = (props) => {
    const { compTimeEntries, isReadOnly, onRationaleChange, onAddLine, onRemoveLine } = props;

    return (
        <div style={{ marginBottom: 15 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 10 }}>Comp Time Rationale</label>
            
            {/* Table Header */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 5, fontWeight: 600, borderBottom: '1px solid #eaeaea', paddingBottom: 5 }}>
                <div style={{ width: 150 }}>Date</div>
                <div style={{ flexGrow: 1 }}>Rationale</div>
                {!isReadOnly && <div style={{ width: 40 }} />}
            </div>

            {compTimeEntries.map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 5, alignItems: 'center' }}>
                    <TextField 
                       value={entry.date} 
                       type="date"
                       onChange={(e, v) => onRationaleChange(idx, 'date', v || '')}
                       disabled={isReadOnly}
                       styles={{ root: { width: 150 } }}
                       placeholder="Select Date"
                    />
                    <TextField 
                       value={entry.rationale} 
                       onChange={(e, v) => onRationaleChange(idx, 'rationale', v || '')}
                       styles={{ root: { flexGrow: 1 } }}
                       disabled={isReadOnly}
                       placeholder="Enter rationale..."
                    />
                    {!isReadOnly && (
                        <IconButton 
                           iconProps={{ iconName: 'Delete' }} 
                           title="Remove line" 
                           ariaLabel="Remove line" 
                           onClick={() => onRemoveLine(idx)}
                           disabled={compTimeEntries.length <= 1} 
                        />
                    )}
                </div>
            ))}
            {!isReadOnly && (
               <PrimaryButton text="Add Entry" onClick={onAddLine} iconProps={{ iconName: 'Add' }} styles={{ root: { marginTop: 10 } }} />
            )}
        </div>
    );
};
