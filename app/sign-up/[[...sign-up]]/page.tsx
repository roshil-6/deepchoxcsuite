import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCF8] px-4">
      <SignUp />
    </div>
  );
}
