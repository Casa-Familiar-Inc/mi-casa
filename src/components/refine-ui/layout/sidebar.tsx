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


export function Sidebar() {
  const { open } = useShadcnSidebar();
  const { menuItems, selectedKey } = useMenu();

  return (
    <ShadcnSidebar collapsible="icon" className={cn("border-r")}>
      <SidebarHeader />
      
      <ShadcnSidebarContent>
            {/* Main Menu Items */}
            <SidebarGroup>
                <SidebarGroupLabel>Platform</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {menuItems.map((item: TreeMenuItem) => (
                             <SidebarItem 
                                key={item.key || item.name} 
                                item={item} 
                                selectedKey={selectedKey} 
                             />
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
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
    const { open } = useShadcnSidebar();

    // If item has children -> Collapsible Menu
    if(item.children && item.children.length > 0) {
        // Check if any child is selected to auto-expand
        const isChildSelected = item.children.some(c => c.key === selectedKey);
        
        return (
            <Collapsible asChild defaultOpen={isSelected || isChildSelected} className="group/collapsible">
                <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.label ?? item.name} isActive={isSelected}>
                            <ItemIcon icon={item.icon ?? item.meta?.icon} isSelected={isSelected} />
                            <span>{item.label ?? item.name}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            {item.children.map(child => (
                                <SidebarMenuSubItem key={child.key}>
                                    <SidebarMenuSubButton asChild isActive={child.key === selectedKey}>
                                        <Link to={child.route || ''}>
                                            <span>{child.label ?? child.name}</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </SidebarMenuItem>
            </Collapsible>
        );
    }

    // --- MANUAL ACCESS CONTROL CHECK ---
    const { data: canAccess } = useCan({
        resource: item.name,
        action: "list",
        queryOptions: {
            enabled: !!item.name, // Only check if name exists
        }
    });

    // If Access Control says NO, hide this item.
    // Note: useMenu() *should* do this, but if it fails, this is our safety net.
    if (canAccess?.can === false) {
        return null; 
    }

    // Standard Link Item
    return (
        <SidebarMenuItem>
            <SidebarMenuButton 
                asChild 
                isActive={isSelected} 
                tooltip={item.label ?? item.name}
                className={cn(
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
    
    // Fallback if identity not loaded yet
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
