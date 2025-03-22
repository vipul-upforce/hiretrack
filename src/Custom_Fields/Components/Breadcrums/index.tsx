"use client"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { BreadcrumbsProps } from "@/Custom_Fields/Types";
import React, { memo } from "react";

const Breadcrumbs = memo(({ breadcrumbs }: BreadcrumbsProps) => {
  return (
    <div>
      <Breadcrumb className="p-2 font-semibold text-xl">
        <BreadcrumbList>
          {breadcrumbs.map((breadcrumb, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem
                key={index}
                className="text-base cursor-pointer capitalize"
              >
                {breadcrumb}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
});

Breadcrumbs.displayName = "Breadcrumbs";

export default Breadcrumbs;
