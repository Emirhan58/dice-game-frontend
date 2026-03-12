"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminGuard } from "@/components/admin-guard";
import {
  getAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getAdminUserWallet,
  adjustAdminUserWallet,
  setAdminUserWallet,
  ApiError,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AdminUpdateUserRequest } from "@/types/api";

function UserDetailContent() {
  const params = useParams();
  const router = useRouter();
  const userId = Number(params.id);

  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.adminUser(userId),
    queryFn: () => getAdminUser(userId),
    enabled: !isNaN(userId),
  });

  const { data: wallet } = useQuery({
    queryKey: queryKeys.adminUserWallet(userId),
    queryFn: () => getAdminUserWallet(userId),
    enabled: !isNaN(userId),
  });

  if (isLoading) {
    return (
      <div className="medieval-bg min-h-screen flex items-center justify-center">
        <span className="text-amber-200/40">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="medieval-bg min-h-screen flex items-center justify-center">
        <span className="text-amber-200/40">User not found</span>
      </div>
    );
  }

  return (
    <div className="medieval-bg min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/admin")}
            className="text-amber-200/40 hover:text-amber-200 transition-colors text-sm"
          >
            &larr; Back
          </button>
          <h1 className="font-medieval text-2xl font-bold text-amber-400 tracking-wide">
            {user.username}
          </h1>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${user.role === "ADMIN" ? "bg-red-900/40 text-red-300" : "bg-amber-900/30 text-amber-300/70"}`}>
            {user.role}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${user.active ? "bg-emerald-900/40 text-emerald-300" : "bg-zinc-800/40 text-zinc-400"}`}>
            {user.active ? "Active" : "Deleted"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Info */}
          <EditUserCard userId={userId} user={user} />

          {/* Wallet */}
          <WalletCard userId={userId} balance={wallet?.balanceGold ?? user.balanceGold} />
        </div>

        {/* Danger Zone */}
        <DangerZone userId={userId} username={user.username} active={user.active} />
      </div>
    </div>
  );
}

function EditUserCard({ userId, user }: { userId: number; user: { username: string; email: string; firstName: string | null; lastName: string | null; role: string } }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AdminUpdateUserRequest>({
    username: user.username,
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    role: user.role as "USER" | "ADMIN",
  });

  const mutation = useMutation({
    mutationFn: () => updateAdminUser(userId, form),
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUser(userId) });
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
    },
  });

  return (
    <div className="bg-[#1e140c]/60 border border-amber-900/20 rounded-lg p-5">
      <h2 className="font-medieval text-lg text-amber-400 font-bold mb-4">User Info</h2>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
        <div>
          <label className="text-[10px] text-amber-200/40 uppercase tracking-wider">Username</label>
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full px-3 py-2 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 text-sm focus:outline-none focus:border-amber-700/50"
          />
        </div>
        <div>
          <label className="text-[10px] text-amber-200/40 uppercase tracking-wider">Email</label>
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 text-sm focus:outline-none focus:border-amber-700/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-amber-200/40 uppercase tracking-wider">First Name</label>
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full px-3 py-2 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 text-sm focus:outline-none focus:border-amber-700/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-amber-200/40 uppercase tracking-wider">Last Name</label>
            <input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="w-full px-3 py-2 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 text-sm focus:outline-none focus:border-amber-700/50"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-amber-200/40 uppercase tracking-wider">Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as "USER" | "ADMIN" })}
            className="w-full px-3 py-2 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 text-sm focus:outline-none focus:border-amber-700/50"
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-amber-200/40 uppercase tracking-wider">New Password (optional)</label>
          <input
            type="password"
            placeholder="Leave blank to keep current"
            value={form.password ?? ""}
            onChange={(e) => setForm({ ...form, password: e.target.value || undefined })}
            className="w-full px-3 py-2 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 placeholder:text-amber-200/30 text-sm focus:outline-none focus:border-amber-700/50"
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full py-2 bg-gradient-to-b from-amber-700 to-amber-900 border border-amber-600/50 rounded-lg text-amber-100 font-medieval text-sm font-bold hover:from-amber-600 hover:to-amber-800 transition-all disabled:opacity-50"
        >
          {mutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

function WalletCard({ userId, balance }: { userId: number; balance: number }) {
  const queryClient = useQueryClient();
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [setAmount, setSetAmount] = useState("");
  const [setNote, setSetNote] = useState("");

  const invalidateWallet = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.adminUserWallet(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.adminUser(userId) });
  };

  const adjustMutation = useMutation({
    mutationFn: () => adjustAdminUserWallet(userId, { amount: Number(adjustAmount), note: adjustNote || undefined }),
    onSuccess: (res) => {
      toast.success(`Balance adjusted: ${res.balanceGold.toLocaleString()}`);
      setAdjustAmount("");
      setAdjustNote("");
      invalidateWallet();
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
    },
  });

  const setMutation = useMutation({
    mutationFn: () => setAdminUserWallet(userId, { amount: Number(setAmount), note: setNote || undefined }),
    onSuccess: (res) => {
      toast.success(`Balance set to ${res.balanceGold.toLocaleString()}`);
      setSetAmount("");
      setSetNote("");
      invalidateWallet();
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
    },
  });

  return (
    <div className="bg-[#1e140c]/60 border border-amber-900/20 rounded-lg p-5">
      <h2 className="font-medieval text-lg text-amber-400 font-bold mb-4">Wallet</h2>

      <div className="text-center mb-6">
        <span className="text-3xl font-mono text-amber-300 font-bold">{balance.toLocaleString()}</span>
        <span className="text-amber-200/40 text-sm ml-2">gold</span>
      </div>

      {/* Adjust */}
      <div className="mb-4">
        <label className="text-[10px] text-amber-200/40 uppercase tracking-wider mb-1 block">Adjust (+/-)</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="+500 or -200"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            className="flex-1 px-3 py-2 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 placeholder:text-amber-200/30 text-sm focus:outline-none focus:border-amber-700/50"
          />
          <button
            onClick={() => adjustMutation.mutate()}
            disabled={!adjustAmount || adjustMutation.isPending}
            className="px-3 py-2 bg-emerald-900/50 border border-emerald-700/30 rounded-lg text-emerald-200 text-sm hover:bg-emerald-800/50 transition-all disabled:opacity-30"
          >
            {adjustMutation.isPending ? "..." : "Apply"}
          </button>
        </div>
        <input
          placeholder="Note (optional)"
          value={adjustNote}
          onChange={(e) => setAdjustNote(e.target.value)}
          className="w-full mt-2 px-3 py-1.5 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 placeholder:text-amber-200/30 text-xs focus:outline-none focus:border-amber-700/50"
        />
      </div>

      {/* Set */}
      <div>
        <label className="text-[10px] text-amber-200/40 uppercase tracking-wider mb-1 block">Set Balance</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="5000"
            value={setAmount}
            onChange={(e) => setSetAmount(e.target.value)}
            className="flex-1 px-3 py-2 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 placeholder:text-amber-200/30 text-sm focus:outline-none focus:border-amber-700/50"
          />
          <button
            onClick={() => setMutation.mutate()}
            disabled={!setAmount || setMutation.isPending}
            className="px-3 py-2 bg-sky-900/50 border border-sky-700/30 rounded-lg text-sky-200 text-sm hover:bg-sky-800/50 transition-all disabled:opacity-30"
          >
            {setMutation.isPending ? "..." : "Set"}
          </button>
        </div>
        <input
          placeholder="Note (optional)"
          value={setNote}
          onChange={(e) => setSetNote(e.target.value)}
          className="w-full mt-2 px-3 py-1.5 bg-[#2a1a0e]/80 border border-amber-900/30 rounded-lg text-amber-100 placeholder:text-amber-200/30 text-xs focus:outline-none focus:border-amber-700/50"
        />
      </div>
    </div>
  );
}

