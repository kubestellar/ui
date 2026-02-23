/**
 * DashboardGrid - Grid layout for dashboard cards
 *
 * Renders a responsive grid of cards with optional drag-and-drop support.
 */

import { useMemo, useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DashboardCardPlacement, DashboardFeatures } from '../types'
import { UnifiedCard } from '../card'
import { getCardConfig } from '../../../config/cards'

export interface DashboardGridProps {
  /** Card placements */
  cards: DashboardCardPlacement[]
  /** Features configuration */
  features?: DashboardFeatures
  /** Called when cards are reordered */
  onReorder?: (cards: DashboardCardPlacement[]) => void
  /** Called when a card is removed */
  onRemoveCard?: (cardId: string) => void
  /** Called when a card is configured */
  onConfigureCard?: (cardId: string) => void
  /** Whether data is loading */
  isLoading?: boolean
  /** Additional className */
  className?: string
}

/**
 * DashboardGrid - Renders a grid of cards
 */
export function DashboardGrid({
  cards,
  features,
  onReorder,
  onRemoveCard,
  onConfigureCard,
  isLoading = false,
  className = '',
}: DashboardGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Get the active card for drag overlay
  const activeCard = useMemo(() => {
    if (!activeId) return null
    return cards.find((c) => c.id === activeId) || null
  }, [activeId, cards])

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)

      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = cards.findIndex((c) => c.id === active.id)
      const newIndex = cards.findIndex((c) => c.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1 && onReorder) {
        const newCards = arrayMove(cards, oldIndex, newIndex)
        onReorder(newCards)
      }
    },
    [cards, onReorder]
  )

  // Enable drag-drop if configured and we have a reorder handler
  const enableDragDrop = features?.dragDrop !== false && !!onReorder

  // Render grid content
  const gridContent = (
    <div className={`grid grid-cols-12 gap-4 ${className}`}>
      {cards.map((placement) => (
        <DashboardCardWrapper
          key={placement.id}
          placement={placement}
          isDraggable={enableDragDrop}
          isLoading={isLoading}
          onRemove={onRemoveCard ? () => onRemoveCard(placement.id) : undefined}
          onConfigure={
            onConfigureCard ? () => onConfigureCard(placement.id) : undefined
          }
        />
      ))}
    </div>
  )

  // Wrap with DnD context if drag-drop is enabled
  if (enableDragDrop) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={rectSortingStrategy}
        >
          {gridContent}
        </SortableContext>

        {/* Drag overlay */}
        <DragOverlay>
          {activeCard && (
            <DashboardCardWrapper
              placement={activeCard}
              isDraggable={false}
              isOverlay={true}
            />
          )}
        </DragOverlay>
      </DndContext>
    )
  }

  return gridContent
}

/**
 * Wrapper for individual cards with sortable support
 */
interface DashboardCardWrapperProps {
  placement: DashboardCardPlacement
  isDraggable?: boolean
  isOverlay?: boolean
  isLoading?: boolean
  onRemove?: () => void
  onConfigure?: () => void
}

function DashboardCardWrapper({
  placement,
  isDraggable = false,
  isOverlay = false,
  isLoading = false,
  onRemove,
  onConfigure,
}: DashboardCardWrapperProps) {
  // Get sortable props if draggable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: placement.id,
    disabled: !isDraggable,
  })

  // Calculate grid column span
  const colSpan = `col-span-${Math.min(12, Math.max(3, placement.position.w))}`

  // Calculate height (each row unit = 100px approximately)
  const minHeight = `min-h-[${placement.position.h * 100}px]`

  // Get card config - support both cardType (new) and card_type (legacy localStorage)
  const cardTypeKey = placement.cardType || (placement as { card_type?: string }).card_type
  const cardConfig = cardTypeKey ? getCardConfig(cardTypeKey) : undefined

  // Style for drag transform
  const style = isDraggable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined

  if (!cardConfig) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`${colSpan} ${minHeight} glass rounded-lg p-4 flex items-center justify-center text-gray-500`}
      >
        Unknown card type: {cardTypeKey || 'undefined'}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${colSpan} ${minHeight} ${isOverlay ? 'shadow-2xl' : ''}`}
      {...(isDraggable ? attributes : {})}
    >
      <div className="relative h-full group">
        {/* Drag handle */}
        {isDraggable && (
          <div
            {...listeners}
            className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800/50"
            title="Drag to reorder"
          >
            <svg
              className="w-4 h-4 text-gray-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zM8 12a2 2 0 11-4 0 2 2 0 014 0zM8 18a2 2 0 11-4 0 2 2 0 014 0zM14 6a2 2 0 11-4 0 2 2 0 014 0zM14 12a2 2 0 11-4 0 2 2 0 014 0zM14 18a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        )}

        {/* Card actions */}
        {(onRemove || onConfigure) && !isOverlay && (
          <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onConfigure && (
              <button
                onClick={onConfigure}
                className="p-1 rounded bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                title="Configure card"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                className="p-1 rounded bg-gray-800/50 hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-colors"
                title="Remove card"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* The actual card */}
        <UnifiedCard
          config={cardConfig}
          instanceConfig={placement.config as Record<string, unknown> | undefined}
          title={placement.title}
          className="h-full glass rounded-lg"
        />

        {/* Loading overlay */}
        {isLoading && !isOverlay && (
          <div className="absolute inset-0 bg-gray-900/50 rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardGrid
