import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Select, MenuItem, SelectChangeEvent } from '@mui/material';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (event: SelectChangeEvent<string>) => {
    i18n.changeLanguage(event.target.value);
  };

  return (
    <Box sx={{ minWidth: 120 }}>
      <Select value={i18n.language} onChange={changeLanguage} size="small" variant="outlined">
        <MenuItem value="en">English</MenuItem>
        <MenuItem value="ja">日本語</MenuItem>
        <MenuItem value="es">Español</MenuItem>
        <MenuItem value="de">Deutsch</MenuItem>
        <MenuItem value="fr">Français</MenuItem>
        <MenuItem value="it">Italiano</MenuItem>
        <MenuItem value="zh-CN">简体中文</MenuItem>
        <MenuItem value="zh-TW">繁體中文</MenuItem>
      </Select>
    </Box>
  );
};

export default LanguageSwitcher;
