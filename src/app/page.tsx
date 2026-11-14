export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <ul className="space-y-1 font-mono text-sm">
            <li className="flex w-36 justify-between text-easy">
              <span>Easy</span>
              <span className="text-muted-foreground">0/0</span>
            </li>
            <li className="flex w-36 justify-between text-medium">
              <span>Medium</span>
              <span className="text-muted-foreground">0/0</span>
            </li>
            <li className="flex w-36 justify-between text-hard">
              <span>Hard</span>
              <span className="text-muted-foreground">0/0</span>
            </li>
          </ul>
          <div className="text-center">
            <div className="font-mono text-5xl font-bold">0</div>
            <div className="text-xs text-muted-foreground">/1200 Solved</div>
          </div>
        </div>
      </section>
    </main>
  );
}
