# Chunked release asset download

Installers on restrictive networks may fail on single ~600MB downloads. Releases include split parts plus a manifest; the admin license server exposes metadata and per-part bytes.

## Release artifacts (CI)

Create parts via installer (no separate script required on release runners):

```bash
./installer.sh --release-chunk-assets hiretrack-v1.1.9.tar.gz v1.1.9 50
```

For `hiretrack-v1.1.9.tar.gz`:

| File | Purpose |
|------|---------|
| `hiretrack-v1.1.9.tar.gz` | Full tarball (optional, legacy installer) |
| `hiretrack-v1.1.9.tar.gz.part-000` … `part-N` | 50MB chunks (`split -d -a 3`) |
| `hiretrack-v1.1.9.tar.gz.manifest.json` | Metadata for assembly |

### Manifest schema

```json
{
  "filename": "hiretrack-v1.1.9.tar.gz",
  "version": "v1.1.9",
  "chunked": true,
  "partSizeBytes": 52428800,
  "parts": 12,
  "totalBytes": 620439574,
  "sha256": "<hex>",
  "partPrefix": "hiretrack-v1.1.9.tar.gz.part-",
  "partPad": 3
}
```

Part file for index `i` (0-based): `{partPrefix}{i padded to partPad digits}` e.g. `hiretrack-v1.1.9.tar.gz.part-003`.

## Admin API (implement on admin.hiretrack.in)

Same license query params as today: `email`, `machineCode`, `installedVersion`, plus channel (`BETA` / `STAGING`) when applicable.

### Metadata

```http
GET /api/asset/download/meta?email=...&machineCode=...&installedVersion=1.1.9
```

**200** — body = manifest JSON above (for the resolved release version).

**404** — chunked release not available; installer falls back to monolithic download.

### Part

```http
GET /api/asset/download?email=...&machineCode=...&installedVersion=1.1.9&part=3
```

**200** — raw bytes of part `3` (`application/octet-stream`).

**4xx** — license error (JSON).

Without `part` query param, behavior stays as today (full file stream) for backward compatibility.

## Installer behavior

1. `GET .../meta` — if valid manifest with `chunked: true` and `parts` > 0, download each part and concatenate.
2. Verify `totalBytes`, `sha256`, and `gzip -t`.
3. If meta is missing or fails, download full tarball (no `curl -C -` resume).

## Storage

Admin should store manifest + part files alongside the full tarball when ingesting a GitHub release (or read from release assets API).

## Local cleanup after release

`ci_prod.sh` / `ci_dev.sh` / GitLab release job run `scripts/cleanup-release-artifacts.sh` after upload to remove `hiretrack-v*.tar.gz`, `.manifest.json`, and `.part-*` from the repo working tree. These paths are in `.gitignore`.
