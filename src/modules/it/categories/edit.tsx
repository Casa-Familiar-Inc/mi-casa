import { useEffect } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useGo } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ITCategoryEdit = () => {
    const go = useGo();
    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        refineCore: { query, onFinish, formLoading },
    } = useForm({
        refineCoreProps: {
            resource: "IT_Category",
            action: "edit",
            redirect: "list",
        },
    });

    const categoryData = query?.data?.data;

    useEffect(() => {
        if (categoryData?.type) {
            setValue("type", categoryData.type);
        }
    }, [categoryData, setValue]);

    return (
        <div className="p-4 max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <Button variant="outline" onClick={() => go({ to: "/it-category" })}>
                    Back to List
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Edit Category: {categoryData?.name}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={handleSubmit((data) => {
                            onFinish(data as any);
                        })}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="e.g. Laptop"
                                {...register("name", { required: "Name is required" })}
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500">{errors.name.message as string}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Type</Label>
                            <Select
                                onValueChange={(value) => setValue("type", value)}
                                defaultValue={categoryData?.type}
                                key={categoryData?.type}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Hardware">Hardware</SelectItem>
                                    <SelectItem value="Software">Software</SelectItem>
                                    <SelectItem value="Service">Service</SelectItem>
                                    <SelectItem value="Consumable">Consumable</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="prefix">Prefix</Label>
                            <Input
                                id="prefix"
                                type="text"
                                placeholder="e.g. LAP"
                                {...register("prefix")}
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={formLoading}>
                                {formLoading ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
