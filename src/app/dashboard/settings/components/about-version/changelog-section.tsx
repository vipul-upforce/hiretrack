"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { VersionInfo } from "./types";

export interface ChangelogSectionProps {
  changelogVersions: VersionInfo[];
  currentVersion: string;
  latestVersion: string | null;
}

export function ChangelogSection({
  changelogVersions,
  currentVersion,
  latestVersion,
}: ChangelogSectionProps) {
  if (!changelogVersions.length || !latestVersion) return null;

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="pb-3 pt-0">
        <CardTitle>What's New</CardTitle>
        <CardDescription>
          Changes from version {currentVersion} to {latestVersion}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {changelogVersions
            .sort(
              (a, b) =>
                new Date(b.publishedAt).getTime() -
                new Date(a.publishedAt).getTime()
            )
            .map((version, idx) => (
              <div key={version.version} className="space-y-2">
                {/* Version Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{version.version}</Badge>

                    {version.isPrerelease && (
                      <Badge variant="secondary" className="text-xs">
                        Pre-release
                      </Badge>
                    )}
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {new Date(version.publishedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Release Notes */}
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ ...props }) => (
                        <h3 className="text-base font-semibold" {...props} />
                      ),
                      h2: ({ ...props }) => (
                        <h4 className="text-sm font-semibold" {...props} />
                      ),
                      p: ({ ...props }) => (
                        <p
                          className="leading-relaxed mb-2 last:mb-0"
                          {...props}
                        />
                      ),
                      ul: ({ ...props }) => (
                        <ul className="list-disc pl-5 space-y-1" {...props} />
                      ),
                      ol: ({ ...props }) => (
                        <ol
                          className="list-decimal pl-5 space-y-1"
                          {...props}
                        />
                      ),
                      code: ({ children, ...props }) => (
                        <code
                          className="block overflow-x-auto rounded-md bg-muted p-3 font-mono text-[0.85em]"
                          {...props}
                        >
                          {children}
                        </code>
                      ),
                      a: ({ ...props }) => (
                        <a
                          className="underline hover:no-underline"
                          target="_blank"
                          rel="noreferrer"
                          {...props}
                        />
                      ),
                      table: ({ ...props }) => (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm" {...props} />
                        </div>
                      ),
                      th: ({ ...props }) => (
                        <th
                          className="border-b px-2 py-1 text-left font-medium"
                          {...props}
                        />
                      ),
                      td: ({ ...props }) => (
                        <td
                          className="border-b px-2 py-1 align-top"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {version.releaseNotes}
                  </ReactMarkdown>
                </div>

                {idx < changelogVersions.length - 1 && (
                  <Separator className="my-3" />
                )}
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
