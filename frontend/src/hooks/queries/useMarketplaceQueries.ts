import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

// Types for marketplace API responses and requests
export interface MarketplacePlugin {
  // Backend fields
  plugin_id: number;
  plugin_name: string;
  version: string;
  description: string;
  author: string;
  featured?: boolean;
  rating_average?: number;
  rating_count?: number;
  downloads?: number;
  active_installs?: number;
  license?: string;
  tags?: string[];
  min_version?: string;
  max_version?: string;
  dependencies?: Dependency[];
  created_at?: string | Date;
  updated_at?: string | Date;
  feedback?: PluginFeedback[];

  // Frontend-only fields
  enabled?: boolean;
  status?: 'active' | 'inactive' | 'loading' | 'error' | 'installed';
  loadTime?: Date;
  routes?: string[];
  category?: string;

  // Transformed fields (camelCase) - for frontend convenience
  // These will be populated in the transform functions
  id?: number;
  name?: string;
  ratingAverage?: number;
  ratingCount?: number;
  activeInstalls?: number;
  minVersion?: string;
  maxVersion?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastUpdated?: Date;
}

export interface Dependency {
  name: string;
  version: string;
  required: boolean;
}

export interface PluginFeedback {
  id?: number;
  plugin_id: number;
  user_id: number;
  rating: number;
  comment: string;
  suggestions?: string;
  created_at?: string | Date;
  updated_at?: string | Date;

