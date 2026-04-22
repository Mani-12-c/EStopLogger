import { useState, useEffect } from 'react';
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
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';

const DRAWER_WIDTH = 256;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon fontSize="small" /> },
  { label: 'Stations', path: '/stations', icon: <StationIcon fontSize="small" /> },
  {
    label: 'Events',
    path: '/events',
    icon: <EventIcon fontSize="small" />,
    roles: ['OPERATOR', 'SUPERVISOR'],
  },
  {
    label: 'Analytics',
    path: '/analytics',
    icon: <AnalyticsIcon fontSize="small" />,
    roles: ['SUPERVISOR', 'AUDITOR'],
  },
  {
    label: 'Audit Logs',
    path: '/audit',
    icon: <AuditIcon fontSize="small" />,
    roles: ['AUDITOR'],
  },
  {
    label: 'Datasets',
    path: '/datasets',
    icon: <DatasetIcon fontSize="small" />,
    roles: ['SUPERVISOR'],
  },
];

export default function AppLayout() {
  const theme = useTheme();
  const { mode, toggle } = useThemeMode();
  const isDark = mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Sync body class for CSS scrollbar variables
  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDark);
  }, [isDark]);

  const visibleNav = navItems.filter(
    (n) => !n.roles || n.roles.some((r) => hasRole(r as 'OPERATOR' | 'SUPERVISOR' | 'AUDITOR'))
  );

  const activePrimary = theme.palette.primary.main;
  const activeNavBg = isDark ? 'rgba(59,130,246,0.12)' : 'rgba(26,86,219,0.07)';
  const hoverBg     = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)';

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Logo ── */}
      <Box sx={{ px: 2.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <LogoIcon sx={{ color: theme.palette.error.main, fontSize: 26 }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
            E‑Stop
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.04em' }}>
            Safety Logger
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* ── Navigation ── */}
      <List sx={{ flex: 1, px: 1.5, pt: 1.5 }}>
        {visibleNav.map((item) => {
          const active = location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                px: 1.75,
                py: 1,
                bgcolor: active ? activeNavBg : 'transparent',
                borderLeft: active ? `3px solid ${activePrimary}` : '3px solid transparent',
                '&:hover': { bgcolor: active ? activeNavBg : hoverBg },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: active ? activePrimary : 'text.secondary',
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
                      color: active ? 'text.primary' : 'text.secondary',
                    },
                  },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* ── User card ── */}
      <Divider />
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            borderRadius: 1.5,
            bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Avatar
            sx={{
              width: 30,
              height: 30,
              bgcolor: activePrimary,
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {user?.fullName?.charAt(0) || 'U'}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }} noWrap>
              {user?.fullName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {user?.role}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* ── Sidebar ── */}
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
          sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
      )}

      {/* ── Main ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <AppBar position="sticky" elevation={0}>
          <Toolbar sx={{ gap: 1.5, minHeight: '56px !important' }}>
            {isMobile && (
              <IconButton size="small" color="inherit" onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
            )}

            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600, color: 'text.primary' }}>
              {visibleNav.find((n) => location.pathname.startsWith(n.path))?.label ?? 'E-Stop Logger'}
            </Typography>

            {/* Theme toggle */}
            <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton size="small" onClick={toggle} sx={{ color: 'text.secondary' }}>
                {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            {/* Account */}
            <Tooltip title="Account">
              <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: activePrimary,
                    fontSize: '0.8rem',
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
              slotProps={{ paper: { sx: { mt: 0.5, minWidth: 180 } } }}
            >
              <MenuItem disabled sx={{ fontSize: '0.8125rem' }}>
                <PersonIcon sx={{ mr: 1.5, fontSize: 16 }} /> {user?.username}
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => { setAnchorEl(null); logout(); navigate('/login'); }}
                sx={{ fontSize: '0.8125rem', color: 'error.main' }}
              >
                <LogoutIcon sx={{ mr: 1.5, fontSize: 16 }} /> Sign out
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

