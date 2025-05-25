package plugins

// import (
// 	"errors"
// 	"sync"
// )

// // Plugin represents metadata for a plugin
// type Plugin struct {
// 	Name        string `json:"name"`
// 	Version     string `json:"version"`
// 	Description string `json:"description"`
// 	Enabled     bool   `json:"enabled"`
// }

// // Manager manages plugin lifecycle
// type Manager struct {
// 	registry *Registry
// 	mu       sync.Mutex
// }

// // NewManager creates a new plugin Manager with provided Registry
// func NewManager(registry *Registry) *Manager {
// 	return &Manager{registry: registry}
// }

// // Install adds a new plugin by manifest file path
// func (m *Manager) Install(manifestPath string) error {
// 	m.mu.Lock()
// 	defer m.mu.Unlock()

// 	plugin, err := m.registry.Load(manifestPath)
// 	if err != nil {
// 		return err
// 	}
// 	if m.registry.Exists(plugin.Name) {
// 		return errors.New("plugin already installed")
// 	}
// 	return m.registry.Add(plugin)
// }

// // Remove uninstalls a plugin by name
// func (m *Manager) Remove(name string) error {
// 	m.mu.Lock()
// 	defer m.mu.Unlock()

// 	if !m.registry.Exists(name) {
// 		return errors.New("plugin not found")
// 	}
// 	return m.registry.Delete(name)
// }

// // List returns all installed plugins
// func (m *Manager) List() ([]Plugin, error) {
// 	m.mu.Lock()
// 	defer m.mu.Unlock()

// 	return m.registry.All(), nil
// }

// // Enable toggles a plugin’s enabled state
// func (m *Manager) Enable(name string, enable bool) error {
// 	m.mu.Lock()
// 	defer m.mu.Unlock()

// 	p, err := m.registry.Get(name)
// 	if err != nil {
// 		return err
// 	}
// 	p.Enabled = enable
// 	return m.registry.Update(p)
// }
