import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  LocationOn as StationIcon,
  Warning as EventIcon,
  Analytics as AnalyticsIcon,
  Assignment as AuditIcon,
  CloudUpload as DatasetIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  RadioButtonChecked as LogoIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const DRAWER_WIDTH = 260;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Stations', path: '/stations', icon: <StationIcon /> },
  { label: 'Events', path: '/events', icon: <EventIcon /> },
  {
    label: 'Analytics',
    path: '/analytics',
    icon: <AnalyticsIcon />,
    roles: ['SUPERVISOR'],
  },
  {
    label: 'Audit Logs',
    path: '/audit',
    icon: <AuditIcon />,
    roles: ['AUDITOR'],
  },
  {
    label: 'Datasets',
    path: '/datasets',
    icon: <DatasetIcon />,
    roles: ['SUPERVISOR'],
  },
];

export default function AppLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const visibleNav = navItems.filter(
    (n) => !n.roles || n.roles.some((r) => hasRole(r as 'OPERATOR' | 'SUPERVISOR' | 'AUDITOR'))
  );

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          px: 2.5,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <LogoIcon sx={{ color: '#EF4444', fontSize: 28 }} />
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
          E-STOP
        </Typography>
      </Box>

      <Divider sx={{ mx: 2 }} />

      {/* Nav */}
      <List sx={{ flex: 1, px: 1.5, pt: 2 }}>
        {visibleNav.map((item) => {
          const active = location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                px: 2,
                py: 1.2,
                bgcolor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: active ? '#FFF' : '#666',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    sx: {
                      fontSize: '0.875rem',
                      fontWeight: active ? 600 : 400,
                      color: active ? '#FFF' : '#999',
                    },
                  },
                }}
              />
              {active && (
                <Box
                  sx={{
                    width: 4,
                    height: 20,
                    borderRadius: 2,
                    bgcolor: '#FFF',
                  }}
                />
              )}
            </ListItemButton>
          );
        })}
      </List>

      {/* User card */}
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#FFF' }}>
            {user?.fullName}
          </Typography>
          <Typography variant="caption" sx={{ color: '#666' }}>
            {user?.role}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* Main area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <AppBar position="sticky" elevation={0}>
          <Toolbar sx={{ gap: 2 }}>
            {isMobile && (
              <IconButton color="inherit" onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
            )}

            <Typography
              variant="h6"
              sx={{ flex: 1, fontWeight: 600, fontSize: '1rem' }}
            >
              {visibleNav.find((n) => location.pathname.startsWith(n.path))
                ?.label || 'E-Stop Logger'}
            </Typography>

            <Tooltip title="Account">
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: '#FFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  {user?.fullName?.charAt(0) || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={!!anchorEl}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem disabled>
                <PersonIcon sx={{ mr: 1 }} /> {user?.username}
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  logout();
                  navigate('/login');
                }}
              >
                <LogoutIcon sx={{ mr: 1 }} /> Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, md: 3 },
            maxWidth: 1440,
            width: '100%',
            mx: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