  // Frontend transformed fields
  pluginId?: number;
  userId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PluginUploadResponse {
  message: string;
  key: string;
}

export interface PluginDeleteResponse {
  message: string;
  plugin_id: number;
}

export interface FeedbackSubmissionResponse {
  message: string;
  feedback: {
    plugin_id: number;
    marketplace_plugin_id: number;
    user_id: number;
    rating: number;
    comment: string;
    suggestions?: string;
    created_at: Date;
    updated_at: Date;
  };
}

export interface SearchFilters {
  keyword?: string;
  sort_by?: 'popular' | 'rating' | 'newest' | 'created_at' | 'downloads';
  tag?: string;
}

export interface MarketplacePluginsResponse {
  message: string;
  marketplace_plugins: MarketplacePlugin[];
}

export interface SinglePluginResponse {
  message: string;
  marketplace_plugin: MarketplacePlugin;
}

export interface PluginReviewsResponse {
  message: string;
  reviews: PluginFeedback[];
}

export interface PluginCategoriesResponse {
  message: string;
  tags: string[];
}

export interface FeaturedPluginsResponse {
  message: string;
  plugins: MarketplacePlugin[];
}

export interface PluginDependenciesResponse {
  message: string;
  dependencies: Dependency[];
}

export interface SearchPluginsResponse {
  message: string;
  filters: {
    keyword: string;
    sort: string;
    tag: string;
  };
  plugins: MarketplacePlugin[];
}

export interface InstallPluginResponse {
  message: string;
  plugin: string;
}

interface QueryOptions {
  staleTime?: number;
  cacheTime?: number;
  refetchInterval?: number;
  retry?: number | boolean;
  enabled?: boolean;
}

export const useMarketplaceQueries = () => {
  const queryClient = useQueryClient();

  // Get all marketplace plugins
  const useMarketplacePlugins = (options?: QueryOptions) => {
    return useQuery({
      queryKey: ['marketplace-plugins'],
      queryFn: async (): Promise<MarketplacePlugin[]> => {
        const response = await api.get<MarketplacePluginsResponse>('/api/marketplace/plugins');
        const rawPlugins = response.data.marketplace_plugins || [];

        // Transform backend response to include frontend convenience fields
        return rawPlugins.map(plugin => ({
          ...plugin,
          // Create frontend camelCase fields from backend snake_case
          id: plugin.plugin_id,
          name: plugin.plugin_name,
          ratingAverage: plugin.rating_average,
          ratingCount: plugin.rating_count,
          activeInstalls: plugin.active_installs,
          minVersion: plugin.min_version,
          maxVersion: plugin.max_version,
          // Convert string dates to Date objects
          createdAt: plugin.created_at ? new Date(plugin.created_at) : undefined,
          updatedAt: plugin.updated_at ? new Date(plugin.updated_at) : undefined,
          lastUpdated: plugin.updated_at ? new Date(plugin.updated_at) : new Date(),
          // Set default UI state
          enabled: true,
        }));
      },
      staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutes
      cacheTime: options?.cacheTime || 10 * 60 * 1000, // 10 minutes
      ...options,
    });
  };

  // Get a single marketplace plugin by ID
  const useMarketplacePlugin = (pluginId: number, options?: QueryOptions) => {
    return useQuery({
      queryKey: ['marketplace-plugin', pluginId],
      queryFn: async (): Promise<MarketplacePlugin> => {
        const response = await api.get<SinglePluginResponse>(
          `/api/marketplace/plugins/${pluginId}`
        );
        const plugin = response.data.marketplace_plugin;

        // Transform backend response to include frontend convenience fields
        return {
          ...plugin,
          // Create frontend camelCase fields from backend snake_case
          id: plugin.plugin_id,
          name: plugin.plugin_name,
          ratingAverage: plugin.rating_average,
          ratingCount: plugin.rating_count,
          activeInstalls: plugin.active_installs,
          minVersion: plugin.min_version,
          maxVersion: plugin.max_version,
          // Convert string dates to Date objects
          createdAt: plugin.created_at ? new Date(plugin.created_at) : undefined,
          updatedAt: plugin.updated_at ? new Date(plugin.updated_at) : undefined,
          lastUpdated: plugin.updated_at ? new Date(plugin.updated_at) : new Date(),
          // Set default UI state
          enabled: true,
        };
      },
      staleTime: options?.staleTime || 60000, // 1 minute
      gcTime: options?.cacheTime || 300000, // 5 minutes
      enabled: (options?.enabled !== undefined ? options.enabled : true) && !!pluginId,
    });
  };

  // Get plugin reviews/feedback
  const usePluginReviews = (pluginId: number, options?: QueryOptions) => {
    return useQuery({
      queryKey: ['plugin-reviews', pluginId],
      queryFn: async (): Promise<PluginFeedback[]> => {
        const response = await api.get<PluginReviewsResponse>(
          `/api/marketplace/plugins/${pluginId}/reviews`
        );
        const reviews = response.data.reviews || [];

        // Transform reviews to include frontend convenience fields
        return reviews.map(review => ({
          ...review,
          // Create frontend camelCase fields from backend snake_case
          pluginId: review.plugin_id,
          userId: review.user_id,
          // Convert string dates to Date objects
          createdAt: review.created_at ? new Date(review.created_at) : undefined,
          updatedAt: review.updated_at ? new Date(review.updated_at) : undefined,
        }));
      },
      staleTime: options?.staleTime || 60000, // 1 minute
      gcTime: options?.cacheTime || 300000, // 5 minutes
      enabled: (options?.enabled !== undefined ? options.enabled : true) && !!pluginId,
    });
  };

  // Get marketplace plugin categories
  const usePluginCategories = (options?: QueryOptions) => {
    return useQuery({
      queryKey: ['plugin-categories'],
      queryFn: async (): Promise<string[]> => {
        const response = await api.get<PluginCategoriesResponse>(
          '/api/marketplace/plugins/categories'
        );
        return response.data.tags || [];
      },
      staleTime: options?.staleTime || 300000, // 5 minutes - categories don't change often
      gcTime: options?.cacheTime || 600000, // 10 minutes
      retry: options?.retry !== undefined ? options?.retry : 1,
      enabled: options?.enabled !== undefined ? options.enabled : true,
    });
  };

  // Get featured marketplace plugins
  const useFeaturedPlugins = (options?: QueryOptions) => {
    return useQuery({
      queryKey: ['featured-plugins'],
      queryFn: async (): Promise<MarketplacePlugin[]> => {
        const response = await api.get<FeaturedPluginsResponse>(
          '/api/marketplace/plugins/featured'
        );
        const rawPlugins = response.data.plugins || [];

        // Transform backend response to include frontend convenience fields
        return rawPlugins.map(plugin => ({
          ...plugin,
          // Create frontend camelCase fields from backend snake_case
          id: plugin.plugin_id,
          name: plugin.plugin_name,
          ratingAverage: plugin.rating_average,
          ratingCount: plugin.rating_count,
          activeInstalls: plugin.active_installs,
          minVersion: plugin.min_version,
          maxVersion: plugin.max_version,
          // Convert string dates to Date objects
          createdAt: plugin.created_at ? new Date(plugin.created_at) : undefined,
          updatedAt: plugin.updated_at ? new Date(plugin.updated_at) : undefined,
          lastUpdated: plugin.updated_at ? new Date(plugin.updated_at) : new Date(),
          // Set default UI state
          enabled: true,
        }));
      },
      staleTime: options?.staleTime || 60000, // 1 minute
      gcTime: options?.cacheTime || 300000, // 5 minutes
      refetchInterval: options?.refetchInterval,
      retry: options?.retry !== undefined ? options?.retry : 1,
      enabled: options?.enabled !== undefined ? options.enabled : true,
    });
  };

  // Get plugin dependencies
  const usePluginDependencies = (pluginId: number, options?: QueryOptions) => {
    return useQuery({
      queryKey: ['plugin-dependencies', pluginId],
      queryFn: async (): Promise<Dependency[]> => {
        const response = await api.get<PluginDependenciesResponse>(
          `/api/marketplace/plugins/${pluginId}/dependencies`
        );
        return response.data.dependencies || [];
      },
      staleTime: options?.staleTime || 300000, // 5 minutes - dependencies don't change often
      gcTime: options?.cacheTime || 600000, // 10 minutes
      enabled: (options?.enabled !== undefined ? options.enabled : true) && !!pluginId,
    });
  };

  // Search marketplace plugins
  const useSearchPlugins = (filters: SearchFilters, options?: QueryOptions) => {
    return useQuery({
      queryKey: ['search-plugins', filters],
      queryFn: async (): Promise<SearchPluginsResponse> => {
        const params = new URLSearchParams();
        if (filters.keyword) params.append('keyword', filters.keyword);
        if (filters.sort_by) params.append('sort_by', filters.sort_by);
        if (filters.tag) params.append('tag', filters.tag);

        const response = await api.get<SearchPluginsResponse>(
          `/api/marketplace/plugins/search?${params.toString()}`
        );
        const searchResponse = response.data;

        // Transform plugins in search response
        const transformedPlugins = (searchResponse.plugins || []).map(plugin => ({
          ...plugin,
          // Create frontend camelCase fields from backend snake_case
          id: plugin.plugin_id,
          name: plugin.plugin_name,
          ratingAverage: plugin.rating_average,
          ratingCount: plugin.rating_count,
          activeInstalls: plugin.active_installs,
          minVersion: plugin.min_version,
          maxVersion: plugin.max_version,
          // Convert string dates to Date objects
          createdAt: plugin.created_at ? new Date(plugin.created_at) : undefined,
          updatedAt: plugin.updated_at ? new Date(plugin.updated_at) : undefined,
          lastUpdated: plugin.updated_at ? new Date(plugin.updated_at) : new Date(),
          // Set default UI state
          enabled: true,
        }));

        return {
          ...searchResponse,
          plugins: transformedPlugins,
        };
      },
      staleTime: options?.staleTime || 30000, // 30 seconds
      gcTime: options?.cacheTime || 300000, // 5 minutes
      enabled:
        (options?.enabled !== undefined ? options.enabled : true) &&
        (!!filters.keyword || !!filters.sort_by || !!filters.tag),
    });
  };

  // Upload plugin mutation
  const useUploadPlugin = () => {
    return useMutation<PluginUploadResponse, Error, File>({
      mutationFn: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post<PluginUploadResponse>(
          '/api/marketplace/plugins/upload',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        return response.data;
      },
      onSuccess: data => {
        toast.success(data.message || 'Plugin uploaded successfully');
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['marketplace-plugins'] });
        queryClient.invalidateQueries({ queryKey: ['featured-plugins'] });
      },
      onError: (error: Error) => {
        console.error('Error uploading plugin:', error);
        toast.error('Failed to upload plugin');
      },
    });
  };

  // Delete plugin mutation
  const useDeletePlugin = () => {
    return useMutation<PluginDeleteResponse, Error, number>({
      mutationFn: async (pluginId: number) => {
        const response = await api.delete<PluginDeleteResponse>(
          `/api/marketplace/plugins/${pluginId}`
        );
        return response.data;
      },
      onSuccess: data => {
        toast.success(data.message || 'Plugin deleted successfully');
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['marketplace-plugins'] });
        queryClient.invalidateQueries({ queryKey: ['featured-plugins'] });
        queryClient.invalidateQueries({ queryKey: ['marketplace-plugin', data.plugin_id] });
      },
      onError: (error: Error) => {
        console.error('Error deleting plugin:', error);
        toast.error('Failed to delete plugin');
      },
    });
  };

  // Install/Download plugin mutation
  const useInstallPlugin = () => {
    return useMutation<InstallPluginResponse, Error, number>({
      mutationFn: async (pluginId: number) => {
        const response = await api.get<InstallPluginResponse>(
          `/api/marketplace/plugins/download/${pluginId}`
        );
        return response.data;
      },
      onSuccess: data => {
        toast.success(data.message || 'Plugin installed successfully');
        // Invalidate relevant queries to reflect updated install counts
        queryClient.invalidateQueries({ queryKey: ['marketplace-plugins'] });
        queryClient.invalidateQueries({ queryKey: ['featured-plugins'] });
      },
      onError: (error: Error) => {
        console.error('Error installing plugin:', error);
        toast.error('Failed to install plugin');
      },
    });
  };

  // Submit plugin feedback mutation
  const useSubmitFeedback = () => {
    return useMutation<
      FeedbackSubmissionResponse,
      Error,
      {
        pluginId: number;
        feedback: {
          plugin_id: number;
          user_id: number;
          rating: number;
          comment: string;
          suggestions?: string;
        };
      }
    >({
      mutationFn: async ({ pluginId, feedback }) => {
        const response = await api.post<FeedbackSubmissionResponse>(
          `/api/marketplace/plugins/${pluginId}/reviews`,
          feedback
        );
        return response.data;
      },
      onSuccess: (data, variables) => {
        toast.success(data.message || 'Feedback submitted successfully');
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['plugin-reviews', variables.pluginId] });
        queryClient.invalidateQueries({ queryKey: ['marketplace-plugin', variables.pluginId] });
        queryClient.invalidateQueries({ queryKey: ['marketplace-plugins'] });
      },
      onError: (error: Error) => {
        console.error('Error submitting feedback:', error);
        toast.error('Failed to submit feedback');
      },
    });
  };

  return {
    // Query hooks
    useMarketplacePlugins,
    useMarketplacePlugin,
    usePluginReviews,
    usePluginCategories,
    useFeaturedPlugins,
    usePluginDependencies,
    useSearchPlugins,

    // Mutation hooks
    useUploadPlugin,
    useDeletePlugin,
    useInstallPlugin,
    useSubmitFeedback,
  };
};
