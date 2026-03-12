"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await login({ email, password });
      setAccessToken(res.accessToken);
      toast.success("Login successful!");
      router.push("/lobby");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="medieval-bg fixed inset-0 flex items-center justify-center px-4 z-40">
      <div className="w-full max-w-sm bg-[#1e140c]/90 border border-amber-900/30 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] p-6">
        <div className="text-center mb-6">
          <h1 className="font-medieval text-2xl font-bold text-amber-400 tracking-wide">Login</h1>
          <p className="text-amber-200/40 text-xs mt-1">Enter your credentials to play</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs text-amber-200/60 font-medium">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#0d0705] border border-amber-900/40 rounded-lg text-amber-100 text-sm placeholder:text-amber-200/20 focus:outline-none focus:border-amber-700/60 focus:ring-1 focus:ring-amber-700/30 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs text-amber-200/60 font-medium">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#0d0705] border border-amber-900/40 rounded-lg text-amber-100 text-sm placeholder:text-amber-200/20 focus:outline-none focus:border-amber-700/60 focus:ring-1 focus:ring-amber-700/30 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-b from-amber-700 to-amber-900 border border-amber-600/50 rounded-lg text-amber-100 font-medieval font-bold tracking-wider hover:from-amber-600 hover:to-amber-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="text-center text-xs text-amber-200/40">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
