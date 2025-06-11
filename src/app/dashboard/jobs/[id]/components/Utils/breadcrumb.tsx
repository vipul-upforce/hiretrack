"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import React from "react";

interface BreadcrumbProps {
  jobTitle?: string;
  links: { title: string; href: string }[];
}

export function Breadcrumb({ jobTitle, links }: BreadcrumbProps) {
  return (
    <nav className="flex items-center text-sm text-muted-foreground">
      <Link
        href="/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4 mr-2" />
        Dashboard
      </Link>
      {links.map((link, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4 mx-2" />
          <Link
            href={link.href}
            className="hover:text-foreground transition-colors"
          >
            {link.title}
          </Link>
        </React.Fragment>
      ))}
      <ChevronRight className="h-4 w-4 mx-2" />
      <span className="text-foreground line-clamp-1">{jobTitle}</span>
    </nav>
  );
}
