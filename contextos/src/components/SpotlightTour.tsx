import { useState, useEffect, useCallback, useRef } from 'react'
import {
  IconChevronRight,
  IconChevronLeft,
  IconX,
  IconCheck,
} from './LucideIcons'
import { setCompletedTour } from '../lib/storage'

export interface TourStep {
  id: string
  tab: 'bookmarks' | 'search' | 'graph' | 'teams' | 'settings'
  targetSelector: string
  title: string
  description: string
  placement?: 'top' | 'bottom'
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'save',
    tab: 'bookmarks',
    targetSelector: '#btn-save-current',
    title: 'Save with Intent',
    description:
      'Click Save (or press Option+S / Alt+S) while on any page. Contextos saves the link and lets you record your remark so you never forget why you kept it.',
    placement: 'bottom',
  },
  {
    id: 'hashtags',
    tab: 'bookmarks',
    targetSelector: '#tags-filter-bar',
    title: 'Instant #Hashtag Filters',
    description:
      'Include #tags inside your remarks. Contextos automatically creates 1-click filter chips so you can slice your library in milliseconds.',
    placement: 'bottom',
  },
  {
    id: 'chains',
    tab: 'bookmarks',
    targetSelector: '#group-by-site-btn',
    title: 'Site Chains & Health',
    description:
      'Pages saved from the same research or doc domain link together into chains. Dead or moved links are flagged automatically.',
    placement: 'bottom',
  },
  {
    id: 'search',
    tab: 'search',
    targetSelector: '#search-input',
    title: 'Semantic BM25 Search',
    description:
      'Search your thoughts and reasons. Contextos uses BM25 keyword gating and vector embeddings to match concepts even without exact phrasing.',
    placement: 'bottom',
  },
  {
    id: 'graph',
    tab: 'graph',
    targetSelector: '#tab-graph',
    title: 'Visual Knowledge Graph',
    description:
      'Explore your saved bookmarks, topics, and connections mapped visually as an interactive constellation of ideas.',
    placement: 'top',
  },
  {
    id: 'account',
    tab: 'settings',
    targetSelector: '#settings-account-section',
    title: 'Google Account & Sync',
    description:
      'Sign in with Google for cloud backup across all your browsers and team sharing, or stay completely offline in local mode.',
    placement: 'bottom',
  },
  {
    id: 'ai',
    tab: 'settings',
    targetSelector: '#settings-ai-section',
    title: 'Gemini AI Engine',
    description:
      'Add your free Google AI Studio key to unlock automatic 1-sentence notes, smart tags, and semantic vectors.',
    placement: 'top',
  },
]

interface Props {
  onSwitchTab: (tab: 'bookmarks' | 'search' | 'graph' | 'teams' | 'settings') => void
  onComplete: () => void
}

export default function SpotlightTour({ onSwitchTab, onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const retryCountRef = useRef(0)

  const step = TOUR_STEPS[currentStep]

  const updateTargetRect = useCallback(() => {
    const el = document.querySelector(step.targetSelector)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      const rect = el.getBoundingClientRect()
      setTargetRect(rect)
    } else if (retryCountRef.current < 10) {
      retryCountRef.current += 1
      setTimeout(updateTargetRect, 60)
    }
  }, [step.targetSelector])

  // When step changes: switch tab and locate element
  useEffect(() => {
    retryCountRef.current = 0
    onSwitchTab(step.tab)
    const timer = setTimeout(updateTargetRect, 80)
    return () => clearTimeout(timer)
  }, [step.tab, updateTargetRect])

  // Window resize & scroll listeners
  useEffect(() => {
    const handleScrollOrResize = () => updateTargetRect()
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [updateTargetRect])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleExit()
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handleBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  async function handleExit() {
    await setCompletedTour(true)
    onComplete()
  }

  function handleNext() {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    } else {
      handleExit()
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1)
    }
  }

  // Calculate tooltip placement
  const placement = step.placement ?? 'bottom'
  let tooltipTop = 100
  let isArrowOnBottom = false

  if (targetRect) {
    if (placement === 'top' || targetRect.bottom > 380) {
      // Show tooltip above target
      tooltipTop = Math.max(12, targetRect.top - 180)
      isArrowOnBottom = true
    } else {
      // Show tooltip below target
      tooltipTop = Math.min(window.innerHeight - 190, targetRect.bottom + 12)
      isArrowOnBottom = false
    }
  }

  // Horizontal alignment: center over target clamped to viewport
  let tooltipLeft = 16
  const tooltipWidth = 320
  if (targetRect) {
    const targetCenter = targetRect.left + targetRect.width / 2
    tooltipLeft = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, targetCenter - tooltipWidth / 2))
  }

  // Arrow horizontal offset relative to tooltip
  const arrowLeft = targetRect
    ? Math.max(16, Math.min(tooltipWidth - 24, targetRect.left + targetRect.width / 2 - tooltipLeft))
    : tooltipWidth / 2

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto select-none font-sans">
      {/* ── Spotlight Cutout Overlay ─────────────────────────────── */}
      {targetRect && (
        <div
          className="absolute transition-all duration-300 ease-out"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: '8px',
            border: '2px solid #E5A53A',
            boxShadow:
              '0 0 0 9999px rgba(15, 14, 12, 0.78), 0 0 16px rgba(229, 165, 58, 0.45)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Fallback dark overlay if target not yet measured */}
      {!targetRect && (
        <div className="absolute inset-0 bg-[#0F0E0C]/80 backdrop-blur-[1px]" />
      )}

      {/* ── Floating Tooltip Pointer Card ───────────────────────── */}
      <div
        className="absolute transition-all duration-300 ease-out surface-card border border-border shadow-2xl p-3.5 space-y-2.5 z-50 rounded-xl"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: tooltipWidth,
          backgroundColor: 'var(--surface)',
        }}
      >
        {/* Directional Arrow pointing at element */}
        {targetRect && (
          <div
            className={`absolute w-3 h-3 bg-surface border-border rotate-45 ${
              isArrowOnBottom
                ? '-bottom-1.5 border-r border-b'
                : '-top-1.5 border-l border-t'
            }`}
            style={{ left: arrowLeft }}
          />
        )}

        {/* Card Header: Step Pill & Exit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber" />
            <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-amber">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleExit}
            className="text-text-muted hover:text-text p-1 rounded hover:bg-surface-raised transition-colors"
            title="Exit guide (Esc)"
          >
            <IconX size={14} />
          </button>
        </div>

        {/* Title & Description */}
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-text tracking-tight">
            {step.title}
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Card Footer: Progress & Navigation */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`flex items-center gap-1 text-xs font-mono py-1 px-1.5 rounded transition-colors ${
              currentStep === 0
                ? 'opacity-20 cursor-not-allowed text-text-muted'
                : 'text-text hover:bg-surface-raised'
            }`}
          >
            <IconChevronLeft size={13} />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExit}
              className="text-[11px] text-text-muted hover:text-text font-mono transition-colors px-1.5 py-1"
            >
              Skip
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="btn-primary text-xs flex items-center gap-1 py-1 px-3 min-h-[28px]"
            >
              <span>{currentStep === TOUR_STEPS.length - 1 ? 'Got it' : 'Next'}</span>
              {currentStep === TOUR_STEPS.length - 1 ? (
                <IconCheck size={13} />
              ) : (
                <IconChevronRight size={13} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
