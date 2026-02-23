/**
 * UnifiedDashboard Test Page
 *
 * Tests the UnifiedDashboard component with the arcade dashboard config.
 * Also tests UnifiedCard and UnifiedCardAdapter for migration.
 */

import { useState } from 'react'
import { UnifiedDashboard } from '../lib/unified/dashboard/UnifiedDashboard'
import { arcadeDashboardConfig } from '../config/dashboards/arcade'
import { UnifiedCard } from '../lib/unified/card/UnifiedCard'
import {
  UnifiedCardAdapter,
  UNIFIED_READY_CARDS,
  UNIFIED_EXCLUDED_CARDS,
  hasValidUnifiedConfig,
  getCardMigrationStatus,
} from '../lib/unified/card/UnifiedCardAdapter'
import { getCardConfig, CARD_CONFIGS } from '../config/cards'
import { CardWrapper } from '../components/cards/CardWrapper'

export function UnifiedDashboardTest() {
  const [selectedCard, setSelectedCard] = useState('pod_issues')

  // Get migration stats
  const allCardTypes = Object.keys(CARD_CONFIGS)
  const readyCount = allCardTypes.filter(c => hasValidUnifiedConfig(c)).length
  const unifiedCount = UNIFIED_READY_CARDS.size
  const excludedCount = UNIFIED_EXCLUDED_CARDS.size

  const selectedConfig = getCardConfig(selectedCard)
  const migrationStatus = getCardMigrationStatus(selectedCard)

  return (
    <div className="p-6 pt-20 space-y-8">
      <h1 className="text-2xl font-bold">Unified Framework Test</h1>

      {/* Migration Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-card rounded-lg border">
          <div className="text-2xl font-bold text-blue-400">{allCardTypes.length}</div>
          <div className="text-sm text-muted-foreground">Total Cards</div>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <div className="text-2xl font-bold text-green-400">{readyCount}</div>
          <div className="text-sm text-muted-foreground">Config Ready</div>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <div className="text-2xl font-bold text-purple-400">{unifiedCount}</div>
          <div className="text-sm text-muted-foreground">Using UnifiedCard</div>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <div className="text-2xl font-bold text-orange-400">{excludedCount}</div>
          <div className="text-sm text-muted-foreground">Excluded</div>
        </div>
      </div>

      {/* Card Comparison Test */}
      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-lg font-semibold mb-4">UnifiedCard Comparison Test</h2>

        {/* Card selector */}
        <div className="mb-4">
          <label className="text-sm text-muted-foreground mr-2">Select card:</label>
          <select
            value={selectedCard}
            onChange={(e) => setSelectedCard(e.target.value)}
            className="bg-background border rounded px-3 py-1.5 text-sm"
          >
            {allCardTypes.slice(0, 30).map((cardType) => (
              <option key={cardType} value={cardType}>
                {cardType} ({getCardMigrationStatus(cardType).status})
              </option>
            ))}
          </select>
        </div>

        {/* Status badge */}
        <div className="mb-4 p-3 rounded bg-secondary/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{selectedCard}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${
              migrationStatus.status === 'unified' ? 'bg-green-500/20 text-green-400' :
              migrationStatus.status === 'ready' ? 'bg-blue-500/20 text-blue-400' :
              migrationStatus.status === 'excluded' ? 'bg-orange-500/20 text-orange-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {migrationStatus.status}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">{migrationStatus.reason}</div>
        </div>

        {/* Side by side comparison */}
        {selectedConfig && hasValidUnifiedConfig(selectedCard) && (
          <div className="grid grid-cols-2 gap-4">
            {/* UnifiedCard rendering */}
            <div>
              <h3 className="text-sm font-medium mb-2 text-green-400">UnifiedCard (from config)</h3>
              <div className="border border-green-500/30 rounded-lg h-[300px] overflow-hidden">
                <CardWrapper
                  cardId={`unified-${selectedCard}`}
                  title={selectedConfig.title}
                  cardType={selectedCard}
                >
                  <UnifiedCard config={selectedConfig} />
                </CardWrapper>
              </div>
            </div>

            {/* Adapter rendering */}
            <div>
              <h3 className="text-sm font-medium mb-2 text-purple-400">UnifiedCardAdapter</h3>
              <div className="border border-purple-500/30 rounded-lg h-[300px] overflow-hidden">
                <CardWrapper
                  cardId={`adapter-${selectedCard}`}
                  title={selectedConfig.title}
                  cardType={selectedCard}
                >
                  <UnifiedCardAdapter
                    cardType={selectedCard}
                    cardId={`adapter-${selectedCard}`}
                    renderLegacy={() => (
                      <div className="text-sm text-muted-foreground p-4 text-center">
                        Falls back to legacy component
                      </div>
                    )}
                  />
                </CardWrapper>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* UnifiedDashboard Test */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-purple-400">
          UnifiedDashboard (arcade config - {arcadeDashboardConfig.cards.length} cards)
        </h2>
        <div className="border border-purple-500/30 rounded-lg bg-card">
          <UnifiedDashboard config={arcadeDashboardConfig} />
        </div>
      </div>

      {/* Feature checklist */}
      <div className="p-4 bg-secondary/50 rounded-lg">
        <h3 className="font-semibold mb-3">Framework Status</h3>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>✅ <strong>UnifiedCard</strong> - Renders from config (list, table, chart, status-grid)</li>
          <li>✅ <strong>UnifiedCardAdapter</strong> - Bridge for gradual migration</li>
          <li>✅ <strong>UnifiedDashboard</strong> - Config-driven dashboard layout</li>
          <li>✅ <strong>Modals</strong> - AddCardModal, ConfigureCardModal integrated</li>
          <li>✅ <strong>Migration utilities</strong> - Analyzer, validator, reporter</li>
          <li>⏳ <strong>Data hooks</strong> - Some hooks need registration</li>
          <li>⏳ <strong>Card validation</strong> - Verify each card works correctly</li>
        </ul>
      </div>
    </div>
  )
}

export default UnifiedDashboardTest
