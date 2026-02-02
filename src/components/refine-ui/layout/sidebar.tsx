"use client";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent as ShadcnSidebarContent,
  SidebarHeader as ShadcnSidebarHeader,
  SidebarRail as ShadcnSidebarRail,
  SidebarTrigger as ShadcnSidebarTrigger,
  SidebarFooter as ShadcnSidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar as useShadcnSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  useLink,
  useMenu,
  useRefineOptions,
  type TreeMenuItem,
  useActiveAuthProvider,
  useLogout,
  useGetIdentity,
  useCan
} from "@refinedev/core";
import { ChevronRight, ListIcon, LogOutIcon, ChevronsUpDown, Sparkles, User, Settings } from "lucide-react";
import React from "react";
import { UserAvatar } from "@/components/refine-ui/layout/user-avatar";
import { useAuthStore } from "@/stores/authStore";


// --- CONFIGURATION ---

const GROUP_CONFIG = [
    // {
    //     label: "Operations",
    //     resources: ["TimeSheets"],
    // },
    {
        label: "Human Resources",
        resources: ["TimeOff", "TimeOffApprovals", "CompanyCalendar", "TimeSheets"],
    },
    {
         label: "Supervisor",
         resources: ["Supervisor"],
    },
    {
        label: "Administration",
        resources: ["employees", "departments"],
    }
];

export function Sidebar() {
  const { menuItems, selectedKey } = useMenu();
  const { allowedScreens, userRole } = useAuthStore();

  // --- RECURSIVE FLATTENING ---
  const flattenMenuItems = (items: TreeMenuItem[]): TreeMenuItem[] => {
    return items.reduce((acc: TreeMenuItem[], item) => {
        acc.push(item);
        if (item.children) {
            acc.push(...flattenMenuItems(item.children));
        }
        return acc;
    }, []);
  };

  const flatItems = flattenMenuItems(menuItems);

  // Helper to check if a resource is even "vaguely" permitted for this user
  // This is synchronous and mirrors the CASL logic for Sidebar headers
  const isResourceAuthorized = (resourceName: string) => {
      if (userRole === 'admin') return true;
      if (userRole === 'hr' && ["TimeOff", "TimeSheets", "employees"].includes(resourceName)) return true;
      if (resourceName === 'dashboard') return true;
      
      // Check granular matrix
      return allowedScreens.some(s => s === resourceName || s.startsWith(`${resourceName}:`));
  };

  // Helper to get items for our custom sections
  const getItemsForGroup = (resourceNames: string[]) => {
      return flatItems.filter(item => {
          const isMatched = resourceNames.includes(item.name);
          return isMatched && isResourceAuthorized(item.name);
      });
  };

  return (
    <ShadcnSidebar collapsible="icon" className={cn("border-r")}>
      <SidebarHeader />
      
      <ShadcnSidebarContent className="py-2">
            {GROUP_CONFIG.map(group => {
                const groupedItems = getItemsForGroup(group.resources);
                
                // Only show group if it has items the user is authorized to see at all
                if (groupedItems.length === 0) return null;

                return (
                    <SidebarGroup key={group.label} className="py-0">
                        <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-bold py-2">{group.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {groupedItems.map((item: TreeMenuItem) => (
                                     <SidebarItem 
                                        key={item.key || item.name} 
                                        item={item} 
                                        selectedKey={selectedKey} 
                                     />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                );
            })}

            {/* Dashboards / General items */}
            <SidebarGroup className="py-0">
                {(() => {
                    const groupedResourceNames = GROUP_CONFIG.flatMap(g => g.resources);
                    const otherItems = menuItems.filter(item => 
                        !groupedResourceNames.includes(item.name) && 
                        !item.children?.length &&
                        isResourceAuthorized(item.name || 'dashboard')
                    );
                    
                    if (otherItems.length === 0) return null;

                    return (
                        <>
                            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-bold py-2">General</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {otherItems.map((item: TreeMenuItem) => (
                                        <SidebarItem 
                                            key={item.key || item.name} 
                                            item={item} 
                                            selectedKey={selectedKey} 
                                        />
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </>
                    );
                })()}
            </SidebarGroup>
      </ShadcnSidebarContent>

      <SidebarFooter />
      <ShadcnSidebarRail />
    </ShadcnSidebar>
  );
}

// --- ITEM COMPONENTS ---

type MenuItemProps = {
  item: TreeMenuItem;
  selectedKey?: string;
};

function SidebarItem({ item, selectedKey }: MenuItemProps) {
    const isSelected = item.key === selectedKey;
    const Link = useLink();

    return (
        <SidebarMenuItem>
            <SidebarMenuButton 
                asChild 
                isActive={isSelected} 
                tooltip={item.label ?? item.name}
                className={cn(
                    "h-9",
                    isSelected ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" : ""
                )}
            >
                <Link to={item.route || ''}>
                    <ItemIcon icon={item.icon ?? item.meta?.icon} isSelected={isSelected} />
                    <span>{item.label ?? item.name}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

// --- HEADER & FOOTER ---

function SidebarHeader() {
  const { open } = useShadcnSidebar();

  return (
    <ShadcnSidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 px-1 py-1 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
             <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                <img src="/casa_logo.png" alt="Logo" className="w-full h-full object-contain" />
             </div>
             <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-[#224193]">Community Hub</span>
                <span className="truncate text-xs">Casa Familiar</span>
             </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
      
       {/* Brand Strip */}
       <div className="absolute bottom-0 w-full left-0 opacity-50">
            <div className="flex w-full h-[2px]">
                <div className="flex-1 bg-[#224193]"></div>
                <div className="flex-1 bg-[#E21B29]"></div>
                <div className="flex-1 bg-[#22AB6E]"></div>
                <div className="flex-1 bg-[#ECBD43]"></div>
            </div>
       </div>
    </ShadcnSidebarHeader>
  );
}

function SidebarFooter() {
    const { mutate: logout } = useLogout();
    const { data: identity } = useGetIdentity<{ name: string; email: string; avatar?: string }>();
    const { isMobile } = useShadcnSidebar();
    
    const name = identity?.name || 'User';
    const email = identity?.email || '';
    
    return (
        <ShadcnSidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                                size="lg"
                                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                                <UserAvatar className="h-8 w-8 rounded-lg" />
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{name}</span>
                                    <span className="truncate text-xs">{email}</span>
                                </div>
                                <ChevronsUpDown className="ml-auto size-4" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                            side={isMobile ? "bottom" : "right"}
                            align="end"
                            sideOffset={4}
                        >
                            <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                                <UserAvatar className="h-8 w-8 rounded-lg" />
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{name}</span>
                                    <span className="truncate text-xs">{email}</span>
                                </div>
                            </div>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                Account Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => logout()}>
                                <LogOutIcon className="mr-2 h-4 w-4" />
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
        </ShadcnSidebarFooter>
    );
}

// Helper
function ItemIcon({ icon, isSelected }: { icon: React.ReactNode; isSelected: boolean }) {
    return (
        <div className={cn("w-4 h-4 mr-2", isSelected ? "text-sidebar-primary-foreground" : "text-muted-foreground")}>
          {icon ?? <ListIcon className="w-4 h-4" />}
        </div>
    );
}

Sidebar.displayName = "Sidebar";
