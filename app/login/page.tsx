import Link from "next/link";
import { loginAction } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string; message?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5">
        <h1 className="text-2xl font-bold text-center">Log in</h1>

        {searchParams.message === "check-email" ? (
          <p className="rounded bg-green-50 border border-green-200 p-3 text-sm text-green-900">
            Check your email to confirm your account, then log in.
          </p>
        ) : null}
        {searchParams.error ? (
          <p className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-900">
            {searchParams.error}
          </p>
        ) : null}

        <form action={loginAction} className="space-y-3">
          <input type="hidden" name="next" value={searchParams.next ?? "/dashboard"} />
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input name="email" type="email" required className="w-full rounded-lg border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input name="password" type="password" required className="w-full rounded-lg border px-3 py-2" />
          </div>
          <button type="submit" className="btn-brand w-full">Log in</button>
        </form>

        <div className="text-sm text-center text-zinc-600 space-y-1">
          <div>
            <Link href="/reset-password" className="underline">Forgot password?</Link>
          </div>
          <div>
            New here? <Link href="/signup" className="underline">Create an account</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
