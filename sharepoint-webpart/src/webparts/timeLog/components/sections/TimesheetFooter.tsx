import * as React from 'react';

export interface ITimesheetFooterProps {
    grandTotal: string;
    children?: React.ReactNode;
}

export const TimesheetFooter: React.FC<ITimesheetFooterProps> = (props) => {
    const { grandTotal, children } = props;

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 20 }}>
            {/* Left Side: Hours This Period Box */}
            <div style={{ marginRight: 20 }}>
                <div style={{ 
                    border: '3px solid black', 
                    display: 'flex', 
                    flexDirection: 'column',
                    width: '150px'
                }}>
                    <div style={{ 
                        fontSize: '11px', 
                        fontWeight: 'bold', 
                        padding: '4px',
                        borderBottom: '1px solid black',
                        backgroundColor: '#f0f0f0'
                    }}>
                        HOURS THIS PERIOD
                    </div>
                    <div style={{ 
                        fontSize: '24px', 
                        fontWeight: 'bold', 
                        textAlign: 'center', 
                        padding: '10px' 
                    }}>
                        {grandTotal}
                    </div>
                </div>
            </div>

            {/* Right Side: Comp Time Section (Passed as Children) */}
            <div style={{ flexGrow: 1, maxWidth: '60%' }}>
                {children}
            </div>
        </div>
    );
};
