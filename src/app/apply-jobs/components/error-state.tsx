import Image from "next/image";

interface ErrorStateProps {
  imageUrl: string;
  errorMessage?: string;
}

export function ErrorState({ imageUrl, errorMessage }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Image
        src={imageUrl || "/placeholder.svg"}
        alt="Error"
        width={600}
        height={600}
        className="mb-6"
      />
      {errorMessage && (
        <p className="text-center text-muted-foreground font-semibold">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
