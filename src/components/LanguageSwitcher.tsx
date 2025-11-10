import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const languages = [
    { code: 'ko', label: t('language.korean'), flag: '🇰🇷' },
    { code: 'vi', label: t('language.vietnamese'), flag: '🇻🇳' },
  ];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 uppercase font-semibold">
        {t('language.selectLanguage')}
      </label>
      <div className="flex gap-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              i18n.language === lang.code
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={lang.label}
          >
            <span className="text-lg">{lang.flag}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
