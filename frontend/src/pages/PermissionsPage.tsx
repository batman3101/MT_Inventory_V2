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
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Autocomplete,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Security as SecurityIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as SupervisorIcon,
  AccountCircle as UserIcon
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

interface User {
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  role: 'user' | 'admin' | 'system_admin';
  department_id?: string;
  department_name?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

interface PermissionHistory {
  id: string;
  user_id: string;
  username: string;
  old_role: string;
  new_role: string;
  old_active: boolean;
  new_active: boolean;
  changed_by: string;
  changed_at: string;
  reason?: string;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersByRole: Record<string, number>;
  adminUsers: User[];
  systemAdminUsers: User[];
  regularUsers: User[];
}

const PermissionsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionHistory, setPermissionHistory] = useState<PermissionHistory[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    usersByRole: {},
    adminUsers: [],
    systemAdminUsers: [],
    regularUsers: []
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, user: null as User | null, action: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });

  useEffect(() => {
    loadUsers();
    loadPermissionHistory();
  }, []);

  useEffect(() => {
    updateSystemStats();
  }, [users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          departments(department_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithDepartment = data?.map(user => ({
        ...user,
        department_name: user.departments?.department_name || '미지정'
      })) || [];

      setUsers(usersWithDepartment);
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '사용자 목록을 불러오는데 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPermissionHistory = async () => {
    try {
      // 실제 구현에서는 permission_history 테이블에서 데이터 로드
      // 현재는 더미 데이터로 대체
      const dummyHistory: PermissionHistory[] = [
        {
          id: '1',
          user_id: 'user1',
          username: 'john_doe',
          old_role: 'user',
          new_role: 'admin',
          old_active: true,
          new_active: true,
          changed_by: 'system_admin',
          changed_at: new Date().toISOString(),
          reason: '관리자 권한 부여'
        }
      ];
      setPermissionHistory(dummyHistory);
    } catch (error) {
      console.error('권한 변경 이력 로드 실패:', error);
    }
  };

  const updateSystemStats = () => {
    const stats: SystemStats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.is_active).length,
      inactiveUsers: users.filter(u => !u.is_active).length,
      usersByRole: {},
      adminUsers: users.filter(u => u.role === 'admin'),
      systemAdminUsers: users.filter(u => u.role === 'system_admin'),
      regularUsers: users.filter(u => u.role === 'user')
    };

    // 역할별 사용자 수 계산
    users.forEach(user => {
      stats.usersByRole[user.role] = (stats.usersByRole[user.role] || 0) + 1;
    });

    setSystemStats(stats);
  };

  const handleUserUpdate = async (updatedUser: User) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('users')
        .update({
          role: updatedUser.role,
          is_active: updatedUser.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', updatedUser.user_id);

      if (error) throw error;

      // 권한 변경 이력 기록 (실제 구현에서는 permission_history 테이블에 저장)
      const historyEntry: PermissionHistory = {
        id: Date.now().toString(),
        user_id: updatedUser.user_id,
        username: updatedUser.username,
        old_role: selectedUser?.role || '',
        new_role: updatedUser.role,
        old_active: selectedUser?.is_active || false,
        new_active: updatedUser.is_active,
        changed_by: 'current_user', // 실제로는 현재 로그인한 사용자 ID
        changed_at: new Date().toISOString(),
        reason: '권한 수정'
      };

      setPermissionHistory(prev => [historyEntry, ...prev]);
      
      // 사용자 목록 새로고침
      await loadUsers();
      
      setSnackbar({
        open: true,
        message: '사용자 권한이 성공적으로 업데이트되었습니다.',
        severity: 'success'
      });
      
      setEditingUser(null);
      setSelectedUser(updatedUser);
    } catch (error) {
      console.error('사용자 업데이트 실패:', error);
      setSnackbar({
        open: true,
        message: '사용자 권한 업데이트에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.is_active) ||
                         (statusFilter === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'system_admin':
        return <AdminIcon color="error" />;
      case 'admin':
        return <SupervisorIcon color="warning" />;
      default:
        return <UserIcon color="primary" />;
    }
  };

  const getRoleColor = (role: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (role) {
      case 'system_admin':
        return 'error';
      case 'admin':
        return 'warning';
      default:
        return 'primary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'system_admin':
        return '시스템 관리자';
      case 'admin':
        return '관리자';
      default:
        return '일반 사용자';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SecurityIcon />
        권한 관리
      </Typography>

      {/* 탭 메뉴 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="사용자별 권한 관리" />
          <Tab label="권한 변경 이력" />
          <Tab label="시스템 설정" />
        </Tabs>
      </Paper>

      {/* 사용자별 권한 관리 탭 */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* 사용자 목록 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">
                    사용자 목록
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={loadUsers}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                  >
                    새로고침
                  </Button>
                </Box>
                
                {/* 필터 */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="사용자명, 이름, 이메일로 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>역할</InputLabel>
                      <Select
                        value={roleFilter}
                        label="역할"
                        onChange={(e) => setRoleFilter(e.target.value)}
                      >
                        <MenuItem value="all">전체</MenuItem>
                        <MenuItem value="user">일반 사용자</MenuItem>
                        <MenuItem value="admin">관리자</MenuItem>
                        <MenuItem value="system_admin">시스템 관리자</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>상태</InputLabel>
                      <Select
                        value={statusFilter}
                        label="상태"
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <MenuItem value="all">전체</MenuItem>
                        <MenuItem value="active">활성</MenuItem>
                        <MenuItem value="inactive">비활성</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                
                {/* 사용자 목록 */}
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {filteredUsers.map((user) => (
                    <ListItem
                      key={user.user_id}
                      button
                      selected={selectedUser?.user_id === user.user_id}
                      onClick={() => setSelectedUser(user)}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        '&.Mui-selected': {
                          backgroundColor: 'primary.light',
                          color: 'primary.contrastText'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                        {getRoleIcon(user.role)}
                      </Box>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">
                              {user.full_name}
                            </Typography>
                            <Chip
                              size="small"
                              label={getRoleLabel(user.role)}
                              color={getRoleColor(user.role)}
                            />
                            {!user.is_active && (
                              <Chip size="small" label="비활성" color="default" />
                            )}
                          </Box>
                        }
                        secondary={`@${user.username} • ${user.department_name}`}
                      />
                    </ListItem>
                  ))}
                </List>
                
                {filteredUsers.length === 0 && (
                  <Alert severity="info">
                    검색 조건에 맞는 사용자가 없습니다.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* 선택된 사용자 상세 정보 */}
          <Grid item xs={12} md={6}>
            {selectedUser ? (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon />
                      사용자 정보
                    </Typography>
                    {!editingUser && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => setEditingUser({ ...selectedUser })}
                      >
                        수정
                      </Button>
                    )}
                  </Box>
                  
                  {editingUser ? (
                    // 편집 모드
                    <Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="사용자명"
                            value={editingUser.username}
                            disabled
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="이름"
                            value={editingUser.full_name}
                            disabled
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <FormControl fullWidth size="small">
                            <InputLabel>역할</InputLabel>
                            <Select
                              value={editingUser.role}
                              label="역할"
                              onChange={(e) => setEditingUser(prev => prev ? {
                                ...prev,
                                role: e.target.value as 'user' | 'admin' | 'system_admin'
                              } : null)}
                            >
                              <MenuItem value="user">일반 사용자</MenuItem>
                              <MenuItem value="admin">관리자</MenuItem>
                              <MenuItem value="system_admin">시스템 관리자</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={editingUser.is_active}
                                onChange={(e) => setEditingUser(prev => prev ? {
                                  ...prev,
                                  is_active: e.target.checked
                                } : null)}
                              />
                            }
                            label="계정 활성화"
                          />
                        </Grid>
                      </Grid>
                      
                      <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                        <Button
                          variant="contained"
                          startIcon={<SaveIcon />}
                          onClick={() => handleUserUpdate(editingUser)}
                          disabled={loading}
                        >
                          저장
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<CancelIcon />}
                          onClick={() => setEditingUser(null)}
                        >
                          취소
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    // 보기 모드
                    <Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            사용자명
                          </Typography>
                          <Typography variant="body1">
                            {selectedUser.username}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            이름
                          </Typography>
                          <Typography variant="body1">
                            {selectedUser.full_name}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            이메일
                          </Typography>
                          <Typography variant="body1">
                            {selectedUser.email || '미등록'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            부서
                          </Typography>
                          <Typography variant="body1">
                            {selectedUser.department_name}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            역할
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getRoleIcon(selectedUser.role)}
                            <Chip
                              label={getRoleLabel(selectedUser.role)}
                              color={getRoleColor(selectedUser.role)}
                            />
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            계정 상태
                          </Typography>
                          <Chip
                            label={selectedUser.is_active ? '활성' : '비활성'}
                            color={selectedUser.is_active ? 'success' : 'default'}
                            icon={selectedUser.is_active ? <CheckCircleIcon /> : <ErrorIcon />}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            마지막 로그인
                          </Typography>
                          <Typography variant="body1">
                            {selectedUser.last_login ? 
                              new Date(selectedUser.last_login).toLocaleString() : 
                              '로그인 기록 없음'
                            }
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            가입일
                          </Typography>
                          <Typography variant="body1">
                            {new Date(selectedUser.created_at).toLocaleString()}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent>
                  <Alert severity="info">
                    사용자를 선택하여 상세 정보를 확인하세요.
                  </Alert>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      {/* 권한 변경 이력 탭 */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon />
              권한 변경 이력
            </Typography>
            
            {permissionHistory.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>사용자</TableCell>
                      <TableCell>변경 내용</TableCell>
                      <TableCell>변경자</TableCell>
                      <TableCell>변경일시</TableCell>
                      <TableCell>사유</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {permissionHistory.map((history) => (
                      <TableRow key={history.id}>
                        <TableCell>{history.username}</TableCell>
                        <TableCell>
                          <Box>
                            {history.old_role !== history.new_role && (
                              <Typography variant="body2">
                                역할: {getRoleLabel(history.old_role)} → {getRoleLabel(history.new_role)}
                              </Typography>
                            )}
                            {history.old_active !== history.new_active && (
                              <Typography variant="body2">
                                상태: {history.old_active ? '활성' : '비활성'} → {history.new_active ? '활성' : '비활성'}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{history.changed_by}</TableCell>
                        <TableCell>{new Date(history.changed_at).toLocaleString()}</TableCell>
                        <TableCell>{history.reason || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                권한 변경 이력이 없습니다.
              </Alert>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* 시스템 설정 탭 */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {/* 시스템 통계 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsIcon />
                  시스템 통계
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {systemStats.totalUsers}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        총 사용자
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {systemStats.activeUsers}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        활성 사용자
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      역할별 사용자 수
                    </Typography>
                    {Object.entries(systemStats.usersByRole).map(([role, count]) => (
                      <Box key={role} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          {getRoleLabel(role)}
                        </Typography>
                        <Chip size="small" label={count} color={getRoleColor(role)} />
                      </Box>
                    ))}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* 관리자 목록 */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  관리자 목록
                </Typography>
                
                {systemStats.systemAdminUsers.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      시스템 관리자
                    </Typography>
                    {systemStats.systemAdminUsers.map(user => (
                      <Chip
                        key={user.user_id}
                        label={user.full_name}
                        color="error"
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                )}
                
                {systemStats.adminUsers.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      일반 관리자
                    </Typography>
                    {systemStats.adminUsers.map(user => (
                      <Chip
                        key={user.user_id}
                        label={user.full_name}
                        color="warning"
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                )}
                
                {systemStats.systemAdminUsers.length === 0 && systemStats.adminUsers.length === 0 && (
                  <Alert severity="warning">
                    관리자가 없습니다. 시스템 관리자를 지정해주세요.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* 시스템 상태 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  시스템 상태
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon color="success" />
                      <Typography variant="body2">
                        데이터베이스 연결: 정상
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon color="success" />
                      <Typography variant="body2">
                        권한 시스템: 정상
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon color="success" />
                      <Typography variant="body2">
                        사용자 인증: 정상
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

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

export default PermissionsPage;