import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const ExpandableDescription = ({ description }:{description: string}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        setIsOverflowing(contentRef.current.scrollHeight > 100);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      window.removeEventListener('resize', checkOverflow);
    };
  }, [description]);

  const displayText = description || "No description Found";

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={`text-sm whitespace-pre-wrap break-words transition-all duration-200 ease-in-out ${
          isExpanded ? "max-h-full pb-10" : "max-h-24 h-[100px] overflow-hidden"
        }`}
      >
        <p
          className="text-sm whitespace-pre-wrap"
          style={{ wordWrap: "break-word" }}
        >
          {displayText}
        </p>
      </div>
      
      {isOverflowing && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-end justify-end absolute bottom-0 h-[40px] left-1/2 transform -translate-x-1/2 w-[100%] bg-gradient-to-b from-transparent to-white transition-colors duration-200"
        >
          {isExpanded ? (
            <div className="flex items-center justify-center font-semibold bg-gradient-to-b from-transparent to-white rounded-lg px-2 py-2 transition-all duration-200">
              <ChevronUp className="h-4 w-4 mr-2" />
              Show Less
            </div>
          ) : (
            <div className="relative top-[30px] flex items-center justify-center font-semibold bg-gradient-to-b from-transparent to-white rounded-lg px-2 py-2 transition-all duration-200">
              <ChevronDown className="h-4 w-4 mr-2" />
              Show More
            </div>
          )}
        </button>
      )}
    </div>
  );
};

export default ExpandableDescription;