# Chunked release asset download

Installers on restrictive networks may fail on single ~600MB downloads. Releases include split parts plus a manifest. The installer downloads those assets from **GitHub Releases** (no license server).

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

## GitHub Releases

The installer reads the release JSON for tag `vX.Y.Z` and downloads:

- `hiretrack-vX.Y.Z.tar.gz.manifest.json` when present, then each `.part-000` …
- or the full `hiretrack-vX.Y.Z.tar.gz` if chunked assets are missing

Optional `GITHUB_TOKEN` is used for private repos. There is no license query string.

## Installer behavior

1. Fetch release metadata from GitHub.
2. If a valid manifest with `chunked: true` and `parts` > 0 exists, download each part and concatenate.
3. Verify `totalBytes`, `sha256`, and `gzip -t`.
4. If the manifest is missing or fails, download the full tarball.

## Local cleanup after release

`ci_prod.sh` / `ci_dev.sh` / GitLab release job run `scripts/cleanup-release-artifacts.sh` after upload to remove `hiretrack-v*.tar.gz`, `.manifest.json`, and `.part-*` from the repo working tree. These paths are in `.gitignore`.
