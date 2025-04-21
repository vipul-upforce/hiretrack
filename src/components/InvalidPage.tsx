import Image from "next/image";

interface InvalidPageProps {
  message?: string;
}

export default function InvalidPage({
  message = "This page is not accessible",
}: InvalidPageProps) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <Image
        src="/notfound.jpg"
        alt="Invalid page illustration"
        width={400}
        height={400}
        className="mb-8"
      />
      <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
        {message}
      </h1>
    </div>
  );
}
