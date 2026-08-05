import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function SignUpPage() {
  return (
    <div className="bg-background min-h-[100dvh] flex flex-col items-center justify-center p-6 md:p-10 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="flex w-full max-w-sm flex-col gap-6 relative z-10 animate-in fade-in-0 zoom-in-95 duration-200">
        <Link href="/" className="flex items-center gap-2 self-center transition-transform duration-150 ease-out active:scale-[0.97]">
          <Brand className="h-9" />
        </Link>
        <Suspense fallback={<div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading form...</div>}>
          <LoginForm mode="signup" />
        </Suspense>
      </div>
    </div>
  );
}
