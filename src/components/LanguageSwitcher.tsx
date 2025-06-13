import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <select
      value={i18n.language}
      onChange={(e) => changeLanguage(e.target.value)}
      className="bg-white text-black dark:bg-gray-900 dark:text-white border dark:border-gray-700 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="en">English</option>
      <option value="ja">日本語</option>
      <option value="es">Español</option>
      <option value="de">Deutsch</option>
      <option value="fr">Français</option>
      <option value="it">Italiano</option>
      <option value="zh-Hans">简体中文</option>
      <option value="zh-Hant">繁體中文</option>
    </select>
  );
};

export default LanguageSwitcher;
