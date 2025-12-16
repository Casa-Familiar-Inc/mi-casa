import { useShow, useGo } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export const ITCategoryShow = () => {
    const go = useGo();
    const { query } = useShow({
        resource: "IT_Category",
    });
    const { data, isLoading } = query;
    const record = data?.data;

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-4 max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <Button variant="outline" onClick={() => go({ to: "/it-category" })}>
                    Back to List
                </Button>
                <Button onClick={() => go({ to: `/it-category/edit/${record?.id}` })}>
                    Edit
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Category Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground">ID</Label>
                            <div className="font-medium">{record?.id}</div>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Name</Label>
                            <div className="font-medium">{record?.name}</div>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Type</Label>
                            <div className="font-medium">{record?.type}</div>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Prefix</Label>
                            <div className="font-medium">{record?.prefix || "-"}</div>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Created</Label>
                            <div className="font-medium">{record?.created ? new Date(record.created).toLocaleString() : "-"}</div>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Updated</Label>
                            <div className="font-medium">{record?.updated ? new Date(record.updated).toLocaleString() : "-"}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
