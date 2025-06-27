# 🧩 Dynamic Plugin System Demo

This demo shows how the new plugin system works with dynamic routing, card creation, and automatic frontend integration.

## 🚀 Features Implemented

### ✅ Backend Plugin System

- **Plugin Template**: Comprehensive plugin interface with enhanced features
- **Sample Analytics Plugin**: Complete working plugin with multiple endpoints
- **Dynamic Route Registration**: Plugins can add routes without server restart
- **Plugin Manager**: Centralized management of all plugins
- **Auto-initialization**: Plugins are automatically loaded on startup

### ✅ Frontend Integration

- **Dynamic Routing**: Automatic route creation at `/plugin/{PluginName}`
- **Plugin Cards**: Beautiful cards showing plugin status and widgets
- **Navigation Integration**: Enabled plugins automatically appear in sidebar
- **Real-time Updates**: Plugin status updates without refresh
- **Widget System**: Plugins can define multiple widget types

## 🧪 Testing the System

### 1. Start the Demo Server

```bash
cd backend
go build -o bin/demo demo/plugin_demo.go
./bin/demo
```

### 2. Check Plugin Status

```bash
# List all plugins
curl http://localhost:8080/demo/plugins | jq .

# Check sample analytics data (even when disabled)
curl http://localhost:8080/api/plugins/sample-analytics/data | jq .

# Get plugin metrics
curl http://localhost:8080/api/plugins/sample-analytics/metrics | jq .

# Check plugin health
curl http://localhost:8080/api/plugins/sample-analytics/health | jq .
```

### 3. Test Dynamic Route Addition

```bash
# Add a dynamic route
curl -X POST http://localhost:8080/demo/add-route

# Test the dynamically added route
curl http://localhost:8080/demo/dynamic-test | jq .
```

## 🎯 Plugin Routes Created

When you visit the frontend at `http://localhost:5173`, you'll see:

### Available Plugin Routes:

- `/plugin/backup-plugin` - Backup Plugin Dashboard (enabled)
- `/plugin/sample-analytics` - Analytics Dashboard (disabled, but route exists)

### Plugin Features:

1. **backup-plugin** (enabled):

   - Shows up in navigation sidebar as "💾 backup-plugin"
   - Has its own dashboard page
   - Provides backup functionality

2. **sample-analytics** (disabled):
   - Route exists but shows "not enabled" message
   - Can be enabled to show full analytics dashboard
   - Includes multiple widgets: metrics, charts, tables

## 📊 Plugin Dashboard Features

Each plugin route (`/plugin/{PluginName}`) includes:

### 🏠 Plugin Header

- Plugin name and version
- Enable/disable status indicator
- Refresh and navigation controls

### 📈 Dynamic Widgets

- **Metrics Widget**: Real-time analytics data
- **Chart Widget**: Visual data representation
- **Table Widget**: Structured data display
- **Card Widget**: Key performance indicators
- **Custom Widget**: Plugin-specific functionality

### ℹ️ Plugin Information Panel

- Plugin status and metadata
- Version information
- Widget count and health status

## 🔗 Navigation Integration

The plugin system automatically:

1. **Detects enabled plugins** from the backend
2. **Adds navigation items** to the sidebar menu
3. **Uses plugin icons** (emojis) for visual identification
4. **Sorts plugins** by configured order
5. **Updates in real-time** when plugins are enabled/disabled

## 🎨 UI Components Created

### New Components:

- `DynamicPluginRoute.tsx` - Handles plugin-specific pages
- `PluginCard.tsx` - Enhanced plugin cards with widgets
- `EnhancedPluginManager.tsx` - Modern plugin management interface
- `usePluginNavigation.ts` - Hook for dynamic navigation

### Enhanced Features:

- **Real-time updates** without page refresh
- **Beautiful animations** with Framer Motion
- **Theme integration** with consistent styling
- **Error handling** for missing/disabled plugins

## 🧩 Sample Analytics Plugin

The `sample-analytics` plugin demonstrates all features:

### Backend Endpoints:

- `GET /api/plugins/sample-analytics/data` - Analytics data
- `POST /api/plugins/sample-analytics/track` - Track events
- `GET /api/plugins/sample-analytics/metrics` - Plugin metrics
- `PUT /api/plugins/sample-analytics/config` - Update configuration
- `GET /api/plugins/sample-analytics/health` - Health check

### Frontend Widgets:

- **Analytics Overview**: Key metrics display
- **Page Views Chart**: Trend visualization
- **Top Pages Table**: Most visited pages
- **Real-time Activity**: Live user metrics

### Sample Data:

- 15,847 page views
- 2,847 unique users
- 5,632 sessions
- Real-time event tracking

## 🔧 How to Add New Plugins

### 1. Create Plugin Structure

```go
// Create a new plugin implementing the Plugin interface
type MyPlugin struct {
    *plugin.PluginTemplate
}

// Implement required methods
func (p *MyPlugin) Name() string { return "my-plugin" }
func (p *MyPlugin) Version() string { return "1.0.0" }
func (p *MyPlugin) Routes() []plugin.PluginRoutesMeta { ... }
```

### 2. Register Plugin

```go
// In plugin manager initialization
myPlugin := NewMyPlugin()
plugins.Pm.Register(myPlugin)
```

### 3. Frontend Route Created Automatically

- Route: `/plugin/my-plugin`
- Navigation item added automatically
- Widget system available

## 🎊 Testing Frontend Integration

1. **Start frontend dev server**: `npm run dev`
2. **Navigate to**: `http://localhost:5173`
3. **Login** (if authentication is enabled)
4. **Go to Plugins**: Click "⚙️ Plugins" in sidebar
5. **View Plugin Cards**: See all available plugins
6. **Click on Plugin**: Navigate to plugin-specific page
7. **Test Dynamic Features**: Enable/disable plugins, see real-time updates

## 📱 Mobile Responsive

The plugin system is fully responsive:

- **Grid layouts** adapt to screen size
- **Navigation** works on mobile
- **Plugin cards** stack properly
- **Widgets** resize appropriately

## 🚀 Next Steps

To further enhance the plugin system:

1. **Plugin Store**: Marketplace for plugin discovery
2. **Plugin Templates**: CLI tool for generating plugins
3. **Advanced Widgets**: More widget types and customization
4. **Plugin Dependencies**: Dependency management system
5. **Plugin Permissions**: Fine-grained access control
6. **Plugin Configuration UI**: Visual plugin settings
7. **Plugin Analytics**: Usage tracking and insights

## 🎯 Key Benefits

✅ **No Server Restart Required** - Plugins load dynamically  
✅ **Automatic UI Integration** - Routes and navigation auto-created  
✅ **Type-Safe Development** - Full TypeScript support  
✅ **Beautiful UI** - Modern, animated interface  
✅ **Real-time Updates** - Live status and data refresh  
✅ **Extensible Architecture** - Easy to add new plugin types  
✅ **Production Ready** - Error handling and performance optimized

---

## 🎉 Success!

The plugin system successfully demonstrates:

- ✅ Dynamic backend route registration
- ✅ Automatic frontend route creation at `/plugin/{PluginName}`
- ✅ Real-time plugin management
- ✅ Beautiful, responsive UI
- ✅ Complete widget ecosystem
- ✅ Professional development experience

🎯 **Plugins can be installed and immediately accessed via `http://localhost:5173/plugin/{PluginName}` without any manual configuration!**
