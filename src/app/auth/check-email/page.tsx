import Link from "next/link";
import Image from "next/image";

type CheckEmailPageProps = {
  searchParams?: {
    email?: string;
    callbackUrl?: string;
  };
};

export default function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const email = searchParams?.email;
  const callbackUrl = searchParams?.callbackUrl || "/dashboard";

  return (
    <main className="min-h-screen bg-gradient-to-b from-lime-50 to-white text-slate-900">
      {/* Top bar – match landing header */}
      <header
        className="border-b border-slate-200"
        style={{ backgroundColor: "#faf8f4" }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="relative h-24 w-24 sm:h-28 sm:w-28">
            <Image
              src="/aing-logo.png"
              alt="And It's No Good logo"
              fill
              className="object-contain"
              priority
            />
          </div>

          <Link
            href="/login"
            className="hidden sm:inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-2 text-base font-semibold text-slate-800 shadow-sm hover:border-lime-400 hover:text-lime-700 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
            <div className="space-y-3 mb-6">
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
                Check your email for a magic link
              </h1>
              <p className="text-base text-slate-700 leading-relaxed">
                We just sent a secure sign-in link
                {email ? (
                  <>
                    {" "}
                    to <span className="font-semibold">{email}</span>
                  </>
                ) : null}
                . Click that link on this device to jump into your Kicker League
                dashboard.
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <p>
                If you don&apos;t see the email, check your spam or promotions
                folder. Sometimes it can take a minute to arrive.
              </p>
              <p>
                After you click the link, we&apos;ll send you to{" "}
                <span className="font-medium">{callbackUrl}</span>.
              </p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
              <Link
                href={{
                  pathname: "/",
                  query: { callbackUrl },
                }}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:border-lime-400 hover:text-lime-700 transition-colors w-full sm:w-auto"
              >
                Try a different email
              </Link>
              <Link
                href="/"
                className="text-slate-500 hover:text-slate-700 underline underline-offset-4"
              >
                Back to landing
              </Link>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            If the link doesn&apos;t work, request a new one from the landing
            page. For security, each magic link expires after a short time or
            once it&apos;s used.
          </p>
        </div>
      </div>
    </main>
  );
}
