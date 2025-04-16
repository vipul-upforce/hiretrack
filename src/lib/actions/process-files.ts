export async function processBatch(file: File): Promise<{ success: boolean }> {
  // Simulate processing time
  await new Promise((resolve) =>
    setTimeout(resolve, 1000 + Math.random() * 2000)
  );

  // Simulate occasional failures (10% chance)
  if (Math.random() < 0.5) {
    throw new Error("Failed to process file");
  }

  return { success: true };
}
