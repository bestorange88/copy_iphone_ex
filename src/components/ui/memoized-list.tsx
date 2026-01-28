import { memo, ReactNode, useMemo } from 'react';

interface MemoizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  emptyComponent?: ReactNode;
  className?: string;
}

/**
 * Optimized list component that memoizes items for better performance
 */
export function MemoizedList<T>({
  items,
  renderItem,
  keyExtractor,
  emptyComponent,
  className,
}: MemoizedListProps<T>) {
  const memoizedItems = useMemo(
    () =>
      items.map((item, index) => (
        <MemoizedListItem key={keyExtractor(item, index)}>
          {renderItem(item, index)}
        </MemoizedListItem>
      )),
    [items, renderItem, keyExtractor]
  );

  if (items.length === 0 && emptyComponent) {
    return <>{emptyComponent}</>;
  }

  return <div className={className}>{memoizedItems}</div>;
}

const MemoizedListItem = memo(function MemoizedListItem({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
});

/**
 * Virtual list hook for very large lists
 */
export function useVirtualList<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 3
) {
  const totalHeight = items.length * itemHeight;
  
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    
    return {
      totalHeight,
      getVisibleItems: (scrollTop: number) => {
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        const endIndex = Math.min(
          items.length,
          startIndex + visibleCount + overscan * 2
        );
        
        return {
          items: items.slice(startIndex, endIndex),
          startIndex,
          offsetY: startIndex * itemHeight,
        };
      },
    };
  }, [items, containerHeight, itemHeight, overscan, totalHeight]);
}
