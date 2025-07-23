import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Tabs,
  Tab,
  Grid,
  Paper,

  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,

  Snackbar
} from '@mui/material';
import {
  Storage as StorageIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Code as CodeIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { supabase } from '../utils/supabase';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface ConnectionStatus {
  isConnected: boolean;
  url: string;
  lastChecked: Date;
  error?: string;
}

interface SupabaseConfig {
  url: string;
  key: string;
}

const SupabaseSettingsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    url: '',
    lastChecked: new Date()
  });
  const [config, setConfig] = useState<SupabaseConfig>({
    url: '',
    key: ''
  });
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [sqlDialogOpen, setSqlDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [backupData, setBackupData] = useState<any>(null);

  useEffect(() => {
    loadCurrentSettings();
    testConnection();
  }, []);

  const loadCurrentSettings = async () => {
    try {
      // 환경 변수에서 현재 설정 로드
      const currentUrl = process.env.REACT_APP_SUPABASE_URL || '';
      const currentKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
      
      setConfig({
        url: currentUrl,
        key: currentKey
      });
      
      setConnectionStatus(prev => ({
        ...prev,
        url: currentUrl
      }));
    } catch (error) {
      console.error('설정 로드 실패:', error);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .select('user_id')
        .limit(1);
      
      if (error) {
        setConnectionStatus({
          isConnected: false,
          url: config.url,
          lastChecked: new Date(),
          error: error.message
        });
      } else {
        setConnectionStatus({
          isConnected: true,
          url: config.url,
          lastChecked: new Date()
        });
      }
    } catch (error) {
      setConnectionStatus({
        isConnected: false,
        url: config.url,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : '연결 테스트 실패'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = async () => {
    if (!config.url || !config.key) {
      setSnackbar({
        open: true,
        message: 'URL과 API Key를 모두 입력해주세요.',
        severity: 'error'
      });
      return;
    }

    try {
      // 실제 환경에서는 백엔드 API를 통해 환경 변수 업데이트
      // 여기서는 로컬 스토리지에 임시 저장
      localStorage.setItem('supabase_config', JSON.stringify(config));
      
      setSnackbar({
        open: true,
        message: 'Supabase 설정이 업데이트되었습니다. 페이지를 새로고침해주세요.',
        severity: 'success'
      });
      
      // 연결 테스트 재실행
      await testConnection();
    } catch (error) {
      setSnackbar({
        open: true,
        message: '설정 업데이트에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const handleBackupDownload = async () => {
    try {
      setLoading(true);
      
      // 주요 테이블 데이터 백업
      const tables = ['users', 'departments', 'parts', 'inventory', 'suppliers'];
      const backupData: any = {
        timestamp: new Date().toISOString(),
        tables: {}
      };
      
      for (const table of tables) {
        try {
          const { data, error } = await supabase.from(table).select('*');
          if (!error && data) {
            backupData.tables[table] = data;
          }
        } catch (error) {
          console.warn(`테이블 ${table} 백업 실패:`, error);
        }
      }
      
      // JSON 파일로 다운로드
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supabase_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSnackbar({
        open: true,
        message: '데이터베이스 백업이 완료되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '백업 생성에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          setBackupData(data);
          setSnackbar({
            open: true,
            message: '백업 파일이 로드되었습니다.',
            severity: 'success'
          });
        } catch (error) {
          setSnackbar({
            open: true,
            message: '잘못된 JSON 파일입니다.',
            severity: 'error'
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 10) return key;
    return key.substring(0, 5) + '*'.repeat(key.length - 10) + key.substring(key.length - 5);
  };

  const sqlSchemas = {
    users: `CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  department_id UUID REFERENCES departments(department_id),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`,
    departments: `CREATE TABLE IF NOT EXISTS departments (
  department_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_code VARCHAR(20) UNIQUE NOT NULL,
  department_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`,
    parts: `CREATE TABLE IF NOT EXISTS parts (
  part_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_code VARCHAR(50) UNIQUE NOT NULL,
  part_name VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  description TEXT,
  unit VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`,
    inventory: `CREATE TABLE IF NOT EXISTS inventory (
  inventory_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_id UUID NOT NULL REFERENCES parts(part_id),
  current_quantity INTEGER NOT NULL DEFAULT 0,
  minimum_quantity INTEGER DEFAULT 0,
  maximum_quantity INTEGER,
  location VARCHAR(100),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`,
    suppliers: `CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_code VARCHAR(50) UNIQUE NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(100),
  address TEXT,
  country VARCHAR(50) DEFAULT '대한민국',
  website VARCHAR(200),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon />
        Supabase 연결 설정
      </Typography>

      {/* 연결 상태 카드 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StorageIcon />
              연결 상태
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={testConnection}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              연결 테스트
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {connectionStatus.isConnected ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <ErrorIcon color="error" />
                )}
                <Typography variant="body1">
                  {connectionStatus.isConnected ? '연결됨' : '연결 실패'}
                </Typography>
              </Box>
              
              {connectionStatus.url && (
                <Typography variant="body2" color="text.secondary">
                  URL: {connectionStatus.url}
                </Typography>
              )}
              
              <Typography variant="body2" color="text.secondary">
                마지막 확인: {connectionStatus.lastChecked.toLocaleString()}
              </Typography>
              
              {connectionStatus.error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {connectionStatus.error}
                </Alert>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              {config.key && (
                <Typography variant="body2" color="text.secondary">
                  API Key: {maskApiKey(config.key)}
                </Typography>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 탭 메뉴 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="연결 설정" />
          <Tab label="데이터베이스 스키마" />
          <Tab label="백업 & 복원" />
        </Tabs>
      </Paper>

      {/* 연결 설정 탭 */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Supabase 연결 정보 변경
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Supabase URL"
                  value={config.url}
                  onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://your-project.supabase.co"
                  helperText="Supabase 프로젝트 URL을 입력하세요"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Supabase API Key"
                  type={showKey ? 'text' : 'password'}
                  value={config.key}
                  onChange={(e) => setConfig(prev => ({ ...prev, key: e.target.value }))}
                  placeholder="your-anon-key"
                  helperText="Supabase Anonymous Key를 입력하세요"
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowKey(!showKey)}
                        edge="end"
                      >
                        {showKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={handleConfigUpdate}
                  disabled={loading}
                  sx={{ mr: 2 }}
                >
                  설정 저장
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={testConnection}
                  disabled={loading}
                >
                  연결 테스트
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* 데이터베이스 스키마 탭 */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">
                필요한 테이블 스키마
              </Typography>
              <Button
                variant="outlined"
                startIcon={<CodeIcon />}
                onClick={() => setSqlDialogOpen(true)}
              >
                전체 SQL 보기
              </Button>
            </Box>
            
            {Object.entries(sqlSchemas).map(([tableName, schema]) => (
              <Accordion key={tableName}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">
                    {tableName} 테이블
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                    <pre style={{ margin: 0, fontSize: '0.875rem', overflow: 'auto' }}>
                      {schema}
                    </pre>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
            
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Supabase SQL 편집기에서 테이블 생성하기:
              </Typography>
              <Typography variant="body2">
                1. Supabase 대시보드에 로그인<br />
                2. 프로젝트 선택<br />
                3. 왼쪽 메뉴에서 'SQL 편집기' 클릭<br />
                4. '새 쿼리' 버튼 클릭<br />
                5. 위의 SQL 스크립트를 붙여넣고 실행
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </TabPanel>

      {/* 백업 & 복원 탭 */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  데이터베이스 백업
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  현재 데이터베이스의 모든 데이터를 JSON 파일로 백업합니다.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleBackupDownload}
                  disabled={loading || !connectionStatus.isConnected}
                  fullWidth
                >
                  백업 다운로드
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  데이터 복원
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  백업된 JSON 파일을 업로드하여 데이터를 복원합니다.
                </Typography>
                <input
                  accept=".json"
                  style={{ display: 'none' }}
                  id="backup-file-upload"
                  type="file"
                  onChange={handleFileUpload}
                />
                <label htmlFor="backup-file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    fullWidth
                  >
                    백업 파일 선택
                  </Button>
                </label>
                
                {backupData && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    백업 파일이 로드되었습니다. 복원 기능은 추후 구현 예정입니다.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* SQL 전체 보기 다이얼로그 */}
      <Dialog
        open={sqlDialogOpen}
        onClose={() => setSqlDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          전체 SQL 스크립트
        </DialogTitle>
        <DialogContent>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, maxHeight: 400, overflow: 'auto' }}>
            <pre style={{ margin: 0, fontSize: '0.875rem' }}>
              {Object.values(sqlSchemas).join('\n\n')}
            </pre>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSqlDialogOpen(false)}>
            닫기
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              navigator.clipboard.writeText(Object.values(sqlSchemas).join('\n\n'));
              setSnackbar({
                open: true,
                message: 'SQL 스크립트가 클립보드에 복사되었습니다.',
                severity: 'success'
              });
            }}
          >
            복사
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SupabaseSettingsPage;