import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-start justify-center gap-4 px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">404 · Not found</p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">That page is not available.</h1>
      <p className="max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">The requested resource may be unpublished, outside your scope, or no longer available.</p>
      <Link href="/" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Return home</Link>
    </main>
  );
}
