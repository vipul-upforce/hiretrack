function generateHash(organizationId: string): string {
  let saltedId = "";
  const first = organizationId.charAt(0);
  const last = organizationId.charAt(organizationId.length - 1);
  saltedId = organizationId
    .replace(/a/gi, "@")
    .replace(/e/gi, "3")
    .replace(/i/gi, "!")
    .replace(/o/gi, "0")
    .replace(/u/gi, "_")
    .replace(/s/gi, "$")
    .replace(/t/gi, "7")
    .replace(/n/gi, "N")
    .replace(/m/gi, "2")
    .replace(/l/gi, "1")
    .replace(/k/gi, "9")
    .replace(/j/gi, "8")
    .replace(/h/gi, "7");
  const salt = `${first}${saltedId}${last}_${organizationId.length}`;

  return salt;
}

export function generateOrgJwtSecret(organizationId: string): string {
  if (!organizationId) {
    throw new Error("organizationId is required");
  }
  const hash = generateHash(organizationId);
  return hash;
}
