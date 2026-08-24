import { signOutFormAction } from "@/app/login/actions";

import { cn } from "@nsd/ui/utils";

type SignOutButtonProps = {
  label: string;
  variant?: "menu" | "link";
};

export function SignOutButton({ label, variant = "menu" }: SignOutButtonProps) {
  return (
    <form action={signOutFormAction}>
      <button
        type="submit"
        className={cn(
          "text-sm",
          variant === "link"
            ? "hover:underline"
            : "w-full rounded-md px-2 py-1.5 text-left text-foreground hover:bg-muted",
        )}
      >
        {label}
      </button>
    </form>
  );
}
