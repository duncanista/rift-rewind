"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChronobreakIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page if accessing /chronobreak without a uid
    router.push("/");
  }, [router]);

  // Return null or a loading state while redirecting
  return null;
}
