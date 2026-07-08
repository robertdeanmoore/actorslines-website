-- Stores the plan file's own markdown content alongside its repo_path, so the
-- admin UI can render it directly (matching how ai_reports.report_md already
-- works) instead of needing an authenticated GitHub API call to a private repo.
alter table public.plans add column plan_md text;
