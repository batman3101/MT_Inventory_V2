import { Alert } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useFactoryStore } from '@/store/factory.store';
import { useTranslation } from 'react-i18next';

export function ObserverModeIndicator() {
  const { t } = useTranslation();
  const { isObserverMode, viewingFactory } = useFactoryStore();

  if (!isObserverMode) return null;

  return (
    <Alert
      type="info"
      icon={<EyeOutlined />}
      message={t('factory.observerMode')}
      description={t('factory.viewingOtherFactory', { factory: viewingFactory?.factory_name })}
      banner
      showIcon
      style={{ marginBottom: 16 }}
    />
  );
}
