import React, { JSX } from 'react';

export type CustomFieldDialogProps = {
  isOpen?: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
  regular?: boolean;
  modal?: boolean;
};

export type BreadcrumbsProps = {
  breadcrumbs: JSX.Element[];
};

export type AddFormIDProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  formId?: string;
};
