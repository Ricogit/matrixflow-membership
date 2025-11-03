import { useState, useEffect } from 'react';
import { Member, MatrixStats } from '@/types/member';
import { getNextStage } from '@/types/stages';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useMatrixLogic = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [rootMember, setRootMember] = useState<Member | undefined>();
  const [currentViewMemberId, setCurrentViewMemberId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load members from database on mount
  useEffect(() => {
    loadMembersFromDatabase();
  }, []);

  const loadMembersFromDatabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Convert database format to app format
        const loadedMembers: Member[] = data.map(dbMember => ({
          id: dbMember.id,
          name: dbMember.name,
          email: dbMember.email,
          phone: dbMember.phone || undefined,
          status: dbMember.status as Member['status'],
          position: {
            level: dbMember.level,
            slot: dbMember.slot,
            parentId: dbMember.upline_id || undefined
          },
          joinDate: dbMember.join_date,
          personalMatrix: (dbMember.personal_matrix || { members: [] }) as unknown as { members: Member[] },
          earnings: Number(dbMember.earnings),
          stage: Number(dbMember.stage.replace('stage', '')),
          directUplineId: dbMember.upline_id || undefined
        }));

        // Find root member (level 0)
        const root = loadedMembers.find(m => m.position.level === 0);
        if (root) {
          setRootMember(root);
          setCurrentViewMemberId(root.id);
        }

        // Set non-root members
        setMembers(loadedMembers.filter(m => m.position.level !== 0));
      }
    } catch (error) {
      console.error('Error loading members:', error);
      toast({
        title: "Error",
        description: "Failed to load members from database",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveMemberToDatabase = async (member: Member) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('members')
        .upsert({
          id: member.id,
          user_id: user.id,
          name: member.name,
          email: member.email,
          phone: member.phone || null,
          status: member.status,
          upline_id: member.position.parentId || null,
          matrix_owner_id: member.position.parentId || null,
          level: member.position.level,
          slot: member.position.slot,
          stage: `stage${member.stage}`,
          earnings: member.earnings,
          join_date: member.joinDate,
          personal_matrix: member.personalMatrix as any
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving member:', error);
      throw error;
    }
  };

  const deleteMemberFromDatabase = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting member:', error);
      throw error;
    }
  };

  // Check if matrix is full (6 positions: 2 in level 1 + 4 in level 2)
  const isMatrixFull = (matrixMembers: Member[]): boolean => {
    return matrixMembers.length >= 6;
  };

  // Find next available position left-to-right in a matrix
  const findNextAvailablePositionInMatrix = (matrixMembers: Member[]): { level: number; slot: number } | null => {
    // Fill left to right: Level 1 (slots 0, 1), then Level 2 (slots 0, 1, 2, 3)
    const allPositions = [
      { level: 1, slot: 0 },
      { level: 1, slot: 1 },
      { level: 2, slot: 0 },
      { level: 2, slot: 1 },
      { level: 2, slot: 2 },
      { level: 2, slot: 3 }
    ];

    for (const pos of allPositions) {
      const exists = matrixMembers.some(m => m.position.level === pos.level && m.position.slot === pos.slot);
      if (!exists) {
        return pos;
      }
    }

    return null; // Matrix is full
  };

  // Legacy function for backwards compatibility
  const findNextAvailablePosition = (): { level: number; slot: number } | null => {
    const currentMatrix = getCurrentViewMatrix();
    return findNextAvailablePositionInMatrix(currentMatrix);
  };

  // Get the L1 parent for a given L2 slot (binary tree structure)
  const getL1ParentForL2Slot = (slot: number): number => {
    // L2P0, L2P1 belong to L1P0
    // L2P2, L2P3 belong to L1P1
    return slot < 2 ? 0 : 1;
  };

  // Find next available position in matrix following binary tree structure
  const findNextPositionInBinaryMatrix = (matrixMembers: Member[], matrixOwnerId: string): { level: number; slot: number; parentMemberId?: string } | null => {
    // Check Level 1 first (slots 0, 1)
    // L1 members should have the matrix owner as their parent
    for (let slot = 0; slot < 2; slot++) {
      const exists = matrixMembers.some(m => m.position.level === 1 && m.position.slot === slot);
      if (!exists) {
        return { level: 1, slot, parentMemberId: matrixOwnerId };
      }
    }

    // Check Level 2 (slots 0, 1, 2, 3) - must check which L1 parent owns each slot
    // L2P0, L2P1 should have L1P0 as parent
    // L2P2, L2P3 should have L1P1 as parent
    for (let slot = 0; slot < 4; slot++) {
      const exists = matrixMembers.some(m => m.position.level === 2 && m.position.slot === slot);
      if (!exists) {
        // Find the L1 parent that owns this L2 slot
        const l1ParentSlot = getL1ParentForL2Slot(slot);
        const l1Parent = matrixMembers.find(m => m.position.level === 1 && m.position.slot === l1ParentSlot);
        
        // L2 positions must have an L1 parent - if it doesn't exist, this slot isn't available yet
        if (!l1Parent) {
          continue;
        }
        
        return { level: 2, slot, parentMemberId: l1Parent.id };
      }
    }

    return null; // Matrix is full
  };

  const addMember = async (memberData: Omit<Member, 'id' | 'joinDate'>) => {
    const newId = crypto.randomUUID();
    
    // If no root member, make this the root
    if (!rootMember) {
      const newRootMember: Member = {
        ...memberData,
        id: newId,
        joinDate: new Date().toISOString(),
        position: { level: 0, slot: 0 },
        personalMatrix: { members: [] },
        stage: 1, // Root starts at Stage 1
        directUplineId: undefined
      };
      setRootMember(newRootMember);
      setCurrentViewMemberId(newId);
      await saveMemberToDatabase(newRootMember);
      return;
    }

    // Get the direct recruiter/sponsor
    const recruiterId = memberData.position.parentId || (currentViewMemberId || rootMember.id);
    const recruiter = recruiterId === rootMember.id ? rootMember : members.find(m => m.id === recruiterId);
    
    if (!recruiter) {
      throw new Error('Recruiter not found');
    }

    // Determine matrix owner (upline whose matrix gets filled)
    // If recruiter is root, new member goes in root's matrix
    // If recruiter is in someone's matrix, new member goes in recruiter's upline's matrix
    let matrixOwnerId: string;
    
    if (recruiterId === rootMember?.id) {
      matrixOwnerId = rootMember.id;
    } else {
      // New member goes into recruiter's upline matrix
      matrixOwnerId = recruiter.position.parentId || rootMember?.id || '';
    }

    const matrixOwner = matrixOwnerId === rootMember.id ? rootMember : members.find(m => m.id === matrixOwnerId);
    if (!matrixOwner) {
      throw new Error('Matrix owner not found');
    }

    const matrixMembers = matrixOwner.personalMatrix?.members || [];
    
    // Find next available position following binary tree structure
    const positionData = findNextPositionInBinaryMatrix(matrixMembers, matrixOwnerId);
    
    if (!positionData) {
      throw new Error('Matrix is full. No available positions.');
    }

    const { level, slot, parentMemberId } = positionData;

    // Create new member - inherits stage from direct recruiter
    const newMember: Member = {
      ...memberData,
      id: newId,
      joinDate: new Date().toISOString(),
      position: { 
        level, 
        slot, 
        parentId: parentMemberId || matrixOwnerId
      },
      status: 'active',
      personalMatrix: { members: [] },
      earnings: 0,
      stage: recruiter.stage, // Inherit stage from direct recruiter
      directUplineId: recruiterId // Track direct upline for stage progression
    };

    // Add to global members list
    setMembers(prev => [...prev, newMember]);

    // Save to database
    await saveMemberToDatabase(newMember);

    // Add to matrix owner's personal matrix (upline)
    if (matrixOwnerId === rootMember.id) {
      const updatedRoot = {
        ...rootMember,
        personalMatrix: { 
          members: [...(rootMember.personalMatrix?.members || []), newMember] 
        }
      };
      setRootMember(updatedRoot);
      await saveMemberToDatabase(updatedRoot);
    } else {
      setMembers(prev => prev.map(m => {
        if (m.id === matrixOwnerId) {
          const updated = {
            ...m,
            personalMatrix: { 
              members: [...(m.personalMatrix?.members || []), newMember] 
            }
          };
          saveMemberToDatabase(updated);
          return updated;
        }
        return m;
      }));
    }

    // ALSO add to direct recruiter's personal matrix (if different from matrix owner)
    if (recruiterId !== matrixOwnerId) {
      const recruiterPersonalMatrix = recruiter.personalMatrix?.members || [];
      const recruiterPositionData = findNextPositionInBinaryMatrix(recruiterPersonalMatrix, recruiterId);
      
      if (recruiterPositionData) {
        // Create a copy for recruiter's personal matrix with adjusted position
        const personalMatrixMember: Member = {
          ...newMember,
          position: {
            level: recruiterPositionData.level,
            slot: recruiterPositionData.slot,
            parentId: recruiterPositionData.parentMemberId || recruiterId
          }
        };

        if (recruiterId === rootMember.id) {
          const updatedRoot = {
            ...rootMember,
            personalMatrix: {
              members: [...(rootMember.personalMatrix?.members || []), personalMatrixMember]
            }
          };
          setRootMember(updatedRoot);
          await saveMemberToDatabase(updatedRoot);
        } else {
          setMembers(prev => prev.map(m => {
            if (m.id === recruiterId) {
              const updated = {
                ...m,
                personalMatrix: {
                  members: [...(m.personalMatrix?.members || []), personalMatrixMember]
                }
              };
              saveMemberToDatabase(updated);
              return updated;
            }
            return m;
          }));
        }
      }
    }

    // Check if matrix is full (6/6) and trigger cycle
    const updatedMatrix = [...matrixMembers, newMember];
    if (isMatrixFull(updatedMatrix)) {
      await cycleMatrixAndProgressStage(matrixOwnerId);
    }
  };

  const getCurrentViewMatrix = (): Member[] => {
    if (!currentViewMemberId) {
      return rootMember?.personalMatrix?.members || [];
    }
    
    if (currentViewMemberId === rootMember?.id) {
      return rootMember?.personalMatrix?.members || [];
    }
    
    const viewMember = members.find(m => m.id === currentViewMemberId);
    return viewMember?.personalMatrix?.members || [];
  };

  const getAvailablePositions = (): { level: number; slot: number }[] => {
    const available: { level: number; slot: number }[] = [];
    const currentMatrix = getCurrentViewMatrix();
    
    // Level 1 positions
    for (let slot = 0; slot < 2; slot++) {
      const exists = currentMatrix.some(m => m.position.level === 1 && m.position.slot === slot);
      if (!exists) {
        available.push({ level: 1, slot });
      }
    }

    // Level 2 positions
    for (let slot = 0; slot < 4; slot++) {
      const exists = currentMatrix.some(m => m.position.level === 2 && m.position.slot === slot);
      if (!exists) {
        available.push({ level: 2, slot });
      }
    }

    return available;
  };

  const getMatrixStats = (): MatrixStats => {
    const currentMatrix = getCurrentViewMatrix();
    const totalMembers = members.length + (rootMember ? 1 : 0);
    const activeMembers = members.filter(m => m.status === 'active').length + (rootMember ? 1 : 0);
    const pendingMembers = members.filter(m => m.status === 'pending').length;
    // Calculate total earnings: R100 per member (excluding root)
    const totalEarnings = members.length * 100;
    const availablePositions = getAvailablePositions().length;
    const matrixFull = availablePositions === 0;

    return {
      totalMembers,
      activeMembers,
      pendingMembers,
      totalEarnings,
      matrixFull,
      availablePositions,
      currentMatrixMembers: currentMatrix.length
    };
  };

  const updateMemberStatus = (memberId: string, status: Member['status']) => {
    setMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, status } : m
    ));
  };

  const updateMember = async (memberId: string, updates: Partial<Member>) => {
    // Update root member if it's the one being edited
    if (memberId === rootMember?.id) {
      const updated = { ...rootMember, ...updates };
      setRootMember(updated);
      await saveMemberToDatabase(updated);
      return;
    }

    // Update in members list
    let updatedMember: Member | undefined;
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        updatedMember = { ...m, ...updates };
        return updatedMember;
      }
      return m;
    }));

    if (updatedMember) {
      await saveMemberToDatabase(updatedMember);
    }

    // Also update in all personal matrices where this member appears
    setMembers(prev => prev.map(m => {
      const updated = {
        ...m,
        personalMatrix: {
          members: m.personalMatrix?.members.map(pm =>
            pm.id === memberId ? { ...pm, ...updates } : pm
          ) || []
        }
      };
      if (m.personalMatrix?.members.some(pm => pm.id === memberId)) {
        saveMemberToDatabase(updated);
      }
      return updated;
    }));

    // Update in root's personal matrix if needed
    if (rootMember?.personalMatrix?.members.some(m => m.id === memberId)) {
      const updated = {
        ...rootMember,
        personalMatrix: {
          members: rootMember.personalMatrix?.members.map(m =>
            m.id === memberId ? { ...m, ...updates } : m
          ) || []
        }
      };
      setRootMember(updated);
      await saveMemberToDatabase(updated);
    }
  };

  const cycleMatrixAndProgressStage = async (matrixOwnerId: string) => {
    console.log(`Matrix cycled for member: ${matrixOwnerId}`);
    
    const matrixOwner = matrixOwnerId === rootMember?.id ? rootMember : members.find(m => m.id === matrixOwnerId);
    if (!matrixOwner) return;

    // Get next stage
    const nextStage = getNextStage(matrixOwner.stage);
    if (!nextStage) {
      console.log('Member has reached the final stage');
      return;
    }

    // Find the direct upline's stage to follow
    let targetStage = nextStage.level;
    if (matrixOwner.directUplineId) {
      const directUpline = matrixOwner.directUplineId === rootMember?.id 
        ? rootMember 
        : members.find(m => m.id === matrixOwner.directUplineId);
      
      if (directUpline && directUpline.stage >= targetStage) {
        targetStage = directUpline.stage;
      }
    }

    // Progress member to next stage
    if (matrixOwnerId === rootMember?.id) {
      const updated = {
        ...rootMember,
        stage: targetStage,
        personalMatrix: { members: [] } // Reset matrix for new stage
      };
      setRootMember(updated);
      await saveMemberToDatabase(updated);
    } else {
      setMembers(prev => prev.map(m => {
        if (m.id === matrixOwnerId) {
          const updated = {
            ...m,
            stage: targetStage,
            personalMatrix: { members: [] } // Reset matrix for new stage
          };
          saveMemberToDatabase(updated);
          return updated;
        }
        return m;
      }));
    }

    console.log(`Member ${matrixOwnerId} progressed to Stage ${targetStage}`);
  };

  const deleteMember = async (memberId: string) => {
    // Cannot delete root member
    if (memberId === rootMember?.id) {
      throw new Error('Cannot delete root member');
    }

    // Remove from database
    await deleteMemberFromDatabase(memberId);

    // Remove from members list
    setMembers(prev => prev.filter(m => m.id !== memberId));

    // Remove from root's personal matrix
    if (rootMember?.personalMatrix?.members.some(m => m.id === memberId)) {
      const updated = {
        ...rootMember,
        personalMatrix: {
          members: rootMember.personalMatrix?.members.filter(m => m.id !== memberId) || []
        }
      };
      setRootMember(updated);
      await saveMemberToDatabase(updated);
    }

    // Remove from all other members' personal matrices
    setMembers(prev => prev.map(m => {
      const updated = {
        ...m,
        personalMatrix: {
          members: m.personalMatrix?.members.filter(pm => pm.id !== memberId) || []
        }
      };
      if (m.personalMatrix?.members.some(pm => pm.id === memberId)) {
        saveMemberToDatabase(updated);
      }
      return updated;
    }));
  };

  return {
    members,
    rootMember,
    addMember,
    getAvailablePositions,
    getMatrixStats,
    updateMemberStatus,
    updateMember,
    findNextAvailablePosition,
    currentViewMemberId,
    setCurrentViewMemberId,
    getCurrentViewMatrix,
    deleteMember,
    loading
  };
};