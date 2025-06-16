import React, { useEffect, useRef, useState } from 'react';
import { TextField, InputAdornment, Typography, IconButton, SxProps, Theme } from '@mui/material';
import { Search } from 'lucide-react';
import CloseIcon from '@mui/icons-material/Close';

interface ColorScheme {
  primary: string;
  primaryLight?: string;
  text: string;
  textSecondary: string;
  border: string;
  [key: string]: string | undefined;
}

interface SearchComponentProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  colors: ColorScheme;
  isDark: boolean;
  sx?: SxProps<Theme>;
  autoFocus?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  showHint?: boolean;
  hintText?: string;
}

const SearchBox: React.FC<SearchComponentProps> = ({
  value,
  onChange,
  placeholder,
  colors,
  isDark,
  sx,
  autoFocus = false,
  onBlur,
  onFocus,
  showHint = false,
  hintText,
}) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'f') || e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (document.activeElement === searchInputRef.current) {
          onChange('');
          searchInputRef.current?.blur();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChange]);

  return (
    <div className={`relative flex-grow transition-all ${searchFocused ? 'max-w-lg' : 'max-w-sm'}`}>
      <TextField
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => {
          setSearchFocused(true);
          if (onFocus) onFocus();
        }}
        onBlur={() => {
          setSearchFocused(false);
          if (onBlur) onBlur();
        }}
        variant="outlined"
        inputRef={searchInputRef}
        fullWidth
        autoFocus={autoFocus}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search
                style={{
                  color: searchFocused ? colors.primary : colors.textSecondary,
                  transition: 'color 0.2s ease',
                }}
              />
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent losing focus immediately
                  onChange('');
                }}
                edge="end"
                style={{ color: colors.textSecondary }}
                className="transition-all duration-200 hover:bg-opacity-80"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
          style: {
            color: colors.text,
            padding: '8px 10px',
            borderRadius: '12px',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            transition: 'all 0.3s ease',
            minHeight: '32px',
            '& input': {
              padding: '8px 0',
            },
            '& fieldset': {
              borderColor: searchFocused ? colors.primary : colors.border,
              borderWidth: searchFocused ? '2px' : '1px',
            },
            '&:hover fieldset': {
              borderColor: searchFocused ? colors.primary : colors.primaryLight,
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary,
              boxShadow: isDark
                ? '0 0 0 4px rgba(47, 134, 255, 0.15)'
                : '0 0 0 4px rgba(47, 134, 255, 0.1)',
            },
          },
          ...sx,
        }}
      />
      {showHint && searchFocused && (
        <Typography
          variant="caption"
          style={{
            color: colors.textSecondary,
            position: 'absolute',
            bottom: '-20px',
            left: '8px',
          }}
        >
          {hintText}
        </Typography>
      )}
    </div>
  );
};

export default SearchBox;
