import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-xl text-center space-y-4">
        <h1 className="text-3xl font-bold">Gamer</h1>
        <p className="text-zinc-600">
          Branded prize-game campaign platform. Phase 1 scaffold.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/play/test-campaign" className="btn-brand">Play test campaign</Link>
          <Link href="/login" className="rounded-lg border px-5 py-3 font-semibold">Log in</Link>
        </div>
      </div>
    </main>
  );
}
