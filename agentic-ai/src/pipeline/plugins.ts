/**
 * Plugin Architecture and Extension System
 *
 * Flexible plugin system for extending pipeline capabilities with
 * custom stages, middleware, hooks, and integrations.
 */

import type {
  Pipeline,
  PipelineStage,
  PipelineMiddleware,
  PipelineContext,
  StageResult,
  PipelineResult,
} from './types.js';
import { EventEmitter } from 'events';

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  dependencies?: string[];
  tags?: string[];
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  onInstall?: () => Promise<void> | void;
  onUninstall?: () => Promise<void> | void;
  onEnable?: () => Promise<void> | void;
  onDisable?: () => Promise<void> | void;
  onPipelineCreate?: (pipeline: Pipeline) => Promise<void> | void;
  onPipelineExecute?: (pipeline: Pipeline, input: unknown) => Promise<void> | void;
  onPipelineComplete?: (pipeline: Pipeline, result: PipelineResult) => Promise<void> | void;
}

/**
 * Plugin interface
 */
export interface Plugin {
  metadata: PluginMetadata;
  hooks?: PluginHooks;
  stages?: Map<string, () => PipelineStage>;
  middleware?: Map<string, () => PipelineMiddleware>;
  extensions?: Map<string, unknown>;
  config?: Record<string, unknown>;
}

/**
 * Plugin registry
 */
export class PluginRegistry extends EventEmitter {
  private plugins = new Map<string, Plugin>();
  private enabledPlugins = new Set<string>();

