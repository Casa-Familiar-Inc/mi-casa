"use client";

import { useState } from "react";

import { CircleHelp } from "lucide-react";

import { InputPassword } from "@/components/refine-ui/form/input-password";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLink, useLogin, useRefineOptions } from "@refinedev/core";

export const SignInForm = () => {
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const Link = useLink();

  const { title } = useRefineOptions();

  const { mutate: login } = useLogin();

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    login({
      email,
      password,
    });
  };

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
      <div className="mb-8">
          {/* Logo could go here if available */}
          <h1 className="text-2xl font-bold text-center">Casa Familiar HR</h1>
      </div>

      <Card className={cn("sm:w-[400px]", "p-8")}>
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
      </Card>
    </div>
  );
};

SignInForm.displayName = "SignInForm";
