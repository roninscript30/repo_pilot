import type { Contributor } from "@/domain/models/repository";
import { Card, CardHeader } from "@/components/ui/Card";
import { MarkdownView } from "@/components/markdown/MarkdownView";

function LanguageBar({ languages }: { languages: ReadonlyMap<string, number> | null }) {
  if (!languages || languages.size === 0) {
    return <p className="text-xs text-surface-500">No language statistics available.</p>;
  }
  const entries = [...languages.entries()];
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0) || 1;
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700">
        {entries.map(([language, bytes]) => (
          <div
            key={language}
            className="bg-accent-500"
            style={{ width: `${Math.max(2, (bytes / total) * 100)}%` }}
            title={`${language}: ${bytes} bytes`}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {entries.map(([language, bytes]) => (
          <li key={language} className="text-2xs text-surface-500">
            {language} · {Math.round((bytes / total) * 100)}%
          </li>
        ))}
      </ul>
    </div>
  );
}

interface OverviewTabProps {
  readonly readme: string | null;
  readonly languages: ReadonlyMap<string, number> | null;
  readonly contributors: readonly Contributor[];
}

/** Repository home: README, language breakdown, and contributors. */
export function OverviewTab({ readme, languages, contributors }: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader title="README" subtitle="Preview" />
          <div className="p-4">
            {readme ? (
              <MarkdownView markdown={readme} />
            ) : (
              <p className="text-sm text-surface-500">No README found.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Languages" subtitle="by bytes" />
          <div className="p-4">
            <LanguageBar languages={languages} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Contributors" />
          <ul className="divide-y divide-surface-100 dark:divide-surface-700">
            {contributors.length === 0 ? (
              <li className="px-4 py-3 text-xs text-surface-500">
                Contributors require additional scopes (currently hidden).
              </li>
            ) : (
              contributors.map((contributor) => (
                <li key={contributor.login} className="flex items-center gap-2 px-4 py-2">
                  {contributor.avatarUrl ? (
                    <img
                      src={contributor.avatarUrl}
                      alt={contributor.login}
                      className="h-6 w-6 rounded-full"
                    />
                  ) : null}
                  <span className="min-w-0 flex-1 truncate text-xs text-surface-700 dark:text-surface-300">
                    {contributor.login}
                  </span>
                  <span className="text-2xs text-surface-400">
                    {contributor.contributions} commits
                  </span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
