import Link from "next/link";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
  children?: ReactNode;
}

// Reusable empty-state panel for the admin area (dashboard, filtered lists, etc.).
export function EmptyState({ title, description, actionLabel, actionHref, icon = "🎯", children }: EmptyStateProps) {
  return (
    <section className="rounded-xl border bg-white p-8 text-center space-y-3">
      <div className="text-5xl">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="text-sm text-zinc-600 max-w-md mx-auto">{description}</p>
      ) : null}
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="btn-brand inline-block">
          {actionLabel}
        </Link>
      ) : null}
      {children ? <div className="flex justify-center pt-1">{children}</div> : null}
    </section>
  );
}

export default EmptyState;
