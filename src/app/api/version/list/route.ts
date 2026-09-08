import { promises as fs } from 'fs';
import { logger } from '@/lib/logger/logger.server';
import {
  PARENT_CONFIG_PATH,
  getReleaseChannel,
  type ConfigData,
} from '@/lib/configUtils';
import { NextRequest, NextResponse } from 'next/server';

interface GitHubReleaseAsset {
  name: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  prerelease: boolean;
  draft: boolean;
  body: string | null;
  assets: GitHubReleaseAsset[];
}

interface GitHubApiError {
  message?: string;
}

/** Matches installer.sh DEFAULT_GITHUB_RELEASE_REPO. Override with env or config.json. */
const DEFAULT_GITHUB_RELEASE_REPO = 'vipul-upforce/hiretrack';

async function resolveGithubReleaseRepo(): Promise<string> {
  const fromEnv = process.env.GITHUB_RELEASE_REPO?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  try {
    const raw = await fs.readFile(PARENT_CONFIG_PATH, 'utf8');
    const config = JSON.parse(raw) as ConfigData;
    const fromConfig = config.githubReleaseRepo?.trim();
    if (fromConfig) {
      return fromConfig;
    }
  } catch {
    // Parent config is optional (local development).
  }

  return DEFAULT_GITHUB_RELEASE_REPO;
}

function mapRelease(release: GitHubRelease) {
  return {
    version: release.tag_name,
    tagName: release.tag_name,
    platforms: [] as string[],
    publishedAt: release.published_at ?? '',
    isPrerelease: release.prerelease,
    isDraft: release.draft,
    releaseNotes: release.body ?? '',
    releaseUrl: release.html_url,
    assetCount: release.assets?.length ?? 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const repo = await resolveGithubReleaseRepo();

    const channel = await getReleaseChannel();
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'hiretrack-oss',
    };
    const token = process.env.GITHUB_TOKEN?.trim();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${repo}/releases?per_page=30`,
      {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as GitHubApiError;
      logger.error(
        { status: response.status, message: body.message, url: request.url },
        'GitHub Releases request failed',
      );
      return NextResponse.json(
        { error: body.message || 'Failed to fetch version list from GitHub' },
        { status: response.status },
      );
    }

    const releases = (await response.json()) as GitHubRelease[];
    const published = releases.filter((release) => !release.draft);
    const filtered =
      channel === 'production'
        ? published.filter((release) => !release.prerelease)
        : published.filter((release) => release.prerelease);

    const versionsSource = filtered.length > 0 ? filtered : published;
    const versions = versionsSource.map(mapRelease);
    const latestVersion = versions[0]?.version ?? '';

    return NextResponse.json({
      totalVersions: versions.length,
      latestVersion,
      versions,
    });
  } catch (error: unknown) {
    logger.error({ error, url: request.url }, 'Error fetching version list');

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error:
            error.message || 'Request timeout - GitHub may be unavailable',
        },
        { status: 408 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error while fetching version list',
      },
      { status: 500 },
    );
  }
}
