export interface SystemLogsResponse {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onError?: (msg: string | null) => void;
}

export interface LogFileResponse {
  files: string[];
}

export interface LogContentResponse {
  content: string[];
  offset: number;
  totalLines: number;
}
