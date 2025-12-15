import {
  useState, useRef, useEffect, ReactNode,
} from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

function ExpandableDescription({
  description,
  open,
}: {
  description: string | ReactNode;
  height?: number;
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
    <div className="relative transition-all duration-200 ease-in-out flex">
      <div
        ref={contentRef}
        className={`text-sm whitespace-pre-wrap flex  break-words transition-all duration-200 ease-in-out
          ${isExpanded ? 'max-h-full pb-5' : 'max-h-[60px] h-auto overflow-hidden'}`}
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
            className="text-sm whitespace-pre-wrap pb-0 ml-[1rem]"
            style={{ wordWrap: 'break-word' }}
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
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-end justify-end absolute bottom-0 h-[40px] left-1/2 transform -translate-x-1/2 w-[100%] bg-gradient-to-b from-transparent to-white dark:to-gray-900 transition-colors duration-200"
        >
          {isExpanded ? (
            <div className="flex items-center justify-center font-semibold bg-gradient-to-b from-transparent to-white dark:to-gray-900 rounded-lg px-2 py-2 transition-all duration-200">
              <ChevronUp className="h-4 w-4 mr-2" />
              {/* Show Less */}
            </div>
          ) : (
            <div className="relative top-[30px] flex items-center justify-center font-semibold bg-gradient-to-b from-transparent to-white dark:to-gray-900 rounded-lg px-2 py-2 transition-all duration-200">
              <ChevronDown className="h-4 w-4 mr-2" />
              {/* Show More */}
            </div>
          )}
        </button>
      )}
    </div>
  );
}

export default ExpandableDescription;
