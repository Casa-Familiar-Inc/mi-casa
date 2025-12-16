import React from 'react';
import { cn } from "@/lib/utils";

interface ActionToolbarProps {
    title?: React.ReactNode;
    startActions?: React.ReactNode;
    endActions?: React.ReactNode;
    className?: string;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({ 
    title, 
    startActions, 
    endActions, 
    className 
}) => {
    return (
        <div className={cn(
            "flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-card rounded-lg shadow-sm border text-card-foreground gap-4 sticky top-0 z-10", 
            className
        )}>
            <div className="flex items-center gap-4">
                {title && (
                    <div className="text-xl font-bold">
                        {title}
                    </div>
                )}
                {startActions && (
                    <div className="flex items-center gap-2">
                        {startActions}
                    </div>
                )}
            </div>
            
            {endActions && (
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {endActions}
                </div>
            )}
        </div>
    );
};
