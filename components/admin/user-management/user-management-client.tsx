"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, UserPlus, Shield, Edit, Trash2, Ban, CheckCircle, LogOut, Search, MoreVertical, MapPin, Building2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createUser,
  updateUser,
  updateUserRole,
  updateUserAgency,
  updateUserRegion,
  banUser,
  unbanUser,
  deleteUser,
  verifyUserEmail,
  terminateAllUserSessions,
} from "@/actions/mutation/users.mutation";
import { UserRole } from "@/types";
import { AdminPageWrapper } from "../admin-page-wrapper";
import { AGENCY_LABELS, IMPLEMENTING_AGENCIES, type ImplementingAgency } from "@/constants/agencies";

type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
  region?: string | null;
  assignedAgency?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type Region = {
  value: string;
  label: string;
  fullName: string;
};

type Stats = {
  totalUsers: number;
  totalAdmins: number;
  totalModerators: number;
  totalCitizens: number;
  totalBanned: number;
  totalVerified: number;
};

type Props = {
  initialUsers: User[];
  stats: Stats;
  total: number;
  currentPage: number;
  limit: number;
  regions: Region[];
};

export function UserManagementClient({ initialUsers, stats, total, currentPage, limit, regions }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/user-management?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter("search", searchQuery);
  };

  const handleRoleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFilter("role", e.target.value);
  };

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFilter("status", e.target.value);
  };

  const totalPages = Math.ceil(total / limit);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/user-management?${params.toString()}`);
  };

  const handleAddUser = async (data: { name: string; email: string; password: string; role: "admin" | "moderator" | "citizen" }) => {
    startTransition(async () => {
      try {
        await createUser(data);
        setShowAddModal(false);
        toast.success("User created successfully");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create user");
      }
    });
  };

  const handleUpdateUser = async (userId: string, data: { name: string; email: string }) => {
    startTransition(async () => {
      try {
        await updateUser(userId, data);
        setShowEditModal(false);
        setSelectedUser(null);
        toast.success("User updated successfully");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update user");
      }
    });
  };

  const handleUpdateRole = async (userId: string, newRole: "admin" | "moderator" | "citizen") => {
    startTransition(async () => {
      try {
        await updateUserRole(userId, newRole);
        toast.success("User role updated successfully");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update role");
      }
    });
  };

  const handleBanUser = async (userId: string, reason: string) => {
    startTransition(async () => {
      try {
        await banUser(userId, { reason });
        setShowBanModal(false);
        toast.success("User banned successfully");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to ban user");
      }
    });
  };

  const handleUnbanUser = async (userId: string) => {
    startTransition(async () => {
      try {
        await unbanUser(userId);
        toast.success("User unbanned successfully");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to unban user");
      }
    });
  };

  const handleDeleteUser = async (userId: string) => {
    startTransition(async () => {
      try {
        await deleteUser(userId);
        setShowDeleteModal(false);
        toast.success("User deleted successfully");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete user");
      }
    });
  };

  const handleVerifyEmail = async (userId: string) => {
    startTransition(async () => {
      try {
        await verifyUserEmail(userId);
        toast.success("Email verified successfully");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to verify email");
      }
    });
  };

  const handleTerminateSessions = async (userId: string) => {
    startTransition(async () => {
      try {
        await terminateAllUserSessions(userId);
        toast.success("User sessions terminated successfully");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to terminate sessions");
      }
    });
  };

  const handleUpdateRegion = async (userId: string, region: string | null) => {
    startTransition(async () => {
      try {
        await updateUserRegion(userId, region);
        setShowRegionModal(false);
        setSelectedUser(null);
        toast.success(`Region updated to ${region || "Global"}`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update region");
      }
    });
  };

  const handleUpdateAgency = async (userId: string, agency: string | null) => {
    startTransition(async () => {
      try {
        await updateUserAgency(userId, agency);
        setShowAgencyModal(false);
        setSelectedUser(null);
        toast.success(`Program scope updated to ${agency || "All Programs"}`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update program scope");
      }
    });
  };

  const getRegionLabel = (regionCode: string | null | undefined) => {
    if (!regionCode) return "Global";
    const region = regions.find(r => r.value === regionCode);
    return region?.label || regionCode;
  };

  const getAgencyLabel = (agencyCode: string | null | undefined) => {
    if (!agencyCode) return "All Programs";
    return AGENCY_LABELS[agencyCode as ImplementingAgency] || agencyCode;
  };

  return (
    <AdminPageWrapper
      breadcrumbs={[{ label: "Admin" }, { label: "User Management" }]}
      title="User Management"
      description="Manage users and permissions"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalUsers.toLocaleString()}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Total Users</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalCitizens.toLocaleString()}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Citizens</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalAdmins + stats.totalModerators}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Staff</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalVerified}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Verified</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2 whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </form>
            <select
              onChange={handleRoleFilter}
              defaultValue={searchParams.get("role") || ""}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="citizen">Citizen</option>
            </select>
            <select
              onChange={handleStatusFilter}
              defaultValue={searchParams.get("status") || ""}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">All Users</h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Add User</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Program
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {initialUsers
                  .filter((user) => user.name !== "Administrator")
                  .map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt={user.name}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full object-cover border-2 border-blue-600"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                              {user.name}
                              {user.emailVerified && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.role || "citizen"}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                          disabled={isPending}
                          className={`px-2 py-1 text-xs font-medium rounded border-0 ${user.role === "admin"
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                            : user.role === "moderator"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                              : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            }`}
                        >
                          <option value="admin">Admin</option>
                          <option value="moderator">Moderator</option>
                          <option value="citizen">Citizen</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.role === "moderator" ? (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowRegionModal(true);
                            }}
                            disabled={isPending}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors"
                          >
                            <MapPin className="w-3 h-3" />
                            {getRegionLabel(user.region)}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.role === "moderator" ? (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowAgencyModal(true);
                            }}
                            disabled={isPending}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                          >
                            <Building2 className="w-3 h-3" />
                            {getAgencyLabel(user.assignedAgency)}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">â€”</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.banned ? (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                            Banned
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                disabled={isPending}
                                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Actions"
                              />
                            }
                          >
                            <MoreVertical className="w-5 h-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setShowEditModal(true);
                              }}
                              disabled={isPending}
                            >
                              <Edit className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                              Edit User
                            </DropdownMenuItem>

                            {!user.emailVerified && (
                              <DropdownMenuItem
                                onClick={() => handleVerifyEmail(user.id)}
                                disabled={isPending}
                              >
                                <CheckCircle className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                                Verify Email
                              </DropdownMenuItem>
                            )}

                            {user.banned ? (
                              <DropdownMenuItem
                                onClick={() => handleUnbanUser(user.id)}
                                disabled={isPending}
                              >
                                <CheckCircle className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                                Unban User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowBanModal(true);
                                }}
                                disabled={isPending}
                              >
                                <Ban className="w-4 h-4 mr-2 text-yellow-600 dark:text-yellow-400" />
                                Ban User
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => handleTerminateSessions(user.id)}
                              disabled={isPending}
                            >
                              <LogOut className="w-4 h-4 mr-2 text-orange-600 dark:text-orange-400" />
                              Terminate Sessions
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteModal(true);
                              }}
                              disabled={isPending}
                              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, total)} of {total} users
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1 || isPending}
                className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {(() => {
                const pages: (number | string)[] = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (currentPage > 3) pages.push("...");
                  const start = Math.max(2, currentPage - 1);
                  const end = Math.min(totalPages - 1, currentPage + 1);
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (currentPage < totalPages - 2) pages.push("...");
                  pages.push(totalPages);
                }
                return pages.map((page, idx) =>
                  typeof page === "string" ? (
                    <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-sm text-slate-400 dark:text-slate-500">
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      disabled={isPending}
                      className={`px-3 py-1.5 text-sm rounded-lg ${currentPage === page
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                    >
                      {page}
                    </button>
                  )
                );
              })()}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || isPending}
                className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Add New User
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  name: formData.get("name") as string,
                  email: formData.get("email") as string,
                  password: formData.get("password") as string,
                  role: formData.get("role") as "admin" | "moderator" | "citizen",
                };
                handleAddUser(data);
              }}
            >
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    required
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    required
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Minimum 8 characters
                  </p>
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    defaultValue="citizen"
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="citizen">Citizen</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Edit User
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  name: formData.get("name") as string,
                  email: formData.get("email") as string,
                };
                handleUpdateUser(selectedUser.id, data);
              }}
            >
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Name
                  </label>
                  <input
                    id="edit-name"
                    name="name"
                    type="text"
                    defaultValue={selectedUser.name}
                    placeholder="John Doe"
                    required
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="edit-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    id="edit-email"
                    name="email"
                    type="email"
                    defaultValue={selectedUser.email}
                    placeholder="john@example.com"
                    required
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Updating..." : "Update User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Ban User
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Are you sure you want to ban <strong>{selectedUser.name}</strong>?
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const reason = formData.get("reason") as string;
                handleBanUser(selectedUser.id, reason);
              }}
            >
              <input
                name="reason"
                type="text"
                placeholder="Reason for ban"
                required
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white mb-4"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBanModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Ban User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Delete User
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Are you sure you want to permanently delete <strong>{selectedUser.name}</strong>? This
              action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(selectedUser.id)}
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Region Modal */}
      {showRegionModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Set Region for {selectedUser.name}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Assign a region to limit this moderator&apos;s scope. Select &quot;Global&quot; for access to all regions.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const regionValue = formData.get("region") as string;
                handleUpdateRegion(selectedUser.id, regionValue === "" ? null : regionValue);
              }}
            >
              <select
                name="region"
                defaultValue={selectedUser.region || ""}
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white mb-4"
              >
                <option value="">Global (All Regions)</option>
                {regions.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label} - {region.fullName}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegionModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  {isPending ? "Saving..." : "Save Region"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Agency Modal */}
      {showAgencyModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Set Program Scope for {selectedUser.name}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Assign a program to limit this moderator&apos;s scope. Select &quot;All Programs&quot; for access to AMEFIP and INS.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const agencyValue = formData.get("agency") as string;
                handleUpdateAgency(selectedUser.id, agencyValue === "" ? null : agencyValue);
              }}
            >
              <select
                name="agency"
                defaultValue={selectedUser.assignedAgency || ""}
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white mb-4"
              >
                <option value="">All Programs</option>
                {IMPLEMENTING_AGENCIES.map((agency) => (
                  <option key={agency} value={agency}>
                    {agency} - {AGENCY_LABELS[agency]}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAgencyModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  {isPending ? "Saving..." : "Save Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPageWrapper>
  );
}
