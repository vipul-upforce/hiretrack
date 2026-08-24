/**
 * Response shape from the Docling HTTP parse endpoint (VM or proxy).
 */
export interface DoclingParseResponse {
  status: string;
  markdown?: string;
}
