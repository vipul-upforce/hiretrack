import CVBatchProcessor from "./components/cv-batch-processor";

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4 mt-2">
      <h1 className="text-3xl font-bold mb-6">CV Batch Processing System</h1>
      <CVBatchProcessor />
    </main>
  );
}
