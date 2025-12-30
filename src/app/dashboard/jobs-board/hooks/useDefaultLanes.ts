'use client';

import { useState, useEffect } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { toast } from '@/hooks/use-toast';
import {
  useGetDefaultLanesQuery,
  useUpdateDefaultLanesMutation,
  useAddDefaultLaneMutation,
  useDeleteDefaultLaneMutation,
} from '@/lib/features/lane/laneApi';

export interface LaneRestrictions {
  nonEditable: string[];
  nonDeletable: string[];
}

export interface DeleteConfirmState {
  lane: string;
  show: boolean;
}

export interface UseDefaultLanesOptions {
  userRole?: string;
}

export interface UseDefaultLanesReturn {
  // State
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  defaultLanes: string[];
  laneRestrictions: LaneRestrictions;
  saving: boolean;
  portalContainer: HTMLElement | null;
  editingLane: string | null;
  editValue: string;
  setEditValue: (value: string) => void;
  newLaneName: string;
  setNewLaneName: (value: string) => void;
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  deleteConfirm: DeleteConfirmState;
  setDeleteConfirm: (state: DeleteConfirmState | ((prev: DeleteConfirmState) => DeleteConfirmState)) => void;
  isLoading: boolean;

  // Computed
  canManage: boolean;

  // Handlers
  handleDragEnd: (result: DropResult) => void;
  startEdit: (lane: string) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
  confirmDelete: (lane: string) => void;
  saveDefaultLanes: () => Promise<void>;
  addNewLane: () => Promise<void>;
  deleteLane: () => Promise<void>;
  isRestricted: (lane: string, type: 'edit' | 'delete') => boolean;
}

/**
 * Custom hook for managing default lanes functionality.
 * Handles all state, API calls, and business logic for default lanes management.
 *
 * @param options - Configuration options including userRole
 * @returns All state, handlers, and computed values needed by the component
 */
