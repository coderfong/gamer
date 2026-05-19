import Link from "next/link";
import { signupAction } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5">
        <h1 className="text-2xl font-bold text-center">Create your account</h1>

        {searchParams.error ? (
          <p className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-900">
            {searchParams.error}
          </p>
        ) : null}

        <form action={signupAction} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Brand name</label>
            <input
              name="brand_name"
              type="text"
              required
              maxLength={120}
              className="w-full rounded-lg border px-3 py-2"
              placeholder="Acme Coffee"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input name="email" type="email" required className="w-full rounded-lg border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <button type="submit" className="btn-brand w-full">Create account</button>
        </form>

        <p className="text-sm text-center text-zinc-600">
          Already have an account? <Link href="/login" className="underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
