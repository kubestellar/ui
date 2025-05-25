// unusedfunc.go
package main

import (
	"flag"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
)

var targetDir string

func main() {
	// Parse CLI flag -a
	flag.StringVar(&targetDir, "a", ".", "Directory to scan for unused functions")
	flag.Parse()

	// Gather all Go files
	goFiles := []string{}
	err := filepath.Walk(targetDir, func(path string, info os.FileInfo, err error) error {
		if strings.HasSuffix(path, ".go") && !strings.HasSuffix(path, "_test.go") {
			goFiles = append(goFiles, path)
		}
		return nil
	})
	if err != nil {
		fmt.Println("Error walking the path:", err)
		return
	}

	definedFuncs := make(map[string]bool)
	calledFuncs := make(map[string]bool)

	fs := token.NewFileSet()

	// First pass: gather all defined top-level functions
	for _, file := range goFiles {
		node, err := parser.ParseFile(fs, file, nil, parser.ParseComments)
		if err != nil {
			fmt.Printf("Failed to parse %s: %v\n", file, err)
			continue
		}

		for _, decl := range node.Decls {
			if fn, ok := decl.(*ast.FuncDecl); ok {
				if fn.Recv == nil { // Exclude methods
					definedFuncs[fn.Name.Name] = true
				}
			}
		}
	}

	// Second pass: gather all standalone function calls (not obj.Func() or pkg.Func())
	for _, file := range goFiles {
		node, err := parser.ParseFile(fs, file, nil, parser.ParseComments)
		if err != nil {
			continue
		}

		ast.Inspect(node, func(n ast.Node) bool {
			callExpr, ok := n.(*ast.CallExpr)
			if !ok {
				return true
			}

			switch fun := callExpr.Fun.(type) {
			case *ast.Ident:
				// Direct call: MyFunction()
				calledFuncs[fun.Name] = true
				// Do not include SelectorExpr (e.g., x.MyFunction()) to avoid false positives
			}

			return true
		})
	}

	// Print unused functions
	fmt.Println("=== Unused Top-Level Functions ===")
	for fn := range definedFuncs {
		if !calledFuncs[fn] && fn != "main" {
			fmt.Println(fn)
		}
	}
}
