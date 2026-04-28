import Link from "next/link";
import { LoginForm } from "./LoginForm";

type Props = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    message?: string;
  }>;
};

export default async function TeacherLoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="rounded-lg border border-neutral-300 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Teacher sign in</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Use the account your admin set with role{" "}
          <code className="rounded bg-neutral-100 px-1">teacher</code> in
          Supabase Auth app metadata.
        </p>
        <LoginForm
          nextPath={sp.next}
          initialError={sp.error}
          initialMessage={sp.message}
        />
        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-blue-700 underline">
            Student home
          </Link>
        </p>
      </div>
    </div>
  );
}
