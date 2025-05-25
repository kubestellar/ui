package plugins

import (
	"encoding/json"
	"errors"
	"io/ioutil"
	"os"
	"sync"
)

// Plugin represents metadata for a plugin
type Plugin struct {
	Name string `json:"name"`
	// plugins     map[string]Plugin
	Description string `json:"description"`
}

// Registry stores plugin metadata and persists to disk
type Registry struct {
	Path    string
	plugins map[string]Plugin
	mu      sync.RWMutex
}

// NewRegistry initializes a registry, loading from the given JSON file path
func NewRegistry(path string) (*Registry, error) {
	r := &Registry{Path: path, plugins: make(map[string]Plugin)}
	if err := r.load(); err != nil && !os.IsNotExist(err) {
		return nil, err
	}
	return r, nil
}

// load reads plugins from disk into memory
func (r *Registry) load() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	data, err := ioutil.ReadFile(r.Path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, &r.plugins)
}

// persist writes current plugins map to disk
func (r *Registry) persist() error {
	r.mu.RLock()
	defer r.mu.RUnlock()

	data, err := json.MarshalIndent(r.plugins, "", "  ")
	if err != nil {
		return err
	}
	return ioutil.WriteFile(r.Path, data, 0644)
}

// Load reads a plugin manifest JSON from the given file path
func (r *Registry) Load(path string) (Plugin, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return Plugin{}, err
	}
	var p Plugin
	if err := json.Unmarshal(data, &p); err != nil {
		return Plugin{}, err
	}
	return p, nil
}

// Add registers a new plugin and persists the registry
func (r *Registry) Add(p Plugin) error {
	r.plugins[p.Name] = p
	return r.persist()
}

// Get retrieves a plugin by name
func (r *Registry) Get(name string) (Plugin, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	p, ok := r.plugins[name]
	if !ok {
		return Plugin{}, errors.New("plugin not found")
	}
	return p, nil
}

// All returns all registered plugins
func (r *Registry) All() []Plugin {
	r.mu.RLock()
	defer r.mu.RUnlock()

	list := make([]Plugin, 0, len(r.plugins))
	for _, p := range r.plugins {
		list = append(list, p)
	}
	return list
}

// Exists checks if a plugin with the given name exists
func (r *Registry) Exists(name string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	_, ok := r.plugins[name]
	return ok
}

// Update modifies existing plugin metadata
func (r *Registry) Update(p Plugin) error {
	r.plugins[p.Name] = p
	return r.persist()
}

// Delete removes a plugin by name
func (r *Registry) Delete(name string) error {
	delete(r.plugins, name)
	return r.persist()
}
