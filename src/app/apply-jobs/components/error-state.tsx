import Image from 'next/image';

interface ErrorStateProps {
  imageUrl: string;
  errorMessage?: string | boolean | null;
}

export function ErrorState({ imageUrl, errorMessage }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12">
      <Image
        src={imageUrl || '/placeholder.svg'}
        alt="Error"
        width={600}
        height={600}
        className="mb-6"
      />
      {errorMessage && typeof errorMessage === 'string' && (
        <p className="text-center font-semibold text-muted-foreground">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
