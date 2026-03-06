import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GroupMember } from '../api/groups';

const STORAGE_KEY = 'powderlink_group';

interface StoredGroup {
  groupId: string;
  code: string;
  name: string;
  role: 'leader' | 'member';
}

interface GroupContextValue {
  group: StoredGroup | null;
  members: GroupMember[];
  setGroup: (g: StoredGroup | null) => void;
  setMembers: (m: GroupMember[]) => void;
  clearGroup: () => void;
  isLoading: boolean;
}

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const [group, setGroupState] = useState<StoredGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setGroupState(JSON.parse(raw));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setGroup = useCallback((g: StoredGroup | null) => {
    setGroupState(g);
    if (g) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(g));
    } else {
      AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearGroup = useCallback(() => {
    setGroup(null);
    setMembers([]);
  }, [setGroup]);

  return (
    <GroupContext.Provider value={{ group, members, setGroup, setMembers, clearGroup, isLoading }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup(): GroupContextValue {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error('useGroup must be used within GroupProvider');
  return ctx;
}
