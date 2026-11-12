import { Suspense } from "react";
import { AuthForm } from "@/components/app/auth-form";

export const metadata = { title: "Logowanie" };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
