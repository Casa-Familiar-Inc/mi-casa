import * as React from 'react';
import { IEmployeeSettings } from '../../services/TimeLogService';
import { TextField, PrimaryButton } from 'office-ui-fabric-react';

export interface IUserSettingsProps {
    tempSettings: IEmployeeSettings | undefined;
    isSaving: boolean;
    onChange: (field: keyof IEmployeeSettings, value: string) => void;
    onSave: () => void;
    onCancel: () => void;
    hasTeamsContext: boolean;
    styles: { timeLog: string; teams?: string; container: string };
}

export const UserSettings: React.FC<IUserSettingsProps> = (props) => {
    const { tempSettings, isSaving, onChange, onSave, onCancel, hasTeamsContext, styles } = props;

    return (
        <section className={`${styles.timeLog} ${hasTeamsContext ? styles.teams : ''}`}>
            <div className={styles.container}>
                <h2>User Settings</h2>
                <p>Configure your default daily schedule. These times will be used when generating new pay periods.</p>
                
                <div style={{ maxWidth: 400, marginTop: 20 }}>
                    <TextField 
                        label="Default Time In" 
                        type="time" 
                        value={tempSettings?.DefaultTimeIn} 
                        onChange={(e, v) => onChange('DefaultTimeIn', v || '')} 
                    />
                    <TextField 
                        label="Default Lunch Out" 
                        type="time" 
                        value={tempSettings?.DefaultLunchOut} 
                        onChange={(e, v) => onChange('DefaultLunchOut', v || '')} 
                    />
                    <TextField 
                        label="Default Lunch In" 
                        type="time" 
                        value={tempSettings?.DefaultLunchIn} 
                        onChange={(e, v) => onChange('DefaultLunchIn', v || '')} 
                    />
                    <TextField 
                        label="Default Time Out" 
                        type="time" 
                        value={tempSettings?.DefaultTimeOut} 
                        onChange={(e, v) => onChange('DefaultTimeOut', v || '')} 
                    />

                    <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                        <PrimaryButton text="Save Settings" onClick={onSave} disabled={isSaving} />
                        <PrimaryButton text="Cancel" onClick={onCancel} styles={{ root: { backgroundColor: '#888', border: 'none' } }} />
                    </div>
                </div>
            </div>
        </section>
    );
};
