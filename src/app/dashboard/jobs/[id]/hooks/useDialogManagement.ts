import { useState, useEffect } from 'react';

interface UseDialogManagementReturn {
  // Dialog states
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
  isConfirmLaneDeleteOpen: boolean;
  setIsConfirmLaneDeleteOpen: (open: boolean) => void;
  isLaneEditOpen: boolean;
  setIsLaneEditOpen: (open: boolean) => void;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  isCustomFieldsOpen: boolean;
  setIsCustomFieldsOpen: (open: boolean) => void;
  isAnalyticsOpen: boolean;
  setIsAnalyticsOpen: (open: boolean) => void;
  isEmailSettingsOpen: boolean;
  setIsEmailSettingsOpen: (open: boolean) => void;
  isPromptConfirmOpen: boolean;
  setIsPromptConfirmOpen: (open: boolean) => void;
  isChecklistConfigOpen: boolean;
  setIsChecklistConfigOpen: (open: boolean) => void;

  // Other states
  candidateToDelete: string | null;
  setCandidateToDelete: (id: string | null) => void;
  laneToEdit: string | null;
  setLaneToEdit: (lane: string | null) => void;
  initialLaneToEdit: string | null;
  setInitialLaneToEdit: (lane: string | null) => void;
  droppedFileData: File | null;
  setDroppedFileData: (file: File | null) => void;
  isFileOver: boolean;
  setIsFileOver: (over: boolean) => void;
  pendingPromptValue: boolean;
  setPendingPromptValue: (value: boolean) => void;
  checklistConfigLane: {
    laneId: string;
    laneName: string;
    initialTab?: 'incoming' | 'outgoing';
  } | null;
  setChecklistConfigLane: (
    config: {
      laneId: string;
      laneName: string;
      initialTab?: 'incoming' | 'outgoing';
    } | null,
  ) => void;
}

export const useDialogManagement = (): UseDialogManagementReturn => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(
    null,
  );
  const [isConfirmLaneDeleteOpen, setIsConfirmLaneDeleteOpen] = useState(false);
  const [laneToEdit, setLaneToEdit] = useState<string | null>(null);
  const [initialLaneToEdit, setInitialLaneToEdit] = useState<string | null>(
    null,
  );
  const [isChecklistConfigOpen, setIsChecklistConfigOpen] = useState(false);
  const [checklistConfigLane, setChecklistConfigLane] = useState<{
    laneId: string;
    laneName: string;
    initialTab?: 'incoming' | 'outgoing';
  } | null>(null);
  const [droppedFileData, setDroppedFileData] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLaneEditOpen, setIsLaneEditOpen] = useState(false);
  const [isFileOver, setIsFileOver] = useState(false);
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [isPromptConfirmOpen, setIsPromptConfirmOpen] = useState(false);
  const [pendingPromptValue, setPendingPromptValue] = useState(false);

  // Clear dropped file data when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setDroppedFileData(null);
    }
  }, [isDialogOpen]);

  // Sync initial lane to edit
  useEffect(() => {
    if (laneToEdit && initialLaneToEdit === null) {
      setInitialLaneToEdit(laneToEdit);
    }
  }, [laneToEdit, initialLaneToEdit]);

  // Clear lane edit state when dialog closes
  useEffect(() => {
    if (!isLaneEditOpen) {
      setInitialLaneToEdit(null);
      setLaneToEdit(null);
    }
  }, [isLaneEditOpen]);

  return {
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isConfirmLaneDeleteOpen,
    setIsConfirmLaneDeleteOpen,
    isLaneEditOpen,
    setIsLaneEditOpen,
    isDialogOpen,
    setIsDialogOpen,
    isCustomFieldsOpen,
    setIsCustomFieldsOpen,
    isAnalyticsOpen,
    setIsAnalyticsOpen,
    isEmailSettingsOpen,
    setIsEmailSettingsOpen,
    isPromptConfirmOpen,
    setIsPromptConfirmOpen,
    isChecklistConfigOpen,
    setIsChecklistConfigOpen,
    candidateToDelete,
    setCandidateToDelete,
    laneToEdit,
    setLaneToEdit,
    initialLaneToEdit,
    setInitialLaneToEdit,
    droppedFileData,
    setDroppedFileData,
    isFileOver,
    setIsFileOver,
    pendingPromptValue,
    setPendingPromptValue,
    checklistConfigLane,
    setChecklistConfigLane,
  };
};
