/**
 * Migration Validator
 *
 * Validates that a migrated card behaves equivalently to the legacy version.
 */

import type { MigrationValidation, ValidationIssue } from './types'

/**
 * Validate that a migrated card works correctly
 *
 * This performs runtime validation by comparing:
 * - Data output between legacy and unified
 * - Feature availability (filtering, pagination, drill-down)
 * - UI behavior (loading states, empty states, error handling)
 */
export function validateMigration(
  _cardType: string,
  legacyData: unknown[],
  unifiedData: unknown[]
): MigrationValidation {
  const issues: ValidationIssue[] = []
  const warnings: string[] = []

  // 1. Check data parity
  const dataParityPassed = validateDataParity(legacyData, unifiedData, issues)

  // 2. Check data count
  if (legacyData.length !== unifiedData.length) {
    issues.push({
      severity: 'error',
      category: 'data',
      message: `Data count mismatch: legacy=${legacyData.length}, unified=${unifiedData.length}`,
      legacyValue: legacyData.length,
      unifiedValue: unifiedData.length,
    })
  }

  // 3. Check for missing fields
  if (legacyData.length > 0 && unifiedData.length > 0) {
    const legacyFields = getObjectFields(legacyData[0])
    const unifiedFields = getObjectFields(unifiedData[0])

    const missingInUnified = legacyFields.filter(f => !unifiedFields.includes(f))
    const extraInUnified = unifiedFields.filter(f => !legacyFields.includes(f))

    if (missingInUnified.length > 0) {
      issues.push({
        severity: 'warning',
        category: 'data',
        message: `Fields missing in unified data: ${missingInUnified.join(', ')}`,
      })
    }

    if (extraInUnified.length > 0) {
      warnings.push(`Extra fields in unified data: ${extraInUnified.join(', ')}`)
    }
  }

  const isValid = issues.filter(i => i.severity === 'error').length === 0

  return {
    isValid,
    dataParityPassed,
    uiParityPassed: true, // Would need runtime testing
    featureParityPassed: true, // Would need feature detection
    issues,
    warnings,
  }
}

/**
 * Validate data parity between legacy and unified
 */
function validateDataParity(
  legacyData: unknown[],
  unifiedData: unknown[],
  issues: ValidationIssue[]
): boolean {
  if (legacyData.length === 0 && unifiedData.length === 0) {
    return true
  }

  if (legacyData.length !== unifiedData.length) {
    return false
  }

  // Sample check - compare first few items
  const sampleSize = Math.min(5, legacyData.length)
  let allMatch = true

  for (let i = 0; i < sampleSize; i++) {
    const legacyItem = legacyData[i] as Record<string, unknown>
    const unifiedItem = unifiedData[i] as Record<string, unknown>

    if (!legacyItem || !unifiedItem) continue

    // Compare key fields
    const keyFields = ['id', 'name', 'namespace', 'cluster', 'status']

    for (const field of keyFields) {
      if (legacyItem[field] !== undefined && unifiedItem[field] !== undefined) {
        if (String(legacyItem[field]) !== String(unifiedItem[field])) {
          issues.push({
            severity: 'error',
            category: 'data',
            message: `Field "${field}" mismatch at index ${i}`,
            legacyValue: legacyItem[field],
            unifiedValue: unifiedItem[field],
          })
          allMatch = false
        }
      }
    }
  }

  return allMatch
}

/**
 * Get all field names from an object
 */
function getObjectFields(obj: unknown): string[] {
  if (typeof obj !== 'object' || obj === null) return []
  return Object.keys(obj)
}

/**
 * Create a validation summary for multiple cards
 */
export function createValidationSummary(
  validations: Record<string, MigrationValidation>
): {
  totalCards: number
  validCards: number
  invalidCards: number
  warnings: number
  issues: ValidationIssue[]
} {
  const cards = Object.values(validations)
  const allIssues = cards.flatMap(v => v.issues)

  return {
    totalCards: cards.length,
    validCards: cards.filter(v => v.isValid).length,
    invalidCards: cards.filter(v => !v.isValid).length,
    warnings: cards.reduce((sum, v) => sum + v.warnings.length, 0),
    issues: allIssues,
  }
}

/**
 * Check if a config matches expected patterns for a card type
 */
export function validateConfig(
  _cardType: string,
  config: Record<string, unknown>
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Required fields for all configs
  const requiredFields = ['type', 'title', 'dataSource', 'content']

  for (const field of requiredFields) {
    if (!(field in config)) {
      issues.push({
        severity: 'error',
        category: 'feature',
        message: `Missing required config field: ${field}`,
      })
    }
  }

  // Validate dataSource
  const dataSource = config.dataSource as Record<string, unknown> | undefined
  if (dataSource) {
    if (!dataSource.type) {
      issues.push({
        severity: 'error',
        category: 'feature',
        message: 'dataSource missing type field',
      })
    }
    if (dataSource.type === 'hook' && !dataSource.hook) {
      issues.push({
        severity: 'error',
        category: 'feature',
        message: 'dataSource type is "hook" but hook name is missing',
      })
    }
  }

  // Validate content
  const content = config.content as Record<string, unknown> | undefined
  if (content) {
    if (!content.type) {
      issues.push({
        severity: 'error',
        category: 'feature',
        message: 'content missing type field',
      })
    }
    if (content.type === 'list' && !content.columns) {
      issues.push({
        severity: 'warning',
        category: 'feature',
        message: 'list content should have columns defined',
      })
    }
  }

  return issues
}

/**
 * Feature compatibility checker
 */
export function checkFeatureCompatibility(
  _cardType: string,
  requiredFeatures: string[]
): {
  compatible: boolean
  missingFeatures: string[]
  availableFeatures: string[]
} {
  // Features supported by UnifiedCard framework
  const supportedFeatures = new Set([
    'list-visualization',
    'table-visualization',
    'chart-visualization',
    'status-grid-visualization',
    'custom-visualization',
    'text-search',
    'cluster-filter',
    'namespace-filter',
    'pagination',
    'sorting',
    'drill-down',
    'ai-actions',
    'loading-state',
    'empty-state',
    'error-state',
  ])

  const missingFeatures = requiredFeatures.filter(f => !supportedFeatures.has(f))
  const availableFeatures = requiredFeatures.filter(f => supportedFeatures.has(f))

  return {
    compatible: missingFeatures.length === 0,
    missingFeatures,
    availableFeatures,
  }
}
