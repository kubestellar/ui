import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import languageDetector from 'i18next-browser-languagedetector';
import en from './locales/strings.en.json'
import ja from './locales/strings.ja.json';
import es from './locales/strings.es.json';
import de from './locales/strings.de.json';
import fr from './locales/strings.fr.json';
import it from './locales/strings.it.json';
import zh_CN from './locales/strings.zh_CN.json';
import zh_TW from './locales/strings.zh_TW.json';

i18next
  .use(languageDetector)
  .use(initReactI18next) 
  .init({
    resources: {
    en: { translation: en },
    ja: { translation: ja },
    es: { translation: es },
    de: { translation: de },
    fr: { translation: fr },
    it: { translation: it },
    'zh-CN': { translation: zh_CN },
    'zh-TW': { translation: zh_TW },
    },
    lng: 'en', 
    fallbackLng: 'en', 
    interpolation: {
      escapeValue: false, 
    },
    debug: true, 
  });