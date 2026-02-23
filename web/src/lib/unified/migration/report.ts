/**
 * Migration Report Generator
 *
 * Generates comprehensive migration reports and batch recommendations.
 */

import type {
  CardAnalysis,
  CardComplexity,
  MigrationBatch,
  MigrationReport,
  VisualizationType,
} from './types'
import { analyzeCard, getMigrationCandidates, getAllKnownCardTypes } from './analyzer'

/**
 * Generate a full migration report for all known cards
 */
export function generateMigrationReport(): MigrationReport {
  const allCardTypes = getAllKnownCardTypes()
  const cards = allCardTypes.map(analyzeCard)

  const byComplexity = countByComplexity(cards)
  const byVisualization = countByVisualization(cards)

  const migrationCandidates = cards.filter(c => c.isMigrationCandidate)
  const nonCandidates = cards.filter(c => !c.isMigrationCandidate)

  const totalEstimatedEffort = migrationCandidates.reduce(
    (sum, c) => sum + c.estimatedEffort,
    0
  )

  const batches = generateBatches(migrationCandidates)

  return {
    totalCards: cards.length,
    byComplexity,
    byVisualization,
    migrationCandidates: migrationCandidates.length,
    nonCandidates: nonCandidates.length,
    totalEstimatedEffort,
    batches,
    cards,
    generatedAt: new Date(),
  }
}

/**
 * Generate recommended migration batches
 */
export function generateBatches(candidates: CardAnalysis[]): MigrationBatch[] {
  const batches: MigrationBatch[] = []

  // Batch 1: Simple list cards (highest priority, lowest effort)
  const simpleListCards = candidates.filter(
    c => c.complexity === 'simple' && c.visualizationType === 'list'
  )
  if (simpleListCards.length > 0) {
    batches.push({
      id: 'batch-1-simple-lists',
      name: 'Batch 1: Simple List Cards',
      cards: simpleListCards.map(c => c.cardType),
      estimatedEffort: simpleListCards.reduce((sum, c) => sum + c.estimatedEffort, 0),
      priority: 1,
    })
  }

  // Batch 2: Status grid cards
  const statusGridCards = candidates.filter(
    c => c.visualizationType === 'status-grid'
  )
  if (statusGridCards.length > 0) {
    batches.push({
      id: 'batch-2-status-grids',
      name: 'Batch 2: Status Grid Cards',
      cards: statusGridCards.map(c => c.cardType),
      estimatedEffort: statusGridCards.reduce((sum, c) => sum + c.estimatedEffort, 0),
      priority: 2,
    })
  }

  // Batch 3: Chart cards (moderate effort)
  const chartCards = candidates.filter(
    c => c.visualizationType === 'chart' || c.visualizationType === 'gauge'
  )
  if (chartCards.length > 0) {
    batches.push({
      id: 'batch-3-charts',
      name: 'Batch 3: Chart & Gauge Cards',
      cards: chartCards.map(c => c.cardType),
      estimatedEffort: chartCards.reduce((sum, c) => sum + c.estimatedEffort, 0),
      priority: 3,
    })
  }

  // Batch 4: Table cards
  const tableCards = candidates.filter(c => c.visualizationType === 'table')
  if (tableCards.length > 0) {
    batches.push({
      id: 'batch-4-tables',
      name: 'Batch 4: Table Cards',
      cards: tableCards.map(c => c.cardType),
      estimatedEffort: tableCards.reduce((sum, c) => sum + c.estimatedEffort, 0),
      priority: 4,
    })
  }

  // Batch 5: Complex cards (maps, topologies, custom)
  const complexCards = candidates.filter(
    c => c.complexity === 'complex' || c.visualizationType === 'custom'
  )
  if (complexCards.length > 0) {
    batches.push({
      id: 'batch-5-complex',
      name: 'Batch 5: Complex Visualizations',
      cards: complexCards.map(c => c.cardType),
      estimatedEffort: complexCards.reduce((sum, c) => sum + c.estimatedEffort, 0),
      priority: 5,
    })
  }

  return batches
}

