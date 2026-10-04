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
    // 1. Optimistic UI Update
    setIsActive(!isActive);
    if (interactionType === 'LIKE') {
      setCount(prev => isActive ? prev - 1 : prev + 1);
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
      
      // (Optional) sync server state if needed: 
      // const data = await res.json();
      // setIsActive(data.state);

    } catch (error) {
      // 3. Rollback UI if request failed
      setIsActive(isActive);
      if (interactionType === 'LIKE') {
        setCount(initialCount);
      }
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return { isActive, count, toggle, isLoading };
}
