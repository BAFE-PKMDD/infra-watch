import Link from "next/link";
import { RegionalStatistics } from "@/components/admin/operations/regional-statistics";
export default function Page() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold sm:text-3xl">
        Reported regional figures
      </h1>
      <p className="max-w-3xl text-sm leading-7">
        Regional statistics published by staff from cited source documents. Each
        record identifies its program, funding year, and assessment date.
      </p>
      <Link
        href="/infra-analytics"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline"
      >
        Open live infrastructure analytics
      </Link>
      <RegionalStatistics />
    </div>
  );
}