function DangerZone({ userId, username, active }: { userId: number; username: string; active: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const deactivateMutation = useMutation({
    mutationFn: () => deleteAdminUser(userId),
    onSuccess: () => {
      toast.success(`User "${username}" deactivated`);
      router.push("/admin");
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => updateAdminUser(userId, { isActive: true }),
    onSuccess: () => {
      toast.success(`User "${username}" reactivated`);
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUser(userId) });
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
    },
  });

  return (
    <div className={`mt-8 ${active ? "bg-red-950/20 border-red-900/20" : "bg-emerald-950/20 border-emerald-900/20"} border rounded-lg p-5`}>
      <h2 className={`font-medieval text-lg font-bold mb-2 ${active ? "text-red-400" : "text-emerald-400"}`}>
        {active ? "Danger Zone" : "User Inactive"}
      </h2>
      {active ? (
        <>
          <p className="text-xs text-red-200/40 mb-4">
            Deactivating a user performs a soft delete. The user will not be able to log in.
          </p>
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to deactivate "${username}"?`)) {
                deactivateMutation.mutate();
              }
            }}
            disabled={deactivateMutation.isPending}
            className="px-4 py-2 bg-red-900/40 border border-red-700/30 rounded-lg text-red-200 text-sm hover:bg-red-800/40 transition-all disabled:opacity-50"
          >
            {deactivateMutation.isPending ? "Deactivating..." : "Deactivate User"}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-emerald-200/40 mb-4">
            This user has been deactivated. Reactivating will restore their access.
          </p>
          <button
            onClick={() => reactivateMutation.mutate()}
            disabled={reactivateMutation.isPending}
            className="px-4 py-2 bg-emerald-900/40 border border-emerald-700/30 rounded-lg text-emerald-200 text-sm hover:bg-emerald-800/40 transition-all disabled:opacity-50"
          >
            {reactivateMutation.isPending ? "Reactivating..." : "Reactivate User"}
          </button>
        </>
      )}
    </div>
  );
}

export default function AdminUserDetailPage() {
  return (
    <AdminGuard>
      <UserDetailContent />
    </AdminGuard>
  );
}
