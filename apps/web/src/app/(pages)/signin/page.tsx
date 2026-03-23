import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function SignInPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10 relative">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center font-medium">
          <img src="/logo.svg" alt="Squad Draw" className="w-40 h-auto" />
        </a>
        <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading...</div>}>
          <LoginForm mode="signin" />
        </Suspense>
      </div>
    </div>
  );
}
