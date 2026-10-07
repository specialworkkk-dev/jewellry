"use client";

import { useState } from 'react';

interface UseInteractionProps {
  initialState: boolean;
  initialCount?: number;
  targetId: string;
  targetType: 'PRODUCT' | 'POST' | 'SHOP';
  interactionType: 'LIKE' | 'FAVORITE' | 'FOLLOW';
  shopId: string;
}

export function useInteraction({
  initialState,
  initialCount = 0,
  targetId,
  targetType,
  interactionType,
  shopId
}: UseInteractionProps) {
  const [isActive, setIsActive] = useState(initialState);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const toggle = async () => {
    if (isLoading) return;
    const previousActive = isActive;
    const previousCount = count;
    // 1. Optimistic UI Update
    setIsActive(!isActive);
    if (interactionType === 'LIKE') {
      setCount(prev => isActive ? Math.max(0, prev - 1) : prev + 1);
    }

    setIsLoading(true);
    try {
      // 2. Fire request in background
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId,
          targetType,
          interactionType,
          shopId
        })
      });

      if (!res.ok) {
        throw new Error('Interaction failed');
      }
      
      const data = await res.json() as { state?: boolean; likesCount?: number };
      if (typeof data.state === 'boolean') setIsActive(data.state);
      if (typeof data.likesCount === 'number') setCount(data.likesCount);

    } catch (error) {
      // 3. Rollback UI if request failed
      setIsActive(previousActive);
      setCount(previousCount);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return { isActive, count, toggle, isLoading };
}
