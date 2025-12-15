'use client';

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import {
  useGetMultipleOrgConfigsQuery,
  useUpdateMultipleOrgMutation,
} from '@/lib/features/settings/settingsApi';
import { setAllowMultipleOrgs } from '@/lib/features/org/orgSlice';
import MultipleOrgLoadingSkeleton from './loading-skeleton';
import MultipleOrgForm from './multiple-org-form';
import { MultipleOrgsValues } from './schema';

interface MultipleOrgsConfigsProps {
  onClose: () => void;
}

export default function MultipleOrgsConfigs({
  onClose,
}: MultipleOrgsConfigsProps) {
  const { toast } = useToast();
  const dispatch = useDispatch();

  const { data, isLoading, refetch, error } =
    useGetMultipleOrgConfigsQuery(undefined);
  const [updateMultipleOrgConfigs, { isLoading: isUpdating }] =
    useUpdateMultipleOrgMutation();

  const isPermissionDenied = error && 'status' in error && error.status === 403;

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleSubmit = async (values: MultipleOrgsValues) => {
    if (isPermissionDenied) {
      toast({
        title: 'Not Allowed',
        description: 'You do not have permission to perform this action.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateMultipleOrgConfigs(values).unwrap();
      dispatch(setAllowMultipleOrgs(values.multipleOrg));

      toast({
        title: 'Success',
        description: 'Organization settings updated successfully.',
      });

      refetch();
      onClose();
    } catch (err) {
      logger.error('Failed to update org configs:', err);
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <MultipleOrgLoadingSkeleton />;
  }

  return (
    <MultipleOrgForm
      initialValues={{ multipleOrg: !!data?.multipleOrg }}
      onSubmit={handleSubmit}
      onClose={onClose}
      isSubmitting={isUpdating}
      isReadOnly={!!isPermissionDenied}
    />
  );
}
