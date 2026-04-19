import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCF8] px-4">
      <SignIn />
    </div>
  );
}
