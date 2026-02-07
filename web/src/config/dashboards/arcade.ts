/**
 * Arcade Dashboard Configuration
 */
import type { UnifiedDashboardConfig } from '../../lib/unified/types'

export const arcadeDashboardConfig: UnifiedDashboardConfig = {
  id: 'arcade',
  name: 'Arcade',
  subtitle: 'Games and entertainment',
  route: '/arcade',
  statsType: 'arcade',
  cards: [
    // Strategy games (featured)
    { id: 'checkers-1', cardType: 'checkers', title: 'Kube Checkers', position: { w: 5, h: 4 } },
    { id: 'chess-1', cardType: 'kube_chess', title: 'Kube Chess', position: { w: 5, h: 4 } },
    { id: 'sudoku-1', cardType: 'sudoku_game', title: 'Kube Sudoku', position: { w: 6, h: 4 } },
    // Classic arcade games
    { id: 'tetris-1', cardType: 'container_tetris', title: 'Container Tetris', position: { w: 6, h: 4 } },
    { id: 'invaders-1', cardType: 'node_invaders', title: 'Node Invaders', position: { w: 6, h: 4 } },
    { id: 'pacman-1', cardType: 'kube_man', title: 'Kube-Man', position: { w: 6, h: 4 } },
    { id: 'kong-1', cardType: 'kube_kong', title: 'Kube Kong', position: { w: 6, h: 4 } },
    { id: 'crosser-1', cardType: 'pod_crosser', title: 'Pod Crosser', position: { w: 6, h: 4 } },
    { id: 'pitfall-1', cardType: 'pod_pitfall', title: 'Pod Pitfall', position: { w: 6, h: 4 } },
    { id: 'brothers-1', cardType: 'pod_brothers', title: 'Pod Brothers', position: { w: 6, h: 4 } },
    { id: 'galaga-1', cardType: 'kube_galaga', title: 'Kube Galaga', position: { w: 5, h: 4 } },
    // Action & racing games
    { id: 'pong-1', cardType: 'kube_pong', title: 'Kube Pong', position: { w: 5, h: 4 } },
    { id: 'snake-1', cardType: 'kube_snake', title: 'Kube Snake', position: { w: 5, h: 4 } },
    { id: 'kart-1', cardType: 'kube_kart', title: 'Kube Kart', position: { w: 5, h: 4 } },
    // Puzzle games
    { id: '2048-1', cardType: 'game_2048', title: 'Kube 2048', position: { w: 4, h: 4 } },
    { id: 'sweeper-1', cardType: 'pod_sweeper', title: 'Pod Sweeper', position: { w: 6, h: 4 } },
    { id: 'kubedle-1', cardType: 'kubedle', title: 'Kubedle', position: { w: 4, h: 4 } },
    { id: 'match-1', cardType: 'match_game', title: 'Kube Match', position: { w: 6, h: 4 } },
    { id: 'solitaire-1', cardType: 'solitaire', title: 'Kube Solitaire', position: { w: 6, h: 4 } },
    // Flappy
    { id: 'flappy-1', cardType: 'flappy_pod', title: 'Flappy Pod', position: { w: 5, h: 4 } },
    // Craft
    { id: 'craft-1', cardType: 'kube_craft', title: 'Kube Craft', position: { w: 6, h: 4 } },
    // FPS
    { id: 'doom-1', cardType: 'kube_doom', title: 'Kube Doom', position: { w: 6, h: 4 } },
  ],
  features: {
    dragDrop: true,
    addCard: true,
    autoRefresh: false,
  },
  storageKey: 'kubestellar-arcade-cards',
}

export default arcadeDashboardConfig
