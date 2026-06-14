import { signOutFormAction } from "@/app/login/actions";

type SignOutButtonProps = {
  label: string;
};

export function SignOutButton({ label }: SignOutButtonProps) {
  return (
    <form action={signOutFormAction}>
      <button type="submit" className="hover:underline">
        {label}
      </button>
    </form>
  );
}
