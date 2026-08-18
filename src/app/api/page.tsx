import { redirect } from "next/navigation";

// This used to be a fully public, unauthenticated "API Reference" page
// describing a REST API that does not exist: base URL
// https://api.dobly.app (the real app has no such domain), an API-key auth
// scheme (there is none anywhere in middleware.ts - only Supabase session
// cookies and a few route-specific webhook signatures/tokens), endpoints
// like POST /api/workflows (the folder exists but has no route.ts in it at
// all - it 404s), and "official SDKs" for four languages that were never
// published (no @dobly/sdk on npm, no dobly-sdk on PyPI). Not linked from
// anywhere in the app - a developer could only have found it by guessing
// the URL, and would have hit real curl commands that fail against a
// domain that doesn't resolve. Dobly does not have a public developer API
// product today, so there is nothing honest to replace this content with -
// redirecting rather than publishing fabricated documentation.
export default function ApiDocsPage() {
  redirect("/");
}
