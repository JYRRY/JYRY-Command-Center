import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './en.json'
import ar from './ar.json'
import de from './de.json'

function getStoredLang(): string {
  try {
    const stored = localStorage.getItem('jyry-lang')
    if (stored === 'en' || stored === 'ar' || stored === 'de') return stored
  } catch { /* ignore */ }
  return 'en'
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      de: { translation: de },
    },
    lng: getStoredLang(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

export default i18n
