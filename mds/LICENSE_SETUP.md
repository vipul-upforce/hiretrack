# License System Setup

This document explains how to set up and use the license validation system in HireTrack.

## Overview

The license system ensures that only authorized users can run the application by:

1. **Machine-specific licensing**: Each license is tied to a specific machine
2. **Online validation**: Regular validation against an external API
3. **File-based storage**: License data stored in `license.json`

## Quick Setup

### 1. Create License File

Run the setup script:

```bash
node scripts/setup-license.js
```

Or manually create `license.json` in the project root:

```json
{
  "licenseKey": "your-license-key-here",
  "machineCode": "your-machine-code-here",
  "email": "user@example.com",
  "version": "1.0.0",
  "lastValidated": 1640995200000,
  "isValid": true
}
```

### 2. Set Environment Variable

Add to your `.env` file:

```env
LICENSE_VALIDATION_URL=https://your-license-server.com
```

### 3. Test License Validation

Visit: `http://localhost:3000/api/license-validate`

## API Endpoints

### `/api/license-validate`

**GET** - Check license status

```bash
curl http://localhost:3000/api/license-validate
```

**POST** - Force license re-validation

```bash
curl -X POST http://localhost:3000/api/license-validate \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

**Rate Limiting:**

- **Limit**: 10 requests per hour per IP address
- **Headers**: Includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Error**: Returns 429 status with `Retry-After` header when limit exceeded

**Response:**

```json
{
  "valid": true,
  "license": {
    "email": "user@example.com",
    "lastValidated": 1640995200000
  },
  "asset": "https://github.com/yourcompany/hiretrack/releases/download/v1.0.0/hiretrack-v1.0.0.tar.gz"
}
```

**Rate Limit Exceeded Response:**

```json
{
  "error": "License validation rate limit exceeded"
}
```

## Integration Examples

### 1. Layout Protection

Wrap your main layout with `LicenseGuard`:

```tsx
import LicenseGuard from "@/components/LicenseGuard";

export default function RootLayout({ children }) {
  return <LicenseGuard>{children}</LicenseGuard>;
}
```

### 2. Organization Registration Protection

Wrap organization creation with `OrganizationLicenseCheck`:

```tsx
import OrganizationLicenseCheck from "@/components/OrganizationLicenseCheck";

export default function OrganizationRegistration() {
  const [canCreateOrg, setCanCreateOrg] = useState(false);

  return (
    <OrganizationLicenseCheck
      onLicenseValid={() => setCanCreateOrg(true)}
      onLicenseInvalid={() => setCanCreateOrg(false)}
    >
      {canCreateOrg ? (
        <OrganizationForm />
      ) : (
        <div>License verification required</div>
      )}
    </OrganizationLicenseCheck>
  );
}
```

## License Validation Flow

1. **Read License File**: System reads `license.json` from project root
2. **Generate Machine Code**: Creates machine-specific identifier
3. **Compare Machine Codes**: Ensures license is for current machine
4. **External Validation**: Calls your license server API
5. **Update Status**: Updates license file with validation result

## External API Integration

Your license server should implement:

```http
POST /api/license/validate
Content-Type: application/json

{
  "licenseKey": "abc123def456",
  "machineCode": "xyz789uvw012",
  "installedVersion": "1.0.0"
}
```

**Response:**

```json
{
  "valid": true,
  "asset": "https://github.com/yourcompany/hiretrack/releases/download/v1.0.0/hiretrack-v1.0.0.tar.gz"
}
```

## Error Handling

### Common Error Scenarios

1. **No License File**

   ```json
   {
     "valid": false,
     "error": "No license found. Please ensure license.json exists in the project root.",
     "hasLicenseFile": false
   }
   ```

2. **Machine Code Mismatch**

   ```json
   {
     "valid": false,
     "error": "Machine code mismatch. This license is not valid for this machine.",
     "hasLicenseFile": true,
     "machineCodeMismatch": true
   }
   ```

3. **API Validation Failed**
   ```json
   {
     "valid": false,
     "error": "License validation failed",
     "hasLicenseFile": true,
     "apiError": true
   }
   ```

## Security Features

- **Machine Binding**: License tied to specific machine characteristics
- **File Validation**: Checks license file integrity
- **Online Verification**: Regular validation against external API
- **Error Handling**: Graceful handling of network issues

## Troubleshooting

### License Not Found

- Ensure `license.json` exists in project root
- Check file permissions
- Verify JSON format is valid

### Machine Code Mismatch

- License was created for different machine
- Contact support to transfer license
- Or create new license for current machine

### API Validation Failed

- Check `LICENSE_VALIDATION_URL` environment variable
- Verify network connectivity
- Check license server status

### Rate Limit Exceeded

- **Error**: "License validation rate limit exceeded"
- **Limit**: 10 requests per hour per IP address
- **Solution**: Wait for the rate limit window to reset (1 hour)
- **Headers**: Check `X-RateLimit-Reset` header for exact reset time
- **Retry**: Use `Retry-After` header value to know when to retry

### Testing License System

1. **Create Test License**:

   ```bash
   node scripts/setup-license.js
   ```

2. **Test API Endpoint**:

   ```bash
   curl http://localhost:3000/api/license-validate
   ```

3. **Check License Status**:
   Visit `/api/license-validate` in browser

## Support

For license-related issues:

- Email: support@yourcompany.com
- Check license status at `/api/license-validate`
- Review error messages in browser console
