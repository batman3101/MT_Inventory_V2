import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '../store';

/**
 * Protected Route 컴포넌트
 *
 * 인증된 사용자만 접근할 수 있는 라우트를 보호합니다.
 * 인증되지 않은 사용자는 로그인 페이지로 리다이렉트됩니다.
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, checkSession } = useAuthStore();

  useEffect(() => {
    // 컴포넌트 마운트 시 세션 확인
    checkSession();
  }, [checkSession]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