export function useDefaultLanes(
  options: UseDefaultLanesOptions = {},
): UseDefaultLanesReturn {
  const { userRole } = options;

  // Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [defaultLanes, setDefaultLanes] = useState<string[]>([]);
  const [laneRestrictions, setLaneRestrictions] = useState<LaneRestrictions>({
    nonEditable: ['applied', 'accepted', 'rejected'],
    nonDeletable: ['applied', 'accepted', 'rejected'],
  });
  const [saving, setSaving] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  // Editing state
  const [editingLane, setEditingLane] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newLaneName, setNewLaneName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    lane: '',
    show: false,
  });

  // RTK Query hooks
  const { data, isLoading } = useGetDefaultLanesQuery(undefined);
  const [updateDefaultLanes] = useUpdateDefaultLanesMutation();
  const [addDefaultLane] = useAddDefaultLaneMutation();
  const [deleteDefaultLane] = useDeleteDefaultLaneMutation();

  // Check if user has permission to manage default lanes
  const canManage = userRole === 'admin' || userRole === 'hr';

  // Set up portal container
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPortalContainer(document.body);
    }
  }, []);

  // Sync data from API
  useEffect(() => {
    if (data) {
      setDefaultLanes(data.defaultLanes || []);
      setLaneRestrictions(
        data.laneRestrictions || {
          nonEditable: ['applied', 'accepted', 'rejected'],
          nonDeletable: ['applied', 'accepted', 'rejected'],
        },
      );
    }
  }, [data]);

  /**
   * Handles drag and drop reordering of lanes
   */
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newLanes = Array.from(defaultLanes);
    const [reorderedItem] = newLanes.splice(result.source.index, 1);
    newLanes.splice(result.destination.index, 0, reorderedItem);

    setDefaultLanes(newLanes);
  };

  /**
   * Starts editing a lane name
   */
  const startEdit = (lane: string) => {
    if (laneRestrictions.nonEditable.includes(lane)) {
      toast({
        title: 'Cannot Edit',
        description: `The "${lane}" lane cannot be edited as it's a system requirement.`,
        variant: 'destructive',
      });
      return;
    }
    setEditingLane(lane);
    setEditValue(lane);
  };

  /**
   * Saves the edited lane name
   */
  const saveEdit = () => {
    if (!editValue.trim()) {
      toast({
        title: 'Invalid Name',
        description: 'Lane name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    if (
      editValue.trim() !== editingLane &&
      defaultLanes.includes(editValue.trim())
    ) {
      toast({
        title: 'Duplicate Name',
        description: 'A lane with this name already exists',
        variant: 'destructive',
      });
      return;
    }

    const newLanes = defaultLanes.map((lane) =>
      lane === editingLane ? editValue.trim() : lane,
    );
    setDefaultLanes(newLanes);
    setEditingLane(null);
    setEditValue('');
  };

  /**
   * Cancels the current edit operation
   */
  const cancelEdit = () => {
    setEditingLane(null);
    setEditValue('');
  };

  /**
   * Confirms deletion of a lane
   */
  const confirmDelete = (lane: string) => {
    if (laneRestrictions.nonDeletable.includes(lane)) {
      toast({
        title: 'Cannot Delete',
        description: `The "${lane}" lane cannot be deleted as it's a system requirement.`,
        variant: 'destructive',
      });
      return;
    }
    setDeleteConfirm({ lane, show: true });
  };

  /**
   * Saves all default lanes to the server
   */
  const saveDefaultLanes = async () => {
    try {
      setSaving(true);
      await updateDefaultLanes(defaultLanes).unwrap();
      toast({
        title: 'Success',
        description: 'Default lanes updated successfully',
      });
      setIsOpen(false);
    } catch (err) {
      toast({
        title: 'Error',
        description:
          typeof err === 'object' &&
          err !== null &&
          'data' in err &&
          typeof (err as unknown as { data?: { message?: string } }).data
            ?.message === 'string'
            ? (err as unknown as { data?: { message?: string } }).data?.message
            : 'Failed to save default lanes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Adds a new lane to the default lanes
   */
  const addNewLane = async () => {
    try {
      await addDefaultLane(newLaneName.trim()).unwrap();
      setNewLaneName('');
      toast({ title: 'Success', description: 'Lane added successfully' });
    } catch (err) {
      toast({
        title: 'Error',
        description:
          typeof err === 'object' &&
          err !== null &&
          'data' in err &&
          typeof (err as unknown as { data?: { message?: string } }).data
            ?.message === 'string'
            ? (err as unknown as { data?: { message?: string } }).data?.message
            : 'Failed to add lane',
        variant: 'destructive',
      });
    }
  };

  /**
   * Deletes a lane from the default lanes
   */
  const deleteLane = async () => {
    try {
      await deleteDefaultLane(deleteConfirm.lane).unwrap();
      toast({ title: 'Success', description: 'Lane removed successfully' });
      setDeleteConfirm({ lane: '', show: false });
    } catch (err) {
      toast({
        title: 'Error',
        description:
          typeof err === 'object' &&
          err !== null &&
          'data' in err &&
          typeof (err as unknown as { data?: { message?: string } }).data
            ?.message === 'string'
            ? (err as unknown as { data?: { message?: string } }).data?.message
            : 'Failed to delete lane',
        variant: 'destructive',
      });
    }
  };

  /**
   * Checks if a lane is restricted from editing or deleting
   */
  const isRestricted = (lane: string, type: 'edit' | 'delete') =>
    type === 'edit'
      ? laneRestrictions.nonEditable.includes(lane)
      : laneRestrictions.nonDeletable.includes(lane);

  return {
    // State
    isOpen,
    setIsOpen,
    defaultLanes,
    laneRestrictions,
    saving,
    portalContainer,
    editingLane,
    editValue,
    setEditValue,
    newLaneName,
    setNewLaneName,
    showAddForm,
    setShowAddForm,
    deleteConfirm,
    setDeleteConfirm,
    isLoading,

    // Computed
    canManage,

    // Handlers
    handleDragEnd,
    startEdit,
    saveEdit,
    cancelEdit,
    confirmDelete,
    saveDefaultLanes,
    addNewLane,
    deleteLane,
    isRestricted,
  };
}

