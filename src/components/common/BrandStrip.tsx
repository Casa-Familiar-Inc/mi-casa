import React from 'react';
import { cn } from '@/lib/utils';

interface BrandStripProps {
    className?: string;
    height?: string;
}

export const BrandStrip: React.FC<BrandStripProps> = ({ className, height = "h-1" }) => {
    return (
        <div className={cn("flex w-full", height, className)}>
            <div className="flex-1 bg-[#224193]" title="Integrity"></div>
            <div className="flex-1 bg-[#E21B29]" title="Family"></div>
            <div className="flex-1 bg-[#22AB6E]" title="Culture"></div>
            <div className="flex-1 bg-[#ECBD43]" title="Respect"></div>
        </div>
    );
};
