import { WASMModule } from './types';

export class WASMPluginLoader {
  private loadedModules: Map<string, WASMModule> = new Map();
  private moduleCache: Map<string, ArrayBuffer> = new Map();

  async loadWASM(pluginName: string, wasmFile: string): Promise<WebAssembly.Module> {
    try {
      console.log(`Loading WASM module for plugin: ${pluginName}`);

      // Check if already loaded
      if (this.loadedModules.has(pluginName)) {
        console.log(`WASM module for ${pluginName} already loaded`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this.loadedModules.get(pluginName)!.instance.exports as any;
      }

      // Fetch WASM file
      const wasmUrl = `/api/plugins/${pluginName}/assets/${wasmFile}`;
      let wasmBuffer: ArrayBuffer;

      // Check cache first
      if (this.moduleCache.has(wasmUrl)) {
        wasmBuffer = this.moduleCache.get(wasmUrl)!;
      } else {
        const response = await fetch(wasmUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch WASM file: ${response.statusText}`);
        }
        wasmBuffer = await response.arrayBuffer();
        this.moduleCache.set(wasmUrl, wasmBuffer);
      }

      // Compile WASM module
      const wasmModule = await WebAssembly.compile(wasmBuffer);

      // Create imports object for the WASM module
      const imports = this.createImports(pluginName);

      // Instantiate the module
      const wasmInstance = await WebAssembly.instantiate(wasmModule, imports);

      // Store the loaded module
      const moduleInfo: WASMModule = {
        instance: wasmInstance,
        memory: wasmInstance.exports.memory as WebAssembly.Memory,
        exports: wasmInstance.exports,
      };

      this.loadedModules.set(pluginName, moduleInfo);

      // Initialize the plugin if it has a main function
      if (wasmInstance.exports.main) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
          (wasmInstance.exports.main as Function)();
        } catch (error) {
          console.warn(`Plugin ${pluginName} main function failed:`, error);
        }
      }

      console.log(`WASM module for ${pluginName} loaded successfully`);
      return wasmModule;
    } catch (error) {
      console.error(`Failed to load WASM module for ${pluginName}:`, error);
      throw error;
    }
  }

  async unloadWASM(pluginName: string): Promise<void> {
    if (this.loadedModules.has(pluginName)) {
      this.loadedModules.delete(pluginName);
      console.log(`WASM module for ${pluginName} unloaded`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async callFunction(pluginName: string, functionName: string, args?: any): Promise<any> {
    const module = this.loadedModules.get(pluginName);
    if (!module) {
      throw new Error(`Plugin ${pluginName} is not loaded`);
    }

    const func = module.exports[functionName];
    if (!func || typeof func !== 'function') {
      throw new Error(`Function ${functionName} not found in plugin ${pluginName}`);
    }

    try {
      // Serialize arguments to JSON and pass to WASM
      const inputData = JSON.stringify(args || {});
      const inputBuffer = new TextEncoder().encode(inputData);

      // Allocate memory in WASM
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      const allocate = module.exports.allocate as Function;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      const deallocate = module.exports.deallocate as Function;

      if (!allocate) {
        throw new Error(`Plugin ${pluginName} does not export allocate function`);
      }

      const inputPtr = allocate(inputBuffer.length);
      const memory = new Uint8Array(module.memory.buffer);
      memory.set(inputBuffer, inputPtr);

      // Call the function
      const result = func(inputPtr, inputBuffer.length);

      // Handle return value
      if (Array.isArray(result) && result.length === 2) {
        const [outputPtr, outputSize] = result;
        const outputBuffer = new Uint8Array(module.memory.buffer, outputPtr, outputSize);
        const outputData = new TextDecoder().decode(outputBuffer);

        // Deallocate input memory
        if (deallocate) {
          deallocate(inputPtr, inputBuffer.length);
        }

        try {
          return JSON.parse(outputData);
        } catch {
          return outputData;
        }
      }

      return result;
    } catch (error) {
      console.error(`Error calling function ${functionName} in plugin ${pluginName}:`, error);
      throw error;
    }
  }

  private createImports(pluginName: string): WebAssembly.Imports {
    return {
      env: {
        // Memory management
        memory: new WebAssembly.Memory({ initial: 1, maximum: 10 }),
      },
      host: {
        // Host function: logging
        host_log: (ptr: number, size: number) => {
          const module = this.loadedModules.get(pluginName);
          if (module) {
            const memory = new Uint8Array(module.memory.buffer);
            const message = new TextDecoder().decode(memory.slice(ptr, ptr + size));
            console.log(`[Plugin ${pluginName}]`, message);
          }
        },

        // Host function: K8s API call
        host_k8s_api_call: (
          methodPtr: number,
          methodSize: number,
          urlPtr: number,
          urlSize: number,
          bodyPtr: number,
          bodySize: number
        ) => {
          const module = this.loadedModules.get(pluginName);
          if (!module) return 0;

          const memory = new Uint8Array(module.memory.buffer);
          const method = new TextDecoder().decode(memory.slice(methodPtr, methodPtr + methodSize));
          const url = new TextDecoder().decode(memory.slice(urlPtr, urlPtr + urlSize));
          const body =
            bodySize > 0 ? new TextDecoder().decode(memory.slice(bodyPtr, bodyPtr + bodySize)) : '';

          // Make API call through backend
          this.makeAPICall(method, url, body)
            .then(response => {
              console.log(`K8s API call result:`, response);
            })
            .catch(error => {
              console.error(`K8s API call failed:`, error);
            });

          return 1; // Success
        },

        // Host function: get configuration
        host_get_config: (keyPtr: number, keySize: number) => {
          const module = this.loadedModules.get(pluginName);
          if (!module) return 0;

          const memory = new Uint8Array(module.memory.buffer);
          const key = new TextDecoder().decode(memory.slice(keyPtr, keyPtr + keySize));

          // Get config from plugin manifest or local storage
          const config = this.getPluginConfig(pluginName, key);
          console.log(`Config for ${pluginName}.${key}:`, config);

          return config ? 1 : 0;
        },

        // Host function: get from storage
        host_storage_get: (keyPtr: number, keySize: number) => {
          const module = this.loadedModules.get(pluginName);
          if (!module) return 0;

          const memory = new Uint8Array(module.memory.buffer);
          const key = new TextDecoder().decode(memory.slice(keyPtr, keyPtr + keySize));

          // Get from localStorage or IndexedDB
          const value = localStorage.getItem(`plugin_${pluginName}_${key}`);
          console.log(`Storage get for ${pluginName}.${key}:`, value);

          return value ? 1 : 0;
        },

        // Host function: set to storage
        host_storage_set: (
          keyPtr: number,
          keySize: number,
          valuePtr: number,
          valueSize: number
        ) => {
          const module = this.loadedModules.get(pluginName);
          if (!module) return 0;

          const memory = new Uint8Array(module.memory.buffer);
          const key = new TextDecoder().decode(memory.slice(keyPtr, keyPtr + keySize));
          const value = new TextDecoder().decode(memory.slice(valuePtr, valuePtr + valueSize));

          // Store in localStorage or IndexedDB
          localStorage.setItem(`plugin_${pluginName}_${key}`, value);
          console.log(`Storage set for ${pluginName}.${key}:`, value);

          return 1; // Success
        },
      },
      wasi_snapshot_preview1: {
        // WASI stubs (minimal implementation)
        proc_exit: (code: number) => {
          console.log(`Plugin ${pluginName} exited with code ${code}`);
        },
        fd_write: () => 0,
        fd_read: () => 0,
        fd_close: () => 0,
        fd_seek: () => 0,
        path_open: () => 0,
        environ_get: () => 0,
        environ_sizes_get: () => 0,
        args_get: () => 0,
        args_sizes_get: () => 0,
        clock_time_get: () => 0,
        random_get: () => 0,
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async makeAPICall(method: string, url: string, body: string): Promise<any> {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body || undefined,
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getPluginConfig(pluginName: string, key: string): any {
    // This would typically get config from the plugin manifest
    // For now, return a placeholder
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configs: Record<string, any> = {
      refreshInterval: 30,
      debug: false,
      apiTimeout: 5000,
    };

    return configs[key] || null;
  }

  getLoadedPlugins(): string[] {
    return Array.from(this.loadedModules.keys());
  }

  isPluginLoaded(pluginName: string): boolean {
    return this.loadedModules.has(pluginName);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPluginExports(pluginName: string): Record<string, any> | null {
    const module = this.loadedModules.get(pluginName);
    return module ? module.exports : null;
  }

  clearCache(): void {
    this.moduleCache.clear();
    console.log('WASM module cache cleared');
  }
}
