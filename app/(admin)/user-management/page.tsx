import { Suspense } from "react";
import { UserManagementClient } from "@/components/admin/user-management/user-management-client";
import { UserManagementSkeleton } from "@/components/admin/user-management/user-management-skeleton";
import { getAllUsers, getUserStats, getRegions } from "@/actions/query/users.query";

async function UsersData({
  search,
  role,
  status,
  page,
  limit,
}: {
  search?: string;
  role?: string;
  status?: "active" | "banned";
  page: number;
  limit: number;
}) {
  const offset = (page - 1) * limit;

  try {
    const [usersData, stats, regions] = await Promise.all([
      getAllUsers({
        search,
        role,
        status,
        limit,
        offset,
      }),
      getUserStats(),
      getRegions(),
    ]);

    return (
      <UserManagementClient
        initialUsers={usersData.users}
        stats={stats}
        total={usersData.total}
        currentPage={page}
        limit={limit}
        regions={regions}
      />
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return (
        <div className="flex flex-col h-full items-center justify-center p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
              Access Denied
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300">
              You don't have permission to access user management.
            </p>
          </div>
        </div>
      );
    }

    throw error;
  }
}

export default async function UserManagementPage(props: {
  searchParams: Promise<{ search?: string; role?: string; status?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const limit = 10;

  return (
    <Suspense fallback={<UserManagementSkeleton />}>
      <UsersData
        search={searchParams.search}
        role={searchParams.role}
        status={searchParams.status as "active" | "banned"}
        page={page}
        limit={limit}
      />
    </Suspense>
  );
}
