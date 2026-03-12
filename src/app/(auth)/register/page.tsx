"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register, ApiError } from "@/lib/api";
import { toast } from "sonner";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register({
        username,
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
      toast.success("Registration successful! Please login.");
      router.push("/login");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors?.length) {
          err.errors.forEach((e) => toast.error(`${e.field}: ${e.message}`));
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-[#0d0705] border border-amber-900/40 rounded-lg text-amber-100 text-sm placeholder:text-amber-200/20 focus:outline-none focus:border-amber-700/60 focus:ring-1 focus:ring-amber-700/30 transition-colors";

  return (
    <div className="medieval-bg fixed inset-0 flex items-center justify-center px-4 z-40">
      <div className="w-full max-w-sm bg-[#1e140c]/90 border border-amber-900/30 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] p-6">
        <div className="text-center mb-6">
          <h1 className="font-medieval text-2xl font-bold text-amber-400 tracking-wide">Register</h1>
          <p className="text-amber-200/40 text-xs mt-1">Create your account to start playing</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-xs text-amber-200/60 font-medium">Username</label>
            <input
              id="username"
              placeholder="3–20 characters"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs text-amber-200/60 font-medium">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs text-amber-200/60 font-medium">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="text-xs text-amber-200/60 font-medium">First Name</label>
              <input
                id="firstName"
                placeholder="Optional"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lastName" className="text-xs text-amber-200/60 font-medium">Last Name</label>
              <input
                id="lastName"
                placeholder="Optional"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-b from-amber-700 to-amber-900 border border-amber-600/50 rounded-lg text-amber-100 font-medieval font-bold tracking-wider hover:from-amber-600 hover:to-amber-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Registering..." : "Register"}
          </button>

          <p className="text-center text-xs text-amber-200/40">
            Already have an account?{" "}
            <Link href="/login" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
