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
