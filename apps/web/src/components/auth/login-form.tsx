"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useNotificationStore } from "@/store/notification.store";
import {
  UserSignupSchema,
  UserLoginSchema,
  type UserSignup,
  type UserLogin,
} from "@/schemas/index";

interface LoginFormProps extends React.ComponentProps<"div"> {
  mode?: "signin" | "signup";
}

export function LoginForm({
  className,
  mode = "signin",
  ...props
}: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError, showSuccess } = useNotificationStore();

  const isSignUp = mode === "signup";

  const signupForm = useForm<UserSignup>({
    resolver: zodResolver(UserSignupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const signinForm = useForm<UserLogin>({
    resolver: zodResolver(UserLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });



  const handleSubmit = async (data: UserSignup | UserLogin) => {
    setIsLoading(true);

    if (isSignUp) {
      const signupData = data as UserSignup;
      await authClient.signUp.email(
        {
          email: signupData.email,
          password: signupData.password,
          name: signupData.name,
        },
        {
          onError: (ctx) => {
            console.error("Sign up error:", ctx.error);
            showError(ctx.error.message || "An error occurred during sign up");
            setIsLoading(false);
          },
          onSuccess: () => {
            showSuccess("Account created successfully!");
            const redirectTo = searchParams.get("redirect") || "/dashboard";
            router.push(redirectTo);
            setIsLoading(false);
          },
        },
      );
    } else {
      const signinData = data as UserLogin;
      await authClient.signIn.email(
        {
          email: signinData.email,
          password: signinData.password,
        },
        {
          onError: (ctx) => {
            console.error("Sign in error:", ctx.error);
            console.log("Error status:", ctx.error.status);
            console.log("Error message:", ctx.error.message);

            showError(
              ctx.error.message || "An error occurred during sign in",
            );
            setIsLoading(false);
          },
          onSuccess: () => {
            const redirectTo = searchParams.get("redirect") || "/dashboard";
            router.push(redirectTo);
            setIsLoading(false);
          },
        },
      );
    }
  };



  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="relative">
        <ThemeToggle className="absolute top-4 right-4 z-10" />
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {isSignUp ? "Create an account" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? "Sign up with your email"
              : "Login with your email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={
              isSignUp
                ? signupForm.handleSubmit(handleSubmit)
                : signinForm.handleSubmit(handleSubmit)
            }
          >
            <div className="grid gap-6">

              <div className="grid gap-6">
                {isSignUp && (
                  <div className="grid gap-3">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      {...signupForm.register("name")}
                      disabled={isLoading}
                    />
                    {signupForm.formState.errors.name && (
                      <p className="text-sm text-red-500">
                        {signupForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                )}
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    {...(isSignUp
                      ? signupForm.register("email")
                      : signinForm.register("email"))}
                    disabled={isLoading}
                  />
                  {(isSignUp
                    ? signupForm.formState.errors.email
                    : signinForm.formState.errors.email) && (
                    <p className="text-sm text-red-500">
                      {
                        (isSignUp
                          ? signupForm.formState.errors.email
                          : signinForm.formState.errors.email
                        )?.message
                      }
                    </p>
                  )}
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    {!isSignUp && (
                      <a
                        href="/forgot-password"
                        className="ml-auto text-sm underline-offset-4 hover:underline"
                      >
                        Forgot your password?
                      </a>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    {...(isSignUp
                      ? signupForm.register("password")
                      : signinForm.register("password"))}
                    disabled={isLoading}
                  />
                  {(isSignUp
                    ? signupForm.formState.errors.password
                    : signinForm.formState.errors.password) && (
                    <p className="text-sm text-red-500">
                      {
                        (isSignUp
                          ? signupForm.formState.errors.password
                          : signinForm.formState.errors.password
                        )?.message
                      }
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Loading..." : isSignUp ? "Sign up" : "Login"}
                </Button>
              </div>
              <div className="text-center text-sm">
                {isSignUp
                  ? "Already have an account?"
                  : "Don't have an account?"}{" "}
                <a
                  href={isSignUp ? "/signin" : "/signup"}
                  className="underline underline-offset-4"
                >
                  {isSignUp ? "Sign in" : "Sign up"}
                </a>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
