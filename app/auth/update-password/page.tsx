import { updatePasswordAction } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

// User lands here from the reset-password email link. Supabase sets a
// session cookie via the link's recovery code (handled by the SSR client
// in middleware via getUser()). Submitting the form calls updateUser.
export default function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5">
        <h1 className="text-2xl font-bold text-center">Set new password</h1>

        {searchParams.error ? (
          <p className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-900">
            {searchParams.error}
          </p>
        ) : null}

        <form action={updatePasswordAction} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">New password</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <button type="submit" className="btn-brand w-full">Save password</button>
        </form>
      </div>
    </main>
  );
}
