import * as React from 'react';
import { DetailsList, IColumn, SelectionMode, TextField } from 'office-ui-fabric-react';
import { ITimeLogEntry } from '../ITimeLogProps';
import { TimeUtils } from '../../utils/TimeUtils';

export interface ITimeSheetGridProps {
    logs: ITimeLogEntry[];
    totalRow: ITimeLogEntry;
    isReadOnly: boolean;
    onUpdateLog: (index: number, field: keyof ITimeLogEntry, value: string) => void;
}

export const TimeSheetGrid: React.FC<ITimeSheetGridProps> = (props) => {
    const { logs, totalRow, isReadOnly, onUpdateLog } = props;

    // Navigation Logic
    const EDITABLE_FIELDS: (keyof ITimeLogEntry)[] = [
        'timeIn', 'lunchOut', 'lunchIn', 'timeOut', 
        'wd', 'vac', 'hol', 'sick', 'bereav', 'ot', 'juryDuty', 'unpaid'
    ];
    
    // Enter key only cycles through Time fields
    const TIME_FIELDS: (keyof ITimeLogEntry)[] = ['timeIn', 'lunchOut', 'lunchIn', 'timeOut'];

    const _onGridKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, rowIndex: number, field: keyof ITimeLogEntry): void => {
        // Stop propagation for Left/Right to prevent DetailsList from stealing focus
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.stopPropagation();
            return;
        }

        // Handle Enter, Tab, Up, Down
        if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault(); 
            
            let targetRow = rowIndex;
            let fieldsList = EDITABLE_FIELDS;
            
            // Enter key specific behavior (Time fields only)
            if (e.key === 'Enter') {
                fieldsList = TIME_FIELDS;
                if (TIME_FIELDS.indexOf(field) === -1) {
                    fieldsList = EDITABLE_FIELDS;
                }
            }

            let targetFieldIdx = fieldsList.indexOf(field);

            if (e.key === 'Enter') {
                targetFieldIdx++;
                if (targetFieldIdx >= fieldsList.length) {
                    targetFieldIdx = 0;
                    targetRow++;
                }
            } else if (e.key === 'Tab') {
                if (e.shiftKey) {
                    targetFieldIdx--;
                    if (targetFieldIdx < 0) {
                        targetFieldIdx = fieldsList.length - 1;
                        targetRow--;
                    }
                } else {
                    targetFieldIdx++;
                    if (targetFieldIdx >= fieldsList.length) {
                        targetFieldIdx = 0;
                        targetRow++;
                    }
                }
            } else if (e.key === 'ArrowUp') {
                targetRow--;
            } else if (e.key === 'ArrowDown') {
                targetRow++;
            }

            // Boundary Checks (logs.length does not include total row)
            if (targetRow >= 0 && targetRow < logs.length) {
                const targetField = fieldsList[targetFieldIdx];
                const targetId = `input-${targetRow}-${targetField}`;
                const element = document.getElementById(targetId);
                if (element) {
                    element.focus();
                    (element as HTMLInputElement).select(); 
                }
            }
        }
    };

    const renderTextCell = (item: ITimeLogEntry, index: number | undefined, field: keyof ITimeLogEntry, width: number = 40, inputType: string = 'text', forceReadOnly: boolean = false): JSX.Element => {
        // Special rendering for Totals Row
        if (item.date === 'TOTALS') {
             // If it's a numeric field, show the value bolded.
             return (
                 <div style={{ width: width, fontWeight: 'bold', paddingLeft: 8 }}>
                     {item[field]}
                 </div>
             );
        }

        let isValid = true;
        // Validation Logic
        if (inputType === 'time') {
            const tIn = TimeUtils.parseTime(item.timeIn);
            const lOut = TimeUtils.parseTime(item.lunchOut);
            const lIn = TimeUtils.parseTime(item.lunchIn);
            const tOut = TimeUtils.parseTime(item.timeOut);

            if (field === 'timeOut' && item.timeIn && item.timeOut && tOut < tIn) isValid = false;
            if (field === 'timeIn' && item.timeIn && item.timeOut && tOut < tIn) isValid = false;
            
            if (field === 'lunchIn' && item.lunchOut && item.lunchIn && lIn < lOut) isValid = false;
            if (field === 'lunchOut' && item.lunchOut && item.lunchIn && lIn < lOut) isValid = false;

            // Lunch must be within In/Out
            if (field === 'lunchOut' && item.timeIn && item.lunchOut && lOut < tIn) isValid = false;
            if (field === 'lunchIn' && item.timeOut && item.lunchIn && lIn > tOut) isValid = false;
        }

        return (
            <TextField 
                id={`input-${index}-${field}`}
                value={item[field] as string} 
                type={inputType}
                onChange={(e, v: string | undefined): void => onUpdateLog(index!, field, v || '')} 
                onKeyDown={(e): void => _onGridKeyDown(e, index!, field)}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {...{ onClick: (e: any): void => {
                    if (inputType === 'time' && e.target && e.target.showPicker) {
                        e.target.showPicker();
                    }
                }} as any}
                styles={{ 
                    fieldGroup: { 
                        width: width, 
                        minWidth: width,
                        borderColor: isValid ? undefined : 'red',
                        borderWidth: isValid ? undefined : 2
                    } 
                }}
                disabled={isReadOnly || forceReadOnly}
                title={isValid ? '' : 'Invalid Time Sequence'}
            />
        );
    };

    const columns: IColumn[] = [
      { key: 'date', name: 'Date', fieldName: 'date', minWidth: 70, maxWidth: 80 },
      { key: 'dayName', name: 'Day', fieldName: 'dayName', minWidth: 60, maxWidth: 70 },
      { key: 'timeIn', name: 'In', fieldName: 'timeIn', minWidth: 90, maxWidth: 100, onRender: (i, idx) => renderTextCell(i, idx, 'timeIn', 90, 'time') },
      { key: 'lunchOut', name: 'L.Out', fieldName: 'lunchOut', minWidth: 90, maxWidth: 100, onRender: (i, idx) => renderTextCell(i, idx, 'lunchOut', 90, 'time') },
      { key: 'lunchIn', name: 'L.In', fieldName: 'lunchIn', minWidth: 90, maxWidth: 100, onRender: (i, idx) => renderTextCell(i, idx, 'lunchIn', 90, 'time') },
      { key: 'timeOut', name: 'Out', fieldName: 'timeOut', minWidth: 90, maxWidth: 100, onRender: (i, idx) => renderTextCell(i, idx, 'timeOut', 90, 'time') },
      
      { key: 'reg', name: 'REG', fieldName: 'reg', minWidth: 30, maxWidth: 40, onRender: (i, idx) => renderTextCell(i, idx, 'reg', 40, 'text', true) },
      { key: 'wd', name: 'WD', fieldName: 'wd', minWidth: 30, maxWidth: 40, onRender: (i, idx) => renderTextCell(i, idx, 'wd') },
      { key: 'vac', name: 'VAC', fieldName: 'vac', minWidth: 30, maxWidth: 40, onRender: (i, idx) => renderTextCell(i, idx, 'vac') },
      { key: 'hol', name: 'HOL', fieldName: 'hol', minWidth: 30, maxWidth: 40, onRender: (i, idx) => renderTextCell(i, idx, 'hol') },
      { key: 'sick', name: 'SICK', fieldName: 'sick', minWidth: 30, maxWidth: 40, onRender: (i, idx) => renderTextCell(i, idx, 'sick') },
      { key: 'bereav', name: 'BER', fieldName: 'bereav', minWidth: 30, maxWidth: 40, onRender: (i, idx) => renderTextCell(i, idx, 'bereav') },
      { key: 'ot', name: 'OT', fieldName: 'ot', minWidth: 30, maxWidth: 40, onRender: (i, idx) => renderTextCell(i, idx, 'ot') },
      { key: 'juryDuty', name: 'JURY', fieldName: 'juryDuty', minWidth: 30, maxWidth: 40, onRender: (i, idx) => renderTextCell(i, idx, 'juryDuty') },
      { key: 'unpaid', name: 'UNPD', fieldName: 'unpaid', minWidth: 30, maxWidth: 40, onRender: (i, idx) => renderTextCell(i, idx, 'unpaid') },
    ];

    return (
        <DetailsList
            items={[...logs, totalRow]}
            columns={columns}
            selectionMode={SelectionMode.none}
            compact={true}
        />
    );
};
