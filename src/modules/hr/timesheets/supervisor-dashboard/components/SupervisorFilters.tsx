
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface FilterProps {
    search: string;
    onSearchChange: (val: string) => void;
    // Add date range later if needed
}

export const SupervisorFilters: React.FC<FilterProps> = ({ search, onSearchChange }) => {
    return (
        <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by employee..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            {/* Future: Date Range Picker */}
        </div>
    );
};
