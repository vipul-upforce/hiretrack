export interface AboutValues {
  enableAutoUpdate: boolean;
}

export interface VersionInfo {
  version: string;
  tagName: string;
  platforms: string[];
  publishedAt: string;
  isPrerelease: boolean;
  isDraft: boolean;
  releaseNotes: string;
  releaseUrl: string;
  assetCount: number;
}

export interface VersionListResponse {
  totalVersions: number;
  latestVersion: string;
  versions: VersionInfo[];
}
