# Chunked release asset download

Installers on restrictive networks may fail on a single large tarball download. GitHub Releases include split parts plus a manifest. The installer prefers those assets from **GitHub Releases**.

## Release artifacts (CI)

The [Release](../.github/workflows/release.yml) workflow builds the tarball, then splits it:

```bash
./installer.sh --release-chunk-assets hiretrack-v1.1.9.tar.gz v1.1.9 50
```

For `hiretrack-v1.1.9.tar.gz`:

| File | Purpose |
|------|---------|
| `hiretrack-v1.1.9.tar.gz` | Full tarball (fallback if chunks are missing) |
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

Part file for index `i` (0-based): `{partPrefix}` padded to `partPad` digits, for example `hiretrack-v1.1.9.tar.gz.part-003`.

## GitHub Releases

The installer reads the release JSON for tag `vX.Y.Z` and downloads:

- `hiretrack-vX.Y.Z.tar.gz.manifest.json` when present, then each `.part-000` …
- or the full `hiretrack-vX.Y.Z.tar.gz` if chunked assets are missing

Optional `GITHUB_TOKEN` is used for private repos.

## Installer behavior

1. Fetch release metadata from GitHub.
2. If a valid manifest with `chunked: true` and `parts` > 0 exists, download each part and concatenate.
3. Verify `totalBytes`, `sha256`, and `gzip -t`.
4. If the manifest is missing or fails, download the full tarball.

Tarball, manifest, and `.part-*` files are gitignored. GitHub Actions builds them on the runner and uploads them to the Release; they are not committed.
