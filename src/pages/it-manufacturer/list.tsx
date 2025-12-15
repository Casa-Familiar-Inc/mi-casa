import { useGo, useList } from "@refinedev/core";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Edit, Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ITManufacturerList = () => {
    const go = useGo();
    const columns: ColumnDef<any>[] = [
        {
            id: "name",
            accessorKey: "name",
            header: "Name",
        },
        {
            id: "support_url",
            accessorKey: "support_url",
            header: "Support URL",
            cell: ({ getValue }) => {
                const url = getValue() as string;
                return url ? <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{url}</a> : "-";
            }
        },
        {
            id: "support_phone",
            accessorKey: "support_phone",
            header: "Support Phone",
        },
        {
            id: "actions",
            accessorKey: "id",
            header: "Actions",
            cell: function render({ getValue }) {
                return (
                    <div className="flex gap-2">
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => go({ to: { resource: "IT_Manufacturer", action: "edit", id: getValue() as string } })}
                        >
                            <Edit size={16} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => go({ to: { resource: "IT_Manufacturer", action: "show", id: getValue() as string } })}
                        >
                            <Eye size={16} />
                        </Button>
                    </div>
                );
            },
        },
    ];

    const { result } = useList({
        resource: "IT_Manufacturer",
    });

    const manufacturerData = result?.data ?? [];

    const table = useReactTable({
        data: manufacturerData,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manufacturers</h1>
                <Button onClick={() => go({ to: { resource: "IT_Manufacturer", action: "create" } })}>
                    <Plus className="mr-2 h-4 w-4" /> Create Manufacturer
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Manufacturers</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef.header,
                                                      header.getContext()
                                                  )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
