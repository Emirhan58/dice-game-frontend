"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, hydrate } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
    } else if (isAuthenticated && role !== "ADMIN") {
      router.push("/");
    }
  }, [isAuthenticated, role, router]);

  if (!isAuthenticated || role !== "ADMIN") {
    return null;
  }

  return <>{children}</>;
}
