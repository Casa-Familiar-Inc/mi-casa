"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useLogin, useLink } from "@refinedev/core";
import { useState } from "react";

export const SignInForm = () => {
  const { mutate: login, isPending } = useLogin();
  const Link = useLink();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignInWithMicrosoft = () => {
    login({ provider: "microsoft" });
  };

  const handleSignInWithEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    login({ email, password });
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
            <form onSubmit={handleSignInWithEmail} className="grid gap-4 mb-4">
              <div className="grid gap-2 text-left">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@casafamiliar.org"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2 text-left">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="lg"
              className={cn("flex", "items-center", "gap-3", "w-full")}
              onClick={handleSignInWithMicrosoft}
              type="button"
              disabled={isPending}
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
              <span>Microsoft</span>
            </Button>
          </CardContent>

          <div className={cn("w-full", "text-center text-sm pb-6")}>
            <span className={cn("text-muted-foreground")}>
              Don&apos;t have an account?{" "}
            </span>
            <Link
              to="/register"
              className={cn(
                "text-blue-600",
                "dark:text-blue-400",
                "font-semibold",
                "underline"
              )}
            >
              Sign up
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};

SignInForm.displayName = "SignInForm";
