import { useTranslation } from 'react-i18next';
import { useFactoryStore, useAuthStore } from '../store';

const FactorySelector = () => {
  const { t } = useTranslation();
  const { factories, activeFactory, viewingFactory, isObserverMode, setViewingFactory, setActiveFactory } = useFactoryStore();
  const { user } = useAuthStore();
  const isSystemAdmin = user?.role === 'system_admin';

  const effectiveFactory = viewingFactory ?? activeFactory;

  const handleFactoryClick = (factoryId: string) => {
    const factory = factories.find(f => f.factory_id === factoryId);
    if (!factory) return;

    if (isSystemAdmin) {
      // system_admin directly switches active factory
      setActiveFactory(factory);
    } else {
      // Non-admin: set viewing factory (observer mode if different from active)
      setViewingFactory(factory.factory_id === activeFactory?.factory_id ? null : factory);
    }
  };

  if (factories.length === 0) return null;

  return (
    <div className="flex flex-col gap-2" style={{ marginBottom: 12 }}>
      <label className="text-xs text-gray-400 uppercase font-semibold">
        {t('factory.selectFactory')}
      </label>
      <div className="flex gap-2">
        {factories.map((factory) => {
          const isSelected = effectiveFactory?.factory_id === factory.factory_id;
          const isObserving = !isSystemAdmin && isSelected && isObserverMode;

          return (
            <button
              key={factory.factory_id}
              onClick={() => handleFactoryClick(factory.factory_id)}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isObserving
                  ? 'bg-amber-500 text-white'
                  : isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={factory.factory_name}
            >
              <span className="font-semibold">{factory.factory_code}</span>
              {isObserving && (
                <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FactorySelector;
