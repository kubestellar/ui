/**
 * Sudoku Game Card Configuration
 */
import type { UnifiedCardConfig } from '../../lib/unified/types'

export const sudokuGameConfig: UnifiedCardConfig = {
  type: 'sudoku_game',
  title: 'Sudoku',
  category: 'games',
  description: 'Classic Sudoku puzzle game',
  icon: 'Grid3X3',
  iconColor: 'text-blue-400',
  defaultWidth: 6,
  defaultHeight: 4,
  dataSource: { type: 'static' },
  content: { type: 'custom', component: 'SudokuGame' },
  emptyState: { icon: 'Grid3X3', title: 'Sudoku', message: 'Start a new game', variant: 'info' },
  loadingState: { type: 'custom' },
  isDemoData: false,
  isLive: false,
}
export default sudokuGameConfig
