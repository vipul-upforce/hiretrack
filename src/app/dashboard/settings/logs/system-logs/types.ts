export interface SystemLogsResponse {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onError?: (msg: string | null) => void;
}

export interface LogFileResponse {
  files: string[];
  size?: string;
}

export interface LogContentResponse {
  content: string[];
  totalLines: number;
  start: number;
  end: number;
  query?: string;
}
