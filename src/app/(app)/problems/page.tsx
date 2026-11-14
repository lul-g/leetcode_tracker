import { Suspense } from "react";
import { ProblemsWorkspace } from "@/components/problems/problems-workspace";

export default function ProblemsPage() {
  // useSearchParams needs a Suspense boundary for static rendering
  return (
    <Suspense fallback={null}>
      <ProblemsWorkspace />
    </Suspense>
  );
}