  /**
   * Register a plugin
   */
  async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.metadata.name)) {
      throw new Error(`Plugin ${plugin.metadata.name} is already registered`);
    }

    // Check dependencies
    if (plugin.metadata.dependencies) {
      for (const dep of plugin.metadata.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Missing dependency: ${dep} for plugin ${plugin.metadata.name}`);
        }
      }
    }

    this.plugins.set(plugin.metadata.name, plugin);

    // Call install hook
    if (plugin.hooks?.onInstall) {
      await plugin.hooks.onInstall();
    }

    this.emit('plugin-registered', plugin.metadata.name);
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    // Check if other plugins depend on this
    for (const [name, p] of this.plugins.entries()) {
      if (p.metadata.dependencies?.includes(pluginName)) {
        throw new Error(`Cannot unregister ${pluginName}: ${name} depends on it`);
      }
    }

    // Disable first if enabled
    if (this.enabledPlugins.has(pluginName)) {
      await this.disable(pluginName);
    }

    // Call uninstall hook
    if (plugin.hooks?.onUninstall) {
      await plugin.hooks.onUninstall();
    }

    this.plugins.delete(pluginName);
    this.emit('plugin-unregistered', pluginName);
  }

  /**
   * Enable a plugin
   */
  async enable(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    if (this.enabledPlugins.has(pluginName)) {
      return; // Already enabled
    }

    // Enable dependencies first
    if (plugin.metadata.dependencies) {
      for (const dep of plugin.metadata.dependencies) {
        await this.enable(dep);
      }
    }

    this.enabledPlugins.add(pluginName);

    // Call enable hook
    if (plugin.hooks?.onEnable) {
      await plugin.hooks.onEnable();
    }

    this.emit('plugin-enabled', pluginName);
  }

  /**
   * Disable a plugin
   */
  async disable(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    if (!this.enabledPlugins.has(pluginName)) {
      return; // Already disabled
    }

    // Check if other enabled plugins depend on this
    for (const enabledName of this.enabledPlugins) {
      const p = this.plugins.get(enabledName);
      if (p?.metadata.dependencies?.includes(pluginName)) {
        throw new Error(`Cannot disable ${pluginName}: ${enabledName} depends on it`);
      }
    }

    this.enabledPlugins.delete(pluginName);

    // Call disable hook
    if (plugin.hooks?.onDisable) {
      await plugin.hooks.onDisable();
    }

    this.emit('plugin-disabled', pluginName);
  }

  /**
   * Get a plugin
   */
  get(pluginName: string): Plugin | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Get all plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get enabled plugins
   */
  getEnabled(): Plugin[] {
    return Array.from(this.enabledPlugins)
      .map(name => this.plugins.get(name))
      .filter((p): p is Plugin => p !== undefined);
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(pluginName: string): boolean {
    return this.enabledPlugins.has(pluginName);
  }

  /**
   * Get stage from plugin
   */
  getStage(pluginName: string, stageName: string): PipelineStage | null {
    const plugin = this.plugins.get(pluginName);
    if (!plugin || !this.enabledPlugins.has(pluginName)) {
      return null;
    }

    const stageFactory = plugin.stages?.get(stageName);
    return stageFactory ? stageFactory() : null;
  }

  /**
   * Get middleware from plugin
   */
  getMiddleware(pluginName: string, middlewareName: string): PipelineMiddleware | null {
    const plugin = this.plugins.get(pluginName);
    if (!plugin || !this.enabledPlugins.has(pluginName)) {
      return null;
    }

    const middlewareFactory = plugin.middleware?.get(middlewareName);
    return middlewareFactory ? middlewareFactory() : null;
  }

  /**
   * Call hook on all enabled plugins
   */
  async callHook(
    hookName: keyof PluginHooks,
    ...args: any[]
  ): Promise<void> {
    for (const pluginName of this.enabledPlugins) {
      const plugin = this.plugins.get(pluginName);
      if (plugin?.hooks?.[hookName]) {
        const hook = plugin.hooks[hookName] as any;
        await hook(...args);
      }
    }
  }
}

/**
 * Extension point interface
 */
export interface ExtensionPoint<T = unknown> {
  name: string;
  description: string;
  register(extension: T): void;
  unregister(extensionId: string): void;
  getAll(): T[];
}

/**
 * Generic extension point
 */
export class GenericExtensionPoint<T extends { id: string }> implements ExtensionPoint<T> {
  private extensions = new Map<string, T>();

  constructor(
    public name: string,
    public description: string
  ) {}

  register(extension: T): void {
    this.extensions.set(extension.id, extension);
  }

  unregister(extensionId: string): void {
    this.extensions.delete(extensionId);
  }

  getAll(): T[] {
    return Array.from(this.extensions.values());
  }

  get(id: string): T | undefined {
    return this.extensions.get(id);
  }
}

/**
 * Plugin-aware pipeline builder
 */
export class PluginAwarePipelineBuilder {
  private registry: PluginRegistry;

  constructor(registry: PluginRegistry) {
    this.registry = registry;
  }

  /**
   * Add stage from plugin
   */
  async addPluginStage(
    pipeline: Pipeline,
    pluginName: string,
    stageName: string
  ): Promise<void> {
    const stage = this.registry.getStage(pluginName, stageName);
    if (!stage) {
      throw new Error(`Stage ${stageName} not found in plugin ${pluginName}`);
    }

    pipeline.addStage(stage);
  }

  /**
   * Add middleware from plugin
   */
  async addPluginMiddleware(
    pipeline: Pipeline,
    pluginName: string,
    middlewareName: string
  ): Promise<void> {
    const middleware = this.registry.getMiddleware(pluginName, middlewareName);
    if (!middleware) {
      throw new Error(`Middleware ${middlewareName} not found in plugin ${pluginName}`);
    }

    pipeline.addMiddleware(middleware);
  }
}

/**
 * Example plugins
 */

/**
 * Notification plugin
 */
export class NotificationPlugin implements Plugin {
  metadata: PluginMetadata = {
    name: 'notifications',
    version: '1.0.0',
    description: 'Send notifications on pipeline events',
  };

  private notificationHandlers: Array<(event: string, data: unknown) => void> = [];

  constructor(private options?: {
    onPipelineComplete?: (result: PipelineResult) => void;
    onPipelineError?: (error: Error) => void;
  }) {}

  hooks: PluginHooks = {
    onEnable: () => {
      console.log('Notification plugin enabled');
    },
    onPipelineComplete: async (pipeline, result) => {
      if (this.options?.onPipelineComplete) {
        this.options.onPipelineComplete(result);
      }
      this.notify('pipeline-complete', { pipeline: pipeline.options.name, result });
    },
  };

  addHandler(handler: (event: string, data: unknown) => void): void {
    this.notificationHandlers.push(handler);
  }

  private notify(event: string, data: unknown): void {
    for (const handler of this.notificationHandlers) {
      try {
        handler(event, data);
      } catch (error) {
        console.error('Notification handler error:', error);
      }
    }
  }
}

/**
 * Metrics aggregation plugin
 */
export class MetricsAggregationPlugin implements Plugin {
  metadata: PluginMetadata = {
    name: 'metrics-aggregation',
    version: '1.0.0',
    description: 'Aggregate and export pipeline metrics',
  };

  private metrics: Array<{
    timestamp: number;
    pipeline: string;
    duration: number;
    success: boolean;
  }> = [];

  hooks: PluginHooks = {
    onPipelineComplete: async (pipeline, result) => {
      this.metrics.push({
        timestamp: Date.now(),
        pipeline: pipeline.options.name,
        duration: result.metrics.totalDuration,
        success: result.success,
      });
    },
  };

  getMetrics() {
    return [...this.metrics];
  }

  exportMetrics(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.metrics, null, 2);
    }

    // CSV format
    const headers = 'timestamp,pipeline,duration,success\n';
    const rows = this.metrics.map(m =>
      `${m.timestamp},${m.pipeline},${m.duration},${m.success}`
    ).join('\n');

    return headers + rows;
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}

/**
 * Webhook plugin
 */
export class WebhookPlugin implements Plugin {
  metadata: PluginMetadata = {
    name: 'webhooks',
    version: '1.0.0',
    description: 'Send webhook notifications on pipeline events',
  };

  constructor(private webhookUrl: string) {}

  hooks: PluginHooks = {
    onPipelineComplete: async (pipeline, result) => {
      try {
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'pipeline-complete',
            pipeline: pipeline.options.name,
            success: result.success,
            duration: result.metrics.totalDuration,
            timestamp: Date.now(),
          }),
        });

        if (!response.ok) {
          console.error('Webhook failed:', response.statusText);
        }
      } catch (error) {
        console.error('Webhook error:', error);
      }
    },
  };
}

/**
 * Plugin loader from file
 */
export class PluginLoader {
  /**
   * Load plugin from file path
   */
  static async loadFromFile(filePath: string): Promise<Plugin> {
    try {
      const module = await import(filePath);
      const PluginClass = module.default || module.Plugin;

      if (!PluginClass) {
        throw new Error('No default export or Plugin export found');
      }

      return new PluginClass();
    } catch (error) {
      throw new Error(`Failed to load plugin from ${filePath}: ${error}`);
    }
  }

  /**
   * Load plugins from directory
   */
  static async loadFromDirectory(dirPath: string): Promise<Plugin[]> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const plugins: Plugin[] = [];
    const files = await fs.readdir(dirPath);

    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        const filePath = path.join(dirPath, file);
        try {
          const plugin = await this.loadFromFile(filePath);
          plugins.push(plugin);
        } catch (error) {
          console.error(`Failed to load plugin from ${file}:`, error);
        }
      }
    }

    return plugins;
  }
}
