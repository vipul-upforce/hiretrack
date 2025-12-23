import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

function ExpandableDescription({
  description,
  open,
}: {
  description: string | ReactNode;
  open?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(open || false);
  const [isOverflowing, setIsOverflowing] = useState(open || false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        setIsOverflowing(contentRef.current.scrollHeight > 50);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);

    return () => {
      window.removeEventListener('resize', checkOverflow);
    };
  }, [description]);

  return (
    <div className="relative flex transition-all duration-200 ease-in-out">
      <div
        ref={contentRef}
        className={`flex whitespace-pre-wrap break-words text-sm transition-all duration-200 ease-in-out ${isExpanded ? 'max-h-full pb-5' : 'h-auto max-h-[60px] overflow-hidden'}`}
      >
        {/* {typeof description === "string" ? (
          <p
            className="text-sm whitespace-pre-wrap pb-0"
            style={{ wordWrap: "break-word" }}
          >
            {description || "No description found"}
          </p>
        ) : (
          (description ?? <p>No description found</p>)
        )} */}

        {typeof description === 'string' ? (
          <div
            className="ml-[1rem] whitespace-pre-wrap pb-0 text-sm"
            style={{ wordWrap: 'break-word' }}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: description || 'No description found',
            }}
          />
        ) : (
          (description ?? <p>No description found</p>)
        )}
      </div>

      {isOverflowing && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute bottom-0 left-1/2 flex h-[40px] w-[100%] -translate-x-1/2 transform items-end justify-end bg-gradient-to-b from-transparent to-white transition-colors duration-200 dark:to-gray-900"
        >
          {isExpanded ? (
            <div className="flex items-center justify-center rounded-lg bg-gradient-to-b from-transparent to-white px-2 py-2 font-semibold transition-all duration-200 dark:to-gray-900">
              <ChevronUp className="mr-2 h-4 w-4" />
              {/* Show Less */}
            </div>
          ) : (
            <div className="relative top-[30px] flex items-center justify-center rounded-lg bg-gradient-to-b from-transparent to-white px-2 py-2 font-semibold transition-all duration-200 dark:to-gray-900">
              <ChevronDown className="mr-2 h-4 w-4" />
              {/* Show More */}
            </div>
          )}
        </button>
      )}
    </div>
  );
}

export default ExpandableDescription;
