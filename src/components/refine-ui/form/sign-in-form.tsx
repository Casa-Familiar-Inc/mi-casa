"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLink, useLogin, useRefineOptions } from "@refinedev/core";

export const SignInForm = () => {
  const { mutate: login } = useLogin();

  const handleSignInWithMicrosoft = () => {
    login({ provider: "microsoft" });
  };

  return (
    <div
      className={cn(
        "flex",
        "flex-col",
        "items-center",
        "justify-center",
        "px-6",
        "py-8",
        "min-h-svh",
        "bg-muted/40"
      )}
    >
      <div className="mb-6 flex flex-col items-center">
          <img src="/casa_logo.png" alt="Casa Familiar Logo" className="h-40 w-auto mb-6" />
          <h1 className="text-2xl font-bold text-center text-[#224193]">Casa Familiar Community Hub</h1>
      </div>

      <Card className={cn("sm:w-[400px]", "p-0 overflow-hidden border-t-0")}> 
        {/* Brand Accent Bar */}
        <div className="flex h-2 w-full">
            <div className="flex-1 bg-[#224193]" title="Integrity"></div>
            <div className="flex-1 bg-[#E21B29]" title="Family"></div>
            <div className="flex-1 bg-[#22AB6E]" title="Culture"></div>
            <div className="flex-1 bg-[#ECBD43]" title="Respect"></div>
        </div>
        <div className="p-8 pt-6">
        <CardHeader className={cn("px-0 items-center")}>
          <CardTitle className="text-xl">Authentication Required</CardTitle>
          <CardDescription>
            Please sign in with your corporate account.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0 py-6">
            <Button
              size="lg"
              className={cn("flex", "items-center", "gap-3", "w-full")}
              onClick={handleSignInWithMicrosoft}
              type="button"
            >
              <svg
                width="21"
                height="20"
                viewBox="0 0 21 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="1" y="1" width="9" height="9" fill="#F35325" />
                <rect x="11" y="1" width="9" height="9" fill="#81BC06" />
                <rect x="1" y="11" width="9" height="9" fill="#05A6F0" />
                <rect x="11" y="11" width="9" height="9" fill="#FFBA08" />
              </svg>
              <span>Sign in with Microsoft</span>
            </Button>
        </CardContent>
      </div> 
      </Card>
    </div>
  );
};

SignInForm.displayName = "SignInForm";
