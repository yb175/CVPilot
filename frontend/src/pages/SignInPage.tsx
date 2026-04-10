import { SignIn } from "@clerk/react";

export function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07090f]">
      <SignIn />
    </div>
  );
}