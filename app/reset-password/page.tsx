import Link from "next/link";
import { resetPasswordRequestAction } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5">
        <h1 className="text-2xl font-bold text-center">Reset password</h1>

        {searchParams.message === "sent" ? (
          <p className="rounded bg-green-50 border border-green-200 p-3 text-sm text-green-900">
            If that email exists, we&apos;ve sent a reset link.
          </p>
        ) : null}
        {searchParams.error ? (
          <p className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-900">
            {searchParams.error}
          </p>
        ) : null}

        <form action={resetPasswordRequestAction} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input name="email" type="email" required className="w-full rounded-lg border px-3 py-2" />
          </div>
          <button type="submit" className="btn-brand w-full">Send reset link</button>
        </form>

        <p className="text-sm text-center text-zinc-600">
          <Link href="/login" className="underline">Back to log in</Link>
        </p>
      </div>
    </main>
  );
}