/**
 * Count cards by complexity
 */
function countByComplexity(cards: CardAnalysis[]): Record<CardComplexity, number> {
  return {
    simple: cards.filter(c => c.complexity === 'simple').length,
    moderate: cards.filter(c => c.complexity === 'moderate').length,
    complex: cards.filter(c => c.complexity === 'complex').length,
    custom: cards.filter(c => c.complexity === 'custom').length,
  }
}

/**
 * Count cards by visualization type
 */
function countByVisualization(cards: CardAnalysis[]): Record<VisualizationType, number> {
  const counts: Record<VisualizationType, number> = {
    list: 0,
    table: 0,
    chart: 0,
    'status-grid': 0,
    gauge: 0,
    map: 0,
    topology: 0,
    game: 0,
    embed: 0,
    custom: 0,
  }

  for (const card of cards) {
    counts[card.visualizationType]++
  }

  return counts
}

/**
 * Format report as markdown
 */
export function formatReportAsMarkdown(report: MigrationReport): string {
  const lines: string[] = []

  lines.push('# Card Migration Report')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt.toISOString()}`)
  lines.push('')

  // Summary
  lines.push('## Summary')
  lines.push('')
  lines.push(`| Metric | Count |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Total Cards | ${report.totalCards} |`)
  lines.push(`| Migration Candidates | ${report.migrationCandidates} |`)
  lines.push(`| Non-Candidates | ${report.nonCandidates} |`)
  lines.push(`| Estimated Total Effort | ${report.totalEstimatedEffort} hours |`)
  lines.push('')

  // By Complexity
  lines.push('## Cards by Complexity')
  lines.push('')
  lines.push(`| Complexity | Count |`)
  lines.push(`|------------|-------|`)
  for (const [complexity, count] of Object.entries(report.byComplexity)) {
    lines.push(`| ${complexity} | ${count} |`)
  }
  lines.push('')

  // By Visualization
  lines.push('## Cards by Visualization Type')
  lines.push('')
  lines.push(`| Type | Count |`)
  lines.push(`|------|-------|`)
  for (const [type, count] of Object.entries(report.byVisualization)) {
    if (count > 0) {
      lines.push(`| ${type} | ${count} |`)
    }
  }
  lines.push('')

  // Batches
  lines.push('## Recommended Migration Batches')
  lines.push('')
  for (const batch of report.batches) {
    lines.push(`### ${batch.name}`)
    lines.push('')
    lines.push(`**Priority**: ${batch.priority}`)
    lines.push(`**Estimated Effort**: ${batch.estimatedEffort} hours`)
    lines.push(`**Cards**: ${batch.cards.length}`)
    lines.push('')
    lines.push('Cards in this batch:')
    for (const card of batch.cards) {
      lines.push(`- \`${card}\``)
    }
    lines.push('')
  }

  // Non-candidates
  const nonCandidates = report.cards.filter(c => !c.isMigrationCandidate)
  if (nonCandidates.length > 0) {
    lines.push('## Non-Migration Candidates')
    lines.push('')
    lines.push('These cards should remain as custom implementations:')
    lines.push('')
    for (const card of nonCandidates) {
      lines.push(`- \`${card.cardType}\`: ${card.nonCandidateReason}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Format report as JSON
 */
export function formatReportAsJSON(report: MigrationReport): string {
  return JSON.stringify(report, null, 2)
}

/**
 * Get quick stats for display
 */
export function getQuickStats(): {
  totalCards: number
  migrationCandidates: number
  simpleCards: number
  estimatedHours: number
} {
  const candidates = getMigrationCandidates()
  const analyses = candidates.map(analyzeCard)

  return {
    totalCards: getAllKnownCardTypes().length,
    migrationCandidates: candidates.length,
    simpleCards: analyses.filter(a => a.complexity === 'simple').length,
    estimatedHours: analyses.reduce((sum, a) => sum + a.estimatedEffort, 0),
  }
}
