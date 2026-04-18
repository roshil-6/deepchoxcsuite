import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCF8] px-4">
      <div className="max-w-md w-full text-center space-y-5">
        <p className="text-6xl font-light text-[#2C1B18]/20 tracking-tight">404</p>
        <h1 className="text-xl font-semibold text-[#2C1B18]">Page not found</h1>
        <p className="text-sm text-[#2C1B18]/60">
          This page doesn&apos;t exist or was moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#2C1B18] text-[#FDFCF8] text-sm font-medium hover:bg-[#2C1B18]/80 transition-colors"
        >
          Back to Deepchox
        </Link>
      </div>
    </div>
  );
}
