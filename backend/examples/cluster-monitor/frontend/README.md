# Plugin System Frontend

This provides the Frontend System for Plugin. The Frontend System act as a React library where it has one single main file(App.jsx) in this case which is exported and is build. The build file is stored at /dist/filename.js which is actually a React component. It is loaded by Plugin Loader by host frontend application.

The `vite.config.js` is there to setup build for the project. It is customized to support host application and is made to make build system where it exports only one `.js` file which is loaded at frontend host app.

For using any kind of React hook, always use it like React.hookName example `React.useState(), React.useEffect()`.

## In development mode reference React as
```
import React from "react";

const App = ()=>{

    const [mode, setMode] = React.useState("dev");

    return (
        <div> 
        {mode}
        </div>
    )
}
```

## In build mode reference React as
```
const React = window.React

const App = ()=>{

    const [mode, setMode] = React.useState("build");

    return (
        <div> 
        {mode}
        </div>
    )
}
```

## Development
### Setup the `vite.config.js`
```
import { defineConfig } from "vite";

export default defineConfig({});
```

### Start the project
```
npm install
npm run dev
```

## Build
### Setup the `vite.config.js`
```
import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    cssInjectedByJsPlugin(), // inject css directly into js
    react({
      babel: {
        //
        plugins: [
          function customReactGlobalPlugin() {
            return {
              visitor: {
                ImportDeclaration(path) {
                  if (path.node.source.value === "react") {
                    path.remove(); // Remove the react import (import React from "react") statements
                  }
                },
                MemberExpression(path) {
                  // replace React.x with window.React.x
                  if (
                    path.node.object.name === "React" &&
                    !path.node.property.name.startsWith("_")
                  ) {
                    path.node.object = {
                      type: "MemberExpression",
                      object: { type: "Identifier", name: "window" },
                      property: { type: "Identifier", name: "React" },
                    };
                  }
                },
              },
            };
          },
          [
            "@babel/plugin-transform-react-jsx",
            {
              // converts jsx to syntax like  window.React.createElement
              runtime: "classic",
              pragma: "window.React.createElement",
              pragmaFrag: "window.React.Fragment",
            },
          ],
        ],
      },
    }),
  ],
  build: {
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, "./src/App.jsx"), // entry file path
      name: "PluginComponent",
      fileName: () => `plugin-component.js`, // build output file name
      formats: ["es"],
    },
    rollupOptions: {
      external: ["react"],
      output: {
        globals: {
          react: "React",
        },
      },
    },
  },
});

```

### Build project
```
npm run build
```
