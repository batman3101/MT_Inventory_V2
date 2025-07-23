import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  IconButton,
  Tooltip,
  Chip,
  Switch,
  FormControlLabel,
  TablePagination,
  Paper,
  Divider,
  Avatar,
  Badge
} from '@mui/material';
import {
  Person as PersonIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as SupervisorIcon,
  AccountCircle as UserIcon,
  CheckCircle as ActiveIcon,
  Block as InactiveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Group as GroupIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { supabase } from '../utils/supabase';
import bcrypt from 'bcryptjs';

interface Department {
  department_id: string;
  department_name: string;
  description?: string;
  status: 'active' | 'inactive';
}

interface User {
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  password_hash: string;
  department_id: string;
  role: 'user' | 'admin' | 'system_admin';
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  department?: Department;
}

interface UserWithDepartment extends User {
  department: Department;
}

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserWithDepartment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithDepartment | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // 사용자 추가/수정 다이얼로그 상태
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 삭제 확인 다이얼로그 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithDepartment | null>(null);

  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          departments(
            department_id,
            department_name,
            description,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const usersWithDepartment = data?.map(user => ({
        ...user,
        department: user.departments
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

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('status', 'active')
        .order('department_name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('부서 목록 로드 실패:', error);
    }
  };

  const handleAddUser = () => {
    setEditingUser({
      username: '',
      full_name: '',
      email: '',
      password_hash: '',
      department_id: '',
      role: 'user',
      is_active: true
    });
    setConfirmPassword('');
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: UserWithDepartment) => {
    setEditingUser({
      ...user,
      password_hash: '' // 비밀번호는 수정 시 새로 입력받음
    });
    setConfirmPassword('');
    setUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    // 유효성 검사
    if (!editingUser.username || !editingUser.full_name || !editingUser.email || !editingUser.department_id) {
      setSnackbar({
        open: true,
        message: '모든 필수 항목을 입력해주세요.',
        severity: 'error'
      });
      return;
    }
    
    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editingUser.email)) {
      setSnackbar({
        open: true,
        message: '올바른 이메일 형식을 입력해주세요.',
        severity: 'error'
      });
      return;
    }
    
    // 새 사용자이거나 비밀번호를 변경하는 경우
    if (!editingUser.user_id || editingUser.password_hash) {
      if (!editingUser.password_hash) {
        setSnackbar({
          open: true,
          message: '비밀번호를 입력해주세요.',
          severity: 'error'
        });
        return;
      }
      
      if (editingUser.password_hash !== confirmPassword) {
        setSnackbar({
          open: true,
          message: '비밀번호가 일치하지 않습니다.',
          severity: 'error'
        });
        return;
      }
      
      if (editingUser.password_hash.length < 6) {
        setSnackbar({
          open: true,
          message: '비밀번호는 최소 6자 이상이어야 합니다.',
          severity: 'error'
        });
        return;
      }
    }

    try {
      setLoading(true);
      
      let userData: any = {
        username: editingUser.username,
        full_name: editingUser.full_name,
        email: editingUser.email,
        department_id: editingUser.department_id,
        role: editingUser.role,
        is_active: editingUser.is_active,
        updated_at: new Date().toISOString()
      };
      
      // 비밀번호가 입력된 경우 해시화
      if (editingUser.password_hash) {
        const saltRounds = 10;
        userData.password_hash = await bcrypt.hash(editingUser.password_hash, saltRounds);
      }
      
      if (editingUser.user_id) {
        // 기존 사용자 수정
        const { error } = await supabase
          .from('users')
          .update(userData)
          .eq('user_id', editingUser.user_id);
          
        if (error) throw error;
        
        setSnackbar({
          open: true,
          message: '사용자 정보가 수정되었습니다.',
          severity: 'success'
        });
      } else {
        // 새 사용자 추가
        userData.created_at = new Date().toISOString();
        
        // 사용자명 중복 확인
        const { data: existingUser } = await supabase
          .from('users')
          .select('user_id')
          .eq('username', editingUser.username)
          .single();
          
        if (existingUser) {
          setSnackbar({
            open: true,
            message: '이미 존재하는 사용자명입니다.',
            severity: 'error'
          });
          return;
        }
        
        const { error } = await supabase
          .from('users')
          .insert(userData);
          
        if (error) throw error;
        
        setSnackbar({
          open: true,
          message: '새 사용자가 추가되었습니다.',
          severity: 'success'
        });
      }
      
      setUserDialogOpen(false);
      setEditingUser(null);
      setConfirmPassword('');
      await loadUsers();
    } catch (error) {
      console.error('사용자 저장 실패:', error);
      setSnackbar({
        open: true,
        message: '사용자 저장에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', userToDelete.user_id);
        
      if (error) throw error;
      
      setSnackbar({
        open: true,
        message: '사용자가 삭제되었습니다.',
        severity: 'success'
      });
      
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      await loadUsers();
    } catch (error) {
      console.error('사용자 삭제 실패:', error);
      setSnackbar({
        open: true,
        message: '사용자 삭제에 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'system_admin':
        return <SecurityIcon color="error" />;
      case 'admin':
        return <AdminIcon color="warning" />;
      default:
        return <UserIcon color="primary" />;
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'system_admin':
        return 'error';
      case 'admin':
        return 'warning';
      default:
        return 'primary';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department?.department_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesDepartment = departmentFilter === 'all' || user.department_id === departmentFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.is_active) ||
                         (statusFilter === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
  });

  const paginatedUsers = filteredUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const userSummary = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    systemAdmins: users.filter(u => u.role === 'system_admin').length,
    admins: users.filter(u => u.role === 'admin').length,
    regularUsers: users.filter(u => u.role === 'user').length
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <GroupIcon />
        사용자 관리
      </Typography>

      {/* 사용자 현황 요약 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                {userSummary.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                총 사용자
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="success.main">
                {userSummary.active}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                활성 사용자
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="error.main">
                {userSummary.inactive}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                비활성 사용자
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="error">
                {userSummary.systemAdmins}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                시스템 관리자
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="warning.main">
                {userSummary.admins}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                관리자
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                {userSummary.regularUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                일반 사용자
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              사용자 목록
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={loadUsers}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
              >
                새로고침
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleAddUser}
                startIcon={<AddIcon />}
              >
                사용자 추가
              </Button>
            </Box>
          </Box>
          
          {/* 필터 */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="사용자명, 이름, 이메일로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={2.25}>
              <FormControl fullWidth size="small">
                <InputLabel>역할</InputLabel>
                <Select
                  value={roleFilter}
                  label="역할"
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="system_admin">시스템 관리자</MenuItem>
                  <MenuItem value="admin">관리자</MenuItem>
                  <MenuItem value="user">일반 사용자</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2.25}>
              <FormControl fullWidth size="small">
                <InputLabel>부서</InputLabel>
                <Select
                  value={departmentFilter}
                  label="부서"
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <MenuItem value="all">전체</MenuItem>
                  {departments.map(department => (
                    <MenuItem key={department.department_id} value={department.department_id}>
                      {department.department_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2.25}>
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
            <Grid item xs={12} md={2.25}>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('all');
                  setDepartmentFilter('all');
                  setStatusFilter('all');
                }}
              >
                필터 초기화
              </Button>
            </Grid>
          </Grid>
          
          {/* 사용자 테이블 */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>사용자 정보</TableCell>
                  <TableCell>부서</TableCell>
                  <TableCell>역할</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>최종 로그인</TableCell>
                  <TableCell>등록일</TableCell>
                  <TableCell>작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.user_id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {user.full_name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {user.full_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            @{user.username}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {user.email}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {user.department?.department_name || '미지정'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getRoleIcon(user.role)}
                        <Chip
                          label={getRoleLabel(user.role)}
                          size="small"
                          color={getRoleColor(user.role) as any}
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {user.is_active ? (
                          <ActiveIcon color="success" />
                        ) : (
                          <InactiveIcon color="error" />
                        )}
                        <Chip
                          label={user.is_active ? '활성' : '비활성'}
                          size="small"
                          color={user.is_active ? 'success' : 'error'}
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.last_login ? 
                          new Date(user.last_login).toLocaleDateString() : '없음'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(user.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="수정">
                          <IconButton
                            size="small"
                            onClick={() => handleEditUser(user)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setUserToDelete(user);
                              setDeleteDialogOpen(true);
                            }}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={filteredUsers.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="페이지당 행 수:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          />
        </CardContent>
      </Card>

      {/* 사용자 추가/수정 다이얼로그 */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingUser?.user_id ? '사용자 수정' : '새 사용자 추가'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="사용자명 *"
                value={editingUser?.username || ''}
                onChange={(e) => setEditingUser(prev => ({ ...prev!, username: e.target.value }))}
                disabled={!!editingUser?.user_id} // 수정 시에는 사용자명 변경 불가
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="이름 *"
                value={editingUser?.full_name || ''}
                onChange={(e) => setEditingUser(prev => ({ ...prev!, full_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="이메일 *"
                type="email"
                value={editingUser?.email || ''}
                onChange={(e) => setEditingUser(prev => ({ ...prev!, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>부서 *</InputLabel>
                <Select
                  value={editingUser?.department_id || ''}
                  label="부서 *"
                  onChange={(e) => setEditingUser(prev => ({ ...prev!, department_id: e.target.value }))}
                >
                  {departments.map(department => (
                    <MenuItem key={department.department_id} value={department.department_id}>
                      {department.department_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>역할 *</InputLabel>
                <Select
                  value={editingUser?.role || 'user'}
                  label="역할 *"
                  onChange={(e) => setEditingUser(prev => ({ ...prev!, role: e.target.value as any }))}
                >
                  <MenuItem value="user">일반 사용자</MenuItem>
                  <MenuItem value="admin">관리자</MenuItem>
                  <MenuItem value="system_admin">시스템 관리자</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editingUser?.is_active || false}
                    onChange={(e) => setEditingUser(prev => ({ ...prev!, is_active: e.target.checked }))}
                  />
                }
                label="계정 활성화"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={editingUser?.user_id ? '새 비밀번호 (변경 시에만 입력)' : '비밀번호 *'}
                type={showPassword ? 'text' : 'password'}
                value={editingUser?.password_hash || ''}
                onChange={(e) => setEditingUser(prev => ({ ...prev!, password_hash: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={editingUser?.user_id ? '새 비밀번호 확인' : '비밀번호 확인 *'}
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>
            취소
          </Button>
          <Button variant="contained" onClick={handleSaveUser} disabled={loading}>
            {editingUser?.user_id ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>
          사용자 삭제 확인
        </DialogTitle>
        <DialogContent>
          <Typography>
            '{userToDelete?.full_name}' 사용자를 정말 삭제하시겠습니까?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            취소
          </Button>
          <Button variant="contained" color="error" onClick={handleDeleteUser} disabled={loading}>
            삭제
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

export default UserManagementPage;