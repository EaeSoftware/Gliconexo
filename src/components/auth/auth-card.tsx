import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-foreground/70">{description}</p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6">{children}</div>
      {footer ? <div className="text-center text-sm text-foreground/70">{footer}</div> : null}
    </div>
  );
}
