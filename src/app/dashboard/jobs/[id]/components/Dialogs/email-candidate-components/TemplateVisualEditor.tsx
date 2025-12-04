"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Edit2, Eye, Bold, Italic, Underline, List, ListOrdered, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TemplateVisualEditorProps {
  htmlContent: string;
  onContentChange: (html: string) => void;
  className?: string;
}

/**
 * Visual editor for email templates that allows inline text editing
 * while preserving HTML structure and styling
 */
export const TemplateVisualEditor: React.FC<TemplateVisualEditorProps> = ({
  htmlContent,
  onContentChange,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(htmlContent);
  const [isHovering, setIsHovering] = useState(false);
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
    unorderedList: false,
    orderedList: false,
  });
  const [selectedColor, setSelectedColor] = useState<string>("#000000");

  // Check current formatting state
  const checkFormatState = useCallback(() => {
    if (!containerRef.current || !isEditing) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    try {
      setFormatState({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        unorderedList: document.queryCommandState("insertUnorderedList"),
        orderedList: document.queryCommandState("insertOrderedList"),
      });

      // Get text color - try to get computed style if execCommand doesn't work
      let color = document.queryCommandValue("foreColor");
      if (!color || color === "rgb(0, 0, 0)" || color === "#000000") {
        // Try to get color from computed style
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.TEXT_NODE 
          ? container.parentElement 
          : container as HTMLElement;
        
        if (element) {
          const computedStyle = window.getComputedStyle(element);
          color = computedStyle.color;
          // Convert rgb to hex if needed
          if (color.startsWith("rgb")) {
            const rgb = color.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
              const r = parseInt(rgb[0]).toString(16).padStart(2, "0");
              const g = parseInt(rgb[1]).toString(16).padStart(2, "0");
              const b = parseInt(rgb[2]).toString(16).padStart(2, "0");
              color = `#${r}${g}${b}`;
            }
          }
        }
      }
      
      if (color) {
        setSelectedColor(color);
      }
    } catch (e) {
      // Ignore errors when checking format state
    }
  }, [isEditing]);

  // Update edited content when htmlContent prop changes
  // If in edit mode and content changes significantly (template change), exit edit mode first
  useEffect(() => {
    if (containerRef.current) {
      const currentContent = containerRef.current.innerHTML;
      const contentChanged = currentContent !== htmlContent;
      
      // If content changed significantly (likely a template change), reset edit mode
      if (contentChanged && isEditing) {
        // Exit edit mode to allow content update
        setIsEditing(false);
        setEditedContent(htmlContent);
        containerRef.current.innerHTML = htmlContent;
      } else if (!isEditing && contentChanged) {
        // Normal update when not editing
        setEditedContent(htmlContent);
        containerRef.current.innerHTML = htmlContent;
      } else if (!isEditing && !containerRef.current.innerHTML) {
        // Initial content load
        setEditedContent(htmlContent);
        containerRef.current.innerHTML = htmlContent;
      }
    } else if (!isEditing) {
      // Set content state even if container not ready
      setEditedContent(htmlContent);
    }
  }, [htmlContent, isEditing]);

  // Update format state on selection change
  useEffect(() => {
    if (!isEditing) return;

    const handleSelectionChange = () => {
      checkFormatState();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [isEditing, checkFormatState]);

  // Execute formatting command
  const executeCommand = useCallback(
    (command: string, value?: string) => {
      if (!containerRef.current || !isEditing) return;

      containerRef.current.focus();
      document.execCommand(command, false, value);
      checkFormatState();

      // Trigger input event to update content
      const event = new Event("input", { bubbles: true });
      containerRef.current.dispatchEvent(event);
    },
    [isEditing, checkFormatState]
  );

  // Handle content changes from contenteditable
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const newContent = e.currentTarget.innerHTML;
      setEditedContent(newContent);
      onContentChange(newContent);
      checkFormatState();
    },
    [onContentChange, checkFormatState]
  );

  // Handle paste events to clean up pasted content
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      // Trigger input event manually
      if (containerRef.current) {
        const event = new Event("input", { bubbles: true });
        containerRef.current.dispatchEvent(event);
      }
    }
  }, []);

  // Make text elements editable on click
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isEditing) return;

      const target = e.target as HTMLElement;
      // Only allow editing text nodes and inline elements
      if (
        target.tagName === "P" ||
        target.tagName === "SPAN" ||
        target.tagName === "H1" ||
        target.tagName === "H2" ||
        target.tagName === "H3" ||
        target.tagName === "H4" ||
        target.tagName === "H5" ||
        target.tagName === "H6" ||
        target.tagName === "LI" ||
        target.tagName === "A" ||
        target.tagName === "STRONG" ||
        target.tagName === "EM" ||
        target.tagName === "DIV"
      ) {
        // Focus the element for editing
        target.focus();
        // Check format state after a short delay to allow selection to settle
        setTimeout(() => checkFormatState(), 10);
      }
    },
    [isEditing, checkFormatState]
  );

  // Prevent editing of structural elements and handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isEditing) return;

      const target = e.target as HTMLElement;

      // Handle keyboard shortcuts for formatting
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            executeCommand("bold");
            return;
          case "i":
            e.preventDefault();
            executeCommand("italic");
            return;
          case "u":
            e.preventDefault();
            executeCommand("underline");
            return;
        }
      }

      // Prevent deletion of important structural elements
      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        (target.tagName === "DIV" || target.tagName === "TABLE")
      ) {
        // Allow deletion only if there's content inside
        if (target.textContent?.trim() === "") {
          e.preventDefault();
        }
      }
    },
    [isEditing, executeCommand]
  );

  // Initialize content when component mounts
  useEffect(() => {
    if (containerRef.current && !containerRef.current.innerHTML) {
      containerRef.current.innerHTML = editedContent;
    }
  }, [editedContent]);

  const toggleEditMode = () => {
    const newEditState = !isEditing;
    setIsEditing(newEditState);
    
    if (newEditState && containerRef.current) {
      // When entering edit mode, ensure content is set and focus
      containerRef.current.innerHTML = editedContent;
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.focus();
          checkFormatState();
        }
      }, 100);
    } else if (!newEditState && containerRef.current) {
      // When exiting edit mode, update content from DOM
      const currentHtml = containerRef.current.innerHTML;
      setEditedContent(currentHtml);
      onContentChange(currentHtml);
    }
  };

  // Predefined color options
  const colorOptions = [
    { name: "Black", value: "#000000" },
    { name: "Dark Gray", value: "#333333" },
    { name: "Gray", value: "#666666" },
    { name: "Light Gray", value: "#999999" },
    { name: "Red", value: "#FF0000" },
    { name: "Orange", value: "#FF6600" },
    { name: "Yellow", value: "#FFCC00" },
    { name: "Green", value: "#00CC00" },
    { name: "Blue", value: "#0066FF" },
    { name: "Purple", value: "#6600CC" },
    { name: "Pink", value: "#FF00CC" },
    { name: "Brown", value: "#996633" },
  ];

  return (
    <div className={cn("relative border rounded-lg overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
          {isEditing ? (
            <>
              <Edit2 className="h-4 w-4" />
              <span>Visual Edit Mode - Click on any text to edit</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              <span>Preview Mode</span>
            </>
          )}
        </div>
        <Button
          type="button"
          variant={isEditing ? "primary" : "outline"}
          size="sm"
          onClick={toggleEditMode}
          className="gap-2"
        >
          {isEditing ? (
            <>
              <Eye className="h-4 w-4" />
              Preview
            </>
          ) : (
            <>
              <Edit2 className="h-4 w-4" />
              Edit Template
            </>
          )}
        </Button>
      </div>

      {/* Formatting Toolbar - Only visible in edit mode */}
      {isEditing && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 p-2 flex items-center gap-1 flex-wrap">
          <Toggle
            size="sm"
            pressed={formatState.bold}
            onPressedChange={() => executeCommand("bold")}
            aria-label="Bold"
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Toggle>

          <Toggle
            size="sm"
            pressed={formatState.italic}
            onPressedChange={() => executeCommand("italic")}
            aria-label="Italic"
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Toggle>

          <Toggle
            size="sm"
            pressed={formatState.underline}
            onPressedChange={() => executeCommand("underline")}
            aria-label="Underline"
            title="Underline (Ctrl+U)"
          >
            <Underline className="h-4 w-4" />
          </Toggle>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

          <Toggle
            size="sm"
            pressed={formatState.unorderedList}
            onPressedChange={() => executeCommand("insertUnorderedList")}
            aria-label="Bullet List"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Toggle>

          <Toggle
            size="sm"
            pressed={formatState.orderedList}
            onPressedChange={() => executeCommand("insertOrderedList")}
            aria-label="Numbered List"
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2"
                title="Text Color"
              >
                <Palette className="h-4 w-4" />
                <div
                  className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: selectedColor }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <div className="space-y-2">
                <div className="text-sm font-medium mb-2">Text Color</div>
                <div className="grid grid-cols-6 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => {
                        executeCommand("foreColor", color.value);
                        setSelectedColor(color.value);
                      }}
                      className={cn(
                        "w-8 h-8 rounded border-2 transition-all hover:scale-110",
                        selectedColor === color.value
                          ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                          : "border-gray-300 dark:border-gray-600"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                      aria-label={color.name}
                    />
                  ))}
                </div>
                <div className="pt-2 border-t">
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                    Custom Color
                  </label>
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => {
                      const color = e.target.value;
                      executeCommand("foreColor", color);
                      setSelectedColor(color);
                    }}
                    className="w-full h-8 rounded cursor-pointer"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Editable Content Area */}
      <div
        ref={containerRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cn(
          "p-4 bg-white dark:bg-black max-h-[400px] overflow-y-auto",
          "prose prose-sm max-w-none",
          isEditing && "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          isEditing && isHovering && "[&_p]:cursor-text [&_h1]:cursor-text [&_h2]:cursor-text [&_h3]:cursor-text [&_span]:cursor-text [&_a]:cursor-text",
          !isEditing && "cursor-default"
        )}
        style={{
          minHeight: "300px",
        }}
      />

      {/* Helper Text */}
      {isEditing && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
          💡 <strong>Tip:</strong> Click on any text element to edit it. HTML structure and styling are preserved automatically.
        </div>
      )}
    </div>
  );
};

