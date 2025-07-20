import React from 'react';
import { useTranslation } from 'react-i18next';
import useTheme from '../../stores/themeStore';
import getThemeStyles from '../../lib/theme-utils';

interface CategoryFilterProps {
  categories: Array<{ id: string; name: string; icon?: React.ReactNode }>;
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = React.memo(({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);

  return (
    <div className="mb-6 overflow-hidden relative">
      {/* Simple divider */}
      <div className="relative h-px mb-4">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent opacity-50" />
      </div>
      
      <div className="relative">
        <div className="flex gap-2 flex-wrap pb-2 overflow-x-auto relative z-10">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-2 hover:scale-105 hover:-translate-y-0.5 ${
                selectedCategory === category.id ? 'font-medium' : ''
              }`}
              style={{
                background:
                  selectedCategory === category.id
                    ? `linear-gradient(135deg, ${themeStyles.colors.brand.primary}, ${themeStyles.colors.brand.primaryDark})`
                    : isDark ? 'rgba(31, 41, 55, 0.4)' : 'rgba(249, 250, 251, 0.7)',
                color:
                  selectedCategory === category.id
                    ? '#ffffff'
                    : themeStyles.colors.text.primary,
                border: `1px solid ${
                  selectedCategory === category.id
                    ? 'transparent'
                    : isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(226, 232, 240, 0.7)'
                }`,
                boxShadow: selectedCategory === category.id 
                  ? '0 4px 6px rgba(37, 99, 235, 0.2)' 
                  : 'none',
                backdropFilter: 'blur(8px)',
              }}
            >
              {category.icon && (
                <span>
                  {category.icon}
                </span>
              )}
              {t(`marketplace.category.${category.id}`, category.name)}
              
              {selectedCategory === category.id && (
                <span className="relative ml-1">
                  <span className="flex h-2 w-2 relative">
                    <span 
                      className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"
                    />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Simple divider */}
      <div className="relative h-px mt-4">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent opacity-50" />
      </div>
    </div>
  );
});

CategoryFilter.displayName = 'CategoryFilter';