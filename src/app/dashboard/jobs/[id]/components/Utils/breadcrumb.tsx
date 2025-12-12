'use client';

import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

interface BreadcrumbProps {
  jobTitle?: string;
  links: { title: string; href: string }[];
}

export function Breadcrumb({ jobTitle, links }: BreadcrumbProps) {
  return (
    <nav className="flex items-center text-sm font-medium text-muted-foreground">
      <Link
        href="/dashboard"
        className="flex items-center transition-colors hover:text-foreground"
      >
        <Home className="mr-2 h-4 w-4" />
        Dashboard
      </Link>
      {links.map((link) => (
        <React.Fragment key={link.href + link.title}>
          <ChevronRight className="mx-2 h-4 w-4" />
          <Link
            href={link.href}
            className="transition-colors hover:text-foreground"
          >
            {link.title}
          </Link>
        </React.Fragment>
      ))}
      <ChevronRight className="mx-2 h-4 w-4" />
      <span className="line-clamp-1 font-semibold text-foreground">
        {jobTitle}
      </span>
    </nav>
  );
}
