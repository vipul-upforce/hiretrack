"use client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { BreadcrumbsProps } from "@/Custom_Fields/Types";
import { ChevronRight, Home } from "lucide-react";
import React, { memo } from "react";

const Breadcrumbs = memo(({ breadcrumbs }: BreadcrumbsProps) => {
  return (
    <div className="mb-6">
      <nav className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((breadcrumb, index) => (
          <React.Fragment key={index}>
            {index === 0 && (
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Home className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              )}
              
              <div className={`
                px-3 py-2 rounded-lg transition-all duration-200
                ${
                  index === breadcrumbs.length - 1
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-semibold'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer font-medium'
                }
              `}>
                {breadcrumb}
              </div>
            </div>
          </React.Fragment>
        ))}
      </nav>
    </div>
  );
});

Breadcrumbs.displayName = "Breadcrumbs";

export default Breadcrumbs;
