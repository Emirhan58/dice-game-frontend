"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminGuard } from "@/components/admin-guard";
import { getAdminUsers, createAdminUser, deleteAdminUser, ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AdminCreateUserRequest } from "@/types/api";

function AdminContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminUsers(page, search),
    queryFn: () => getAdminUsers(page, 20, search || undefined),
  });

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(0);
  }, [searchInput]);

  return (
    <div className="medieval-bg min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-medieval text-3xl font-bold text-amber-400 tracking-wide">
            Admin Panel
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-gradient-to-b from-amber-700 to-amber-900 border border-amber-600/50 rounded-lg text-amber-100 font-medieval text-sm font-bold tracking-wider hover:from-amber-600 hover:to-amber-800 transition-all"
          >
            + New User
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by username or email..."
            className="flex-1 px-4 py-2 bg-[#1e140c]/80 border border-amber-900/30 rounded-lg text-amber-100 placeholder:text-amber-200/30 focus:outline-none focus:border-amber-700/50"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-[#2a1a0e]/80 border border-amber-900/40 rounded-lg text-amber-200/70 hover:bg-[#3d2814]/80 hover:text-amber-200 transition-all text-sm"
          >
            Search
          </button>
        </div>

        {/* Create User Modal */}
        {showCreate && (
          <CreateUserModal
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            }}
          />
        )}

        {/* Table */}
        <div className="bg-[#1e140c]/60 border border-amber-900/20 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_1.5fr_80px_80px_100px_60px] gap-2 px-4 py-3 border-b border-amber-900/20 text-xs text-amber-200/50 font-bold uppercase tracking-wider">
            <span>Username</span>
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
            <span className="text-right">Balance</span>
            <span></span>
          </div>

          {isLoading ? (
            <div className="px-4 py-8 text-center text-amber-200/30 text-sm">Loading...</div>
          ) : !data?.content.length ? (
            <div className="px-4 py-8 text-center text-amber-200/30 text-sm">No users found</div>
          ) : (
            data.content.map((user) => (
              <div
                key={user.id}
                onClick={() => router.push(`/admin/users/${user.id}`)}
                className="grid grid-cols-[1fr_1.5fr_80px_80px_100px_60px] gap-2 px-4 py-3 border-b border-amber-900/10 hover:bg-amber-900/10 cursor-pointer transition-colors items-center"
              >
                <span className="text-sm text-amber-200 font-medium truncate">{user.username}</span>
                <span className="text-xs text-amber-200/50 truncate">{user.email}</span>
                <span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${user.role === "ADMIN" ? "bg-red-900/40 text-red-300" : "bg-amber-900/30 text-amber-300/70"}`}>
                    {user.role}
                  </span>
                </span>
                <span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${user.active ? "bg-emerald-900/40 text-emerald-300" : "bg-zinc-800/40 text-zinc-400"}`}>
                    {user.active ? "Active" : "Deleted"}
                  </span>
                </span>
                <span className="text-sm text-amber-300 font-mono text-right">{user.balanceGold.toLocaleString()}</span>
                <span className="text-right">
                  <DeleteButton userId={user.id} username={user.username} />
                </span>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {data && data.page.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-sm text-amber-200/60 hover:text-amber-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-amber-200/40">
              Page {page + 1} of {data.page.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.page.totalPages - 1, p + 1))}
              disabled={page >= data.page.totalPages - 1}
              className="px-3 py-1.5 text-sm text-amber-200/60 hover:text-amber-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteButton({ userId, username }: { userId: number; username: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteAdminUser(userId),
    onSuccess: () => {
      toast.success(`User "${username}" deactivated`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
    },
  });

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (confirm(`Deactivate user "${username}"?`)) {
          mutation.mutate();
        }
      }}
      disabled={mutation.isPending}
      className="text-[10px] text-red-400/50 hover:text-red-400 transition-colors"
    >
      {mutation.isPending ? "..." : "Delete"}
    </button>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<AdminCreateUserRequest>({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "USER",
    initialBalance: 1000,
  });

  const mutation = useMutation({
    mutationFn: () => createAdminUser(form),
    onSuccess: (user) => {
      toast.success(`User "${user.username}" created`);
      onCreated();
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#1e140c] border border-amber-900/30 rounded-xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-medieval text-xl text-amber-400 font-bold mb-4">Create User</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full px-3 py-2 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 placeholder:text-amber-200/30 text-sm focus:outline-none focus:border-amber-700/50"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 placeholder:text-amber-200/30 text-sm focus:outline-none focus:border-amber-700/50"
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-3 py-2 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 placeholder:text-amber-200/30 text-sm focus:outline-none focus:border-amber-700/50"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="First Name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full px-3 py-2 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 placeholder:text-amber-200/30 text-sm focus:outline-none focus:border-amber-700/50"
            />
            <input
              placeholder="Last Name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="w-full px-3 py-2 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 placeholder:text-amber-200/30 text-sm focus:outline-none focus:border-amber-700/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "USER" | "ADMIN" })}
              className="w-full px-3 py-2 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 text-sm focus:outline-none focus:border-amber-700/50"
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <input
              type="number"
              placeholder="Initial Balance"
              value={form.initialBalance}
              onChange={(e) => setForm({ ...form, initialBalance: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 placeholder:text-amber-200/30 text-sm focus:outline-none focus:border-amber-700/50"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-2 bg-gradient-to-b from-amber-700 to-amber-900 border border-amber-600/50 rounded-lg text-amber-100 font-medieval text-sm font-bold hover:from-amber-600 hover:to-amber-800 transition-all disabled:opacity-50"
            >
              {mutation.isPending ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#2a1a0e]/80 border border-amber-900/40 rounded-lg text-amber-200/60 text-sm hover:text-amber-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminContent />
    </AdminGuard>
  );
}
