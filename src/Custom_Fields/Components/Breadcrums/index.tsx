'use client';

import { BreadcrumbsProps } from '@/Custom_Fields/Types';
import { ChevronRight, Home } from 'lucide-react';
import React, { memo } from 'react';

const Breadcrumbs = memo(({ breadcrumbs }: BreadcrumbsProps) => (
  <div className="mb-6">
    <nav className="flex items-center space-x-2 text-sm">
      {breadcrumbs.map((breadcrumb, index) => (
        <React.Fragment key={breadcrumb.toString()}>
          {index === 0 && (
            <div className="flex items-center space-x-2">
              <div
                className="rounded-lg p-2"
                style={{
                  backgroundColor:
                    'rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)',
                }}
              >
                <Home
                  className="h-4 w-4"
                  style={{ color: 'var(--portal-primary, #6366f1)' }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            )}

            <div
              className={`rounded-lg px-3 py-2 transition-all duration-200 ${
                index === breadcrumbs.length - 1
                  ? 'bg-blue-100 font-semibold text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                  : 'cursor-pointer font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              } `}
            >
              {breadcrumb}
            </div>
          </div>
        </React.Fragment>
      ))}
    </nav>
  </div>
));

Breadcrumbs.displayName = 'Breadcrumbs';

export default Breadcrumbs;
