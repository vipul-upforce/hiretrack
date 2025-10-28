import * as crypto from "crypto";

// Cache to store organization-specific JWT secrets
const jwtSecretCache: Map<string, string> = new Map();

// Function to generate a deterministic JWT secret based on organizationId
export function generateOrgJwtSecret(organizationId: string): string {
  console.log(
    organizationId,
    "++++++++++++++++++++ organizationId in generateOrgJwtSecret"
  );
  if (!organizationId) {
    throw new Error("organizationId is required");
  }

  //   // Check if secret already exists for this organizationId
  //   if (jwtSecretCache.has(organizationId)) {
  //     const cachedSecret = jwtSecretCache.get(organizationId)!;
  //     return cachedSecret;
  //   }

  //   // Generate a deterministic hash using organizationId
  //   const hash: string = crypto
  //     .createHash("sha256")
  //     .update(organizationId)
  //     .digest("base64");

  //   // Trim to a reasonable length (e.g., 44 characters for base64 SHA-256)
  //   const secret: string = hash.slice(0, 44);

  // Store in cache
  //   jwtSecretCache.set(organizationId, secret);

  return organizationId;
}
