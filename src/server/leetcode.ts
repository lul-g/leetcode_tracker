import "server-only";
import type { CatalogEntry, Credentials, Sub } from "@/lib/sync-types";

/**
 * A small client for LeetCode's GraphQL endpoint, used by the stateless /api/lc routes. The
 * REST endpoints (/api/submissions, /api/problems/all) sit behind a Cloudflare challenge that
 * blocks non-browser clients; GraphQL does not, so everything goes through it.
 * Nothing here stores anything, and the cookie is never logged.
 */
const ENDPOINT = process.env.LEETCODE_GRAPHQL_URL ?? "https://leetcode.com/graphql";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export class AuthError extends Error {
  constructor(message = "LeetCode rejected the cookie. Paste a fresh one in Settings.") {
    super(message);
    this.name = "AuthError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Cookie = Pick<Credentials, "session" | "csrf">;

async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
  cookie?: Cookie,
  attempt = 0,
): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    referer: "https://leetcode.com/",
    origin: "https://leetcode.com",
    "user-agent": UA,
  };
  if (cookie) {
    headers.cookie = `LEETCODE_SESSION=${cookie.session}; csrftoken=${cookie.csrf}`;
    headers["x-csrftoken"] = cookie.csrf;
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  // back off and retry on rate limits / transient errors
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    await sleep(1000 * 2 ** attempt);
    return gql<T>(query, variables, cookie, attempt + 1);
  }
  if (res.status === 401 || res.status === 403) {
    const text = await res.text();
    // a Cloudflare challenge page means the request was blocked, not that the cookie is bad
    if (/Just a moment|challenge/i.test(text)) {
      throw new Error("LeetCode blocked the request (Cloudflare). Try again in a minute.");
    }
    throw new AuthError();
  }
  if (!res.ok) throw new Error(`LeetCode responded ${res.status}`);

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length && !json.data) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  return json.data as T;
}

/** Who the cookie belongs to, or null when it isn't a signed-in session. */
export async function fetchUsername(cookie: Cookie): Promise<string | null> {
  const d = await gql<{ userStatus: { isSignedIn: boolean; username: string } }>(
    "query g { userStatus { isSignedIn username } }",
    {},
    cookie,
  );
  return d.userStatus?.isSignedIn ? d.userStatus.username : null;
}

const LEVEL = { Easy: 1, Medium: 2, Hard: 3 } as const;

const LIST_QUERY = `query p($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
    total: totalNum
    questions: data { questionFrontendId title titleSlug difficulty }
  }
}`;

type ListPage = {
  problemsetQuestionList: {
    total: number;
    questions: {
      questionFrontendId: string;
      title: string;
      titleSlug: string;
      difficulty: keyof typeof LEVEL;
    }[];
  };
};

const PAGE = 100;

/** Every problem on LeetCode (public, ~4,000 of them, 100 per request, a few at a time). */
export async function fetchCatalog(): Promise<Record<string, CatalogEntry>> {
  const read = async (skip: number) =>
    (await gql<ListPage>(LIST_QUERY, { categorySlug: "", limit: PAGE, skip, filters: {} }))
      .problemsetQuestionList;

  const first = await read(0);
  const pages = [first];
  const skips: number[] = [];
  for (let s = PAGE; s < first.total; s += PAGE) skips.push(s);
  for (let i = 0; i < skips.length; i += 6) {
    pages.push(...(await Promise.all(skips.slice(i, i + 6).map(read))));
  }

  const out: Record<string, CatalogEntry> = {};
  for (const page of pages) {
    for (const q of page.questions) {
      out[q.titleSlug] = {
        n: Number(q.questionFrontendId),
        title: q.title,
        d: LEVEL[q.difficulty] ?? 2,
      };
    }
  }
  return out;
}

/** One page (100) of the problems the signed-in user has solved, via LeetCode's own "Solved" filter. */
export async function fetchSolvedPage(
  cookie: Cookie,
  skip: number,
): Promise<{ slugs: string[]; total: number }> {
  const d = await gql<ListPage>(
    LIST_QUERY,
    { categorySlug: "", limit: PAGE, skip, filters: { status: "AC" } },
    cookie,
  );
  const page = d.problemsetQuestionList;
  return { slugs: page.questions.map((q) => q.titleSlug), total: page.total };
}

const SUBS_QUERY = `query s($offset: Int!, $limit: Int!, $lastKey: String, $questionSlug: String!) {
  questionSubmissionList(offset: $offset, limit: $limit, lastKey: $lastKey, questionSlug: $questionSlug) {
    lastKey
    hasNext
    submissions { id status statusDisplay langName runtime timestamp isPending }
  }
}`;

type SubsPage = {
  questionSubmissionList: {
    lastKey: string | null;
    hasNext: boolean | null;
    submissions:
      | {
          id: string;
          status: number;
          statusDisplay: string;
          langName: string;
          runtime: string;
          timestamp: string;
          isPending: boolean;
        }[]
      | null;
  };
};

const parseRuntime = (s: string) => {
  const m = /(\d+)\s*ms/i.exec(s ?? "");
  return m ? Number(m[1]) : null;
};

/** All of the user's submissions to one problem, oldest first. */
export async function fetchSubmissions(cookie: Cookie, slug: string): Promise<Sub[]> {
  const out: Sub[] = [];
  const LIMIT = 20;
  let lastKey: string | null = null;
  for (let offset = 0; offset < 2000; offset += LIMIT) {
    const d: SubsPage = await gql<SubsPage>(
      SUBS_QUERY,
      { offset, limit: LIMIT, lastKey, questionSlug: slug },
      cookie,
    );
    const page = d.questionSubmissionList;
    for (const s of page?.submissions ?? []) {
      if (s.isPending) continue;
      out.push({
        id: String(s.id),
        t: Number(s.timestamp),
        ok: s.statusDisplay === "Accepted" || s.status === 10,
        lang: s.langName,
        rt: parseRuntime(s.runtime),
      });
    }
    if (!page?.hasNext) break;
    lastKey = page.lastKey;
    await sleep(100);
  }
  return out.sort((a, b) => a.t - b.t);
}

/** The user's most recent accepted submissions (public, capped by `limit`). */
export async function fetchRecentAccepted(
  username: string,
  limit: number,
): Promise<{ slug: string; t: number }[]> {
  const d = await gql<{
    recentAcSubmissionList: { titleSlug: string; timestamp: string }[] | null;
  }>(
    `query r($username: String!, $limit: Int) {
      recentAcSubmissionList(username: $username, limit: $limit) { titleSlug timestamp }
    }`,
    { username, limit },
  );
  return (d.recentAcSubmissionList ?? []).map((r) => ({
    slug: r.titleSlug,
    t: Number(r.timestamp),
  }));
}
