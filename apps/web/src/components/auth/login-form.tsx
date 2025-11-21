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
  const [showResendVerification, setShowResendVerification] = useState(false);
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

  const handleResendVerification = async () => {
    setIsLoading(true);
    const formValues = signinForm.getValues();
    const email = formValues.email;

    await authClient.sendVerificationEmail(
      {
        email,
        callbackURL: "/dashboard",
      },
      {
        onError: (ctx) => {
          console.error("Resend verification error:", ctx.error);
          showError(ctx.error.message || "Failed to send verification email");
          setIsLoading(false);
        },
        onSuccess: () => {
          showSuccess("Verification email sent! Please check your inbox.");
          setShowResendVerification(false);
          setIsLoading(false);
        },
      },
    );
  };

  const handleSubmit = async (data: UserSignup | UserLogin) => {
    setIsLoading(true);
    setShowResendVerification(false);

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
            showSuccess(
              "Account created! Please check your email to verify your account before signing in.",
            );
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

            // Handle email verification error specifically
            if (ctx.error.status === 403) {
              showError(
                "Your email is not verified. A new verification link has been sent to your email. Please check your inbox and use the latest link."
              );
            } else {
              showError(
                ctx.error.message || "An error occurred during sign in",
              );
            }
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

  const handleGoogleSignIn = async () => {
    const redirectTo = searchParams.get("redirect") || "/dashboard";
    await authClient.signIn.social(
      {
        provider: "google",
        callbackURL: redirectTo,
      },
      {
        onError: (ctx) => {
          console.error("Google sign in error:", ctx.error);
          showError(ctx.error.message || "Google sign in failed");
        },
      },
    );
  };

  const handleGithubSignIn = async () => {
    const redirectTo = searchParams.get("redirect") || "/dashboard";
    await authClient.signIn.social(
      {
        provider: "github",
        callbackURL: redirectTo,
      },
      {
        onError: (ctx) => {
          console.error("GitHub sign in error:", ctx.error);
          showError(ctx.error.message || "GitHub sign in failed");
        },
      },
    );
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
              ? "Sign up with your email or social account"
              : "Login with your email or social account"}
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
              <div className="flex flex-col gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Continue with Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGithubSignIn}
                  disabled={isLoading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                      fill="currentColor"
                    />
                  </svg>
                  Continue with GitHub
                </Button>
              </div>
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Or continue with
                </span>
              </div>
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
