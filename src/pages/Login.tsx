import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Checkbox } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store';
import { useNavigate } from 'react-router-dom';

/**
 * Login 페이지
 *
 * Supabase Auth를 사용한 로그인 페이지
 */
const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, isAuthenticated, error, clearError } = useAuthStore();

  // 이미 로그인 상태면 대시보드로 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // 에러 메시지 표시
  useEffect(() => {
    if (error) {
      messageApi.error(t('auth.invalidCredentials'));
      clearError();
    }
  }, [error, messageApi, t, clearError]);

  const handleSubmit = async (values: { email: string; password: string; remember: boolean }) => {
    setIsSubmitting(true);
    try {
      await signIn(values.email, values.password);
      messageApi.success(t('auth.loginSuccess'));
      navigate('/');
    } catch {
      // 에러는 이미 스토어에서 처리됨
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      {contextHolder}
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {t('auth.systemTitle')}
          </h1>
          <p className="text-gray-600">{t('auth.welcomeBack')}</p>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            label={t('auth.email')}
            rules={[
              { required: true, message: t('common.required') },
              { type: 'email', message: t('common.invalidEmail') },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('auth.emailPlaceholder')}
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={t('auth.password')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <div className="flex justify-between items-center">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>{t('auth.rememberMe')}</Checkbox>
              </Form.Item>
              <a href="#" className="text-blue-600 hover:text-blue-800">
                {t('auth.forgotPassword')}
              </a>
            </div>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              loading={isSubmitting}
              size="large"
            >
              {t('auth.loginButton')}
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center text-sm text-gray-500 mt-4">
          <p>© 2025 CNC Inventory Management System</p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
