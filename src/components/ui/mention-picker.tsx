'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';
import { User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { userCacheService } from '@/lib/services/userCache';
import { cn } from '@/lib/utils';
import logger from '@/lib/logger';

interface MentionUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface MentionPickerProps {
  onMentionSelect: (user: MentionUser) => void;
  onMentionRemove: (userId: string) => void;
  selectedMentions: MentionUser[];
  className?: string;
  organizationId: string;
  currentUserRole: string;
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  position?: 'top' | 'bottom';
  isRemarkPrivate?: boolean;
}

export const MentionPicker = forwardRef<
  { handleKeyDown: (e: React.KeyboardEvent) => void },
  MentionPickerProps
>(
  (
    {
      onMentionSelect,
      onMentionRemove,
      selectedMentions,
      className,
      organizationId,
      currentUserRole,
      isOpen,
      onClose,
      searchQuery,
      onSearchQueryChange,
      position = 'bottom',
      isRemarkPrivate = true,
    },
    ref,
  ) => {
    const [users, setUsers] = useState<MentionUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Don't show mention picker for interviewers
    const shouldShowMentionPicker =
      currentUserRole === 'admin' || currentUserRole === 'hr';

    // Load users using the cache service
    const loadUsers = useCallback(async () => {
      if (!organizationId || !shouldShowMentionPicker) return;

      setLoading(true);
      try {
        const users = await userCacheService.getUsers(organizationId);
        setUsers(users);
      } catch (error) {
        logger.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    }, [organizationId, shouldShowMentionPicker]);

    // Load users when component mounts or organizationId changes
    useEffect(() => {
      if (organizationId && shouldShowMentionPicker) {
        loadUsers();
      }
    }, [organizationId, shouldShowMentionPicker, loadUsers]); // Added missing dependencies

    // Filter users based on search query and remark privacy
    const filteredUsers = useMemo(() => {
      // First filter by role based on remark privacy
      let roleFilteredUsers = users;
      if (isRemarkPrivate) {
        // Private remarks: only show HR and admin
        roleFilteredUsers = users.filter(
          (user) => user.role === 'hr' || user.role === 'admin',
        );
      } else {
        // Public remarks: show HR, admin, and interviewer
        roleFilteredUsers = users.filter(
          (user) =>
            user.role === 'hr' ||
            user.role === 'admin' ||
            user.role === 'interviewer',
        );
      }

      // Then filter by search query if provided
      if (!searchQuery) return roleFilteredUsers;

      const query = searchQuery.toLowerCase();
      return roleFilteredUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query),
      );
    }, [users, searchQuery, isRemarkPrivate]);

    // Handle user selection
    const handleUserSelect = (user: MentionUser) => {
      onMentionSelect(user);
      onClose();
      onSearchQueryChange('');
      setSelectedIndex(0); // Reset selection
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen || filteredUsers.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = prev < filteredUsers.length - 1 ? prev + 1 : 0;
            // If we wrapped around to the first item, reset scroll position
            if (newIndex === 0 && prev === filteredUsers.length - 1) {
              setTimeout(() => {
                if (scrollAreaRef.current) {
                  scrollAreaRef.current.scrollTop = 0;
                }
              }, 10);
            }
            return newIndex;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = prev > 0 ? prev - 1 : filteredUsers.length - 1;
            // If we wrapped around to the last item, scroll to bottom
            if (newIndex === filteredUsers.length - 1 && prev === 0) {
              setTimeout(() => {
                if (scrollAreaRef.current) {
                  scrollAreaRef.current.scrollTop =
                    scrollAreaRef.current.scrollHeight;
                }
              }, 10);
            }
            return newIndex;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredUsers[selectedIndex]) {
            handleUserSelect(filteredUsers[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          onSearchQueryChange('');
          setSelectedIndex(0);
          break;

        default:
          break;
      }
    };

    // Reset selected index when filtered users change
    useEffect(() => {
      setSelectedIndex(0);
    }, [filteredUsers.length, searchQuery]);

    // Scroll selected item into view
    const scrollSelectedIntoView = useCallback(() => {
      if (!scrollAreaRef.current || filteredUsers.length === 0) return;

      // Now scrollAreaRef.current is the actual scrollable container
      const scrollContainer = scrollAreaRef.current;

      const selectedItem = scrollContainer.querySelector(
        `[data-selected-index="${selectedIndex}"]`,
      ) as HTMLElement;

      if (!selectedItem) {
        return;
      }

      // Calculate positions
      const containerScrollTop = scrollContainer.scrollTop;
      const containerHeight = scrollContainer.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemHeight = selectedItem.offsetHeight;

      // Calculate the visible area bounds
      const visibleTop = containerScrollTop;
      const visibleBottom = containerScrollTop + containerHeight;

      // Check if item is above the visible area
      if (itemTop < visibleTop) {
        scrollContainer.scrollTo({
          top: itemTop - 8, // Add small padding
          behavior: 'smooth',
        });
      }
      // Check if item is below the visible area
      else if (itemTop + itemHeight > visibleBottom) {
        scrollContainer.scrollTo({
          top: itemTop + itemHeight - containerHeight + 8, // Add small padding
          behavior: 'smooth',
        });
      }
    }, [selectedIndex, filteredUsers.length]);

    // Scroll selected item into view when selectedIndex changes
    useEffect(() => {
      if (isOpen && filteredUsers.length > 0) {
        // Use a delay to ensure the DOM has updated
        setTimeout(scrollSelectedIntoView, 50);
      }
    }, [selectedIndex, isOpen, filteredUsers.length, scrollSelectedIntoView]);

    // Expose handleKeyDown method to parent component
    useImperativeHandle(ref, () => ({
      handleKeyDown,
    }));

    if (!shouldShowMentionPicker) {
      return null;
    }

    return (
      <div
        className={cn('relative', className)}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Mention picker dropdown */}
        {isOpen && (
          <div
            className={cn(
              'absolute left-0 z-[9999] w-full rounded-lg border border-border bg-background shadow-xl backdrop-blur-sm transition-all duration-200 ease-in-out',
              position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
            )}
          >
            <div className="border-b border-border/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  {filteredUsers.length} user
                  {filteredUsers.length !== 1 ? 's' : ''} available
                </span>
              </div>
            </div>
            <div ref={scrollAreaRef} className="h-60 overflow-auto">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchQuery ? 'No users found' : 'No users available'}
                </div>
              ) : (
                <div className="p-1">
                  {filteredUsers.map((user, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                      <div
                        key={user._id}
                        data-selected-index={index}
                        className={cn(
                          'group flex w-full cursor-pointer items-center gap-3 rounded-md p-3 transition-colors',
                          isSelected
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground',
                        )}
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className="flex-shrink-0">
                          <div
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                              isSelected
                                ? 'from-primary/40 to-primary/30 bg-gradient-to-br'
                                : 'from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 bg-gradient-to-br',
                            )}
                          >
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              'truncate text-sm font-medium',
                              isSelected
                                ? 'text-accent-foreground'
                                : 'group-hover:text-accent-foreground',
                            )}
                          >
                            {user.name}
                          </div>
                          <div
                            className={cn(
                              'truncate text-xs',
                              isSelected
                                ? 'text-accent-foreground/70'
                                : 'text-muted-foreground group-hover:text-accent-foreground/70',
                            )}
                          >
                            {user.email}
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs capitalize transition-colors',
                            isSelected
                              ? 'bg-secondary/70'
                              : 'bg-secondary/50 group-hover:bg-secondary/70',
                          )}
                        >
                          {user.role}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected mentions display */}
        {selectedMentions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedMentions.map((user) => (
              <Badge
                key={user._id}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                <User className="h-3 w-3" />
                {user.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => onMentionRemove(user._id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  },
);

MentionPicker.displayName = 'MentionPicker';
