import { useGo, useList, useDelete } from "@refinedev/core";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Edit, Eye, Plus, Trash2 } from "lucide-react";
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

export const ITCategoryList = () => {
    const go = useGo();
    const { mutate: deleteCategory } = useDelete();

    const columns: ColumnDef<any>[] = [
        {
            id: "name",
            accessorKey: "name",
            header: "Name",
        },
        {
            id: "type",
            accessorKey: "type",
            header: "Type",
        },
        {
            id: "prefix",
            accessorKey: "prefix",
            header: "Prefix",
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
                            onClick={() => go({ to: { resource: "IT_Category", action: "edit", id: getValue() as string } })}
                        >
                            <Edit size={16} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => go({ to: { resource: "IT_Category", action: "show", id: getValue() as string } })}
                        >
                            <Eye size={16} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                                if (window.confirm("Are you sure you want to delete this category?")) {
                                    deleteCategory({
                                        resource: "IT_Category",
                                        id: getValue() as string,
                                    });
                                }
                            }}
                        >
                            <Trash2 size={16} />
                        </Button>
                    </div>
                );
            },
        },
    ];

    const { result } = useList({
        resource: "IT_Category",
    });

    const categoryData = result?.data ?? [];

    const table = useReactTable({
        data: categoryData,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Categories</h1>
                <Button onClick={() => go({ to: { resource: "IT_Category", action: "create" } })}>
                    <Plus className="mr-2 h-4 w-4" /> Create Category
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Categories</CardTitle>
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
