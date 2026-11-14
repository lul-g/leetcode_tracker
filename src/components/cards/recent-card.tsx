"use client";

import Link from "next/link";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";
import { DIFFICULTIES } from "@/lib/data";
import { DIFF_BG, DIFF_TEXT } from "@/components/problems/problem-detail";
import { cn } from "@/lib/utils";

const fmt = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/** The latest solves in the active list. Click one to open it in Problems. */
export function RecentCard() {
  const { problems, listId, list, difficulty } = useApp();
  const rows = problems
    .filter((p) => p.lists.includes(listId) && (!difficulty || p.difficulty === difficulty))
    .sort((a, b) => (a.solvedAt < b.solvedAt ? 1 : a.solvedAt > b.solvedAt ? -1 : b.number - a.number))
    .slice(0, 20);
  const label = difficulty ? DIFFICULTIES.find((d) => d.id === difficulty)!.label : null;

  return (
    <Card className="h-full">
      <CardHeader className="shrink-0">
        <CardTitle className="text-sm font-semibold">Recent solves</CardTitle>
        <CardDescription>{list.name}</CardDescription>
        {label && difficulty && (
          <CardAction>
            <Badge variant="outline" className={cn("h-6 px-2.5", DIFF_TEXT[difficulty])}>
              {label}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Problem</TableHead>
              <TableHead className="text-right">Solved</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.slug}>
                <TableCell>
                  <Link
                    href={`/problems?p=${p.slug}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <span className={cn("size-2 rounded-full", DIFF_BG[p.difficulty])} />
                    {p.title}
                  </Link>
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {fmt(p.solvedAt)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                  Nothing solved here yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
