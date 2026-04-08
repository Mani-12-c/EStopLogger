import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  Grid,
  IconButton,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import PageLoader from '../../components/common/PageLoader';
import { auditService } from '../../services/auditService';
import type { AuditLogDTO, Page } from '../../types';
import dayjs from 'dayjs';

export default function AuditPage() {
  const [data, setData] = useState<Page<AuditLogDTO> | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditService.getLogs({
        page,
        size,
        action: actionFilter || undefined,
        from: fromDate ? dayjs(fromDate).toISOString() : undefined,
        to: toDate ? dayjs(toDate).toISOString() : undefined,
      });
      setData(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [page, size, actionFilter, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    const from = fromDate
      ? dayjs(fromDate).toISOString()
      : dayjs().subtract(30, 'day').toISOString();
    const to = toDate ? dayjs(toDate).toISOString() : dayjs().toISOString();
    try {
      const res = await auditService.exportCsv(from, to);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      // silently fail
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4">Audit Logs</Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Immutable trail of all system actions
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={load} sx={{ color: '#888' }}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#FFF' }}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            fullWidth
            label="Action"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
            placeholder="e.g. EVENT_CREATED"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            fullWidth
            type="date"
            label="From"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(0);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            fullWidth
            type="date"
            label="To"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(0);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
      </Grid>

      {loading && !data ? (
        <PageLoader />
      ) : (
        <Card>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Performed By</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.content.map((log) => (
                  <TableRow key={log.auditId} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      #{log.auditId}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: '#FFF',
                          fontSize: '0.8rem',
                        }}
                      >
                        {log.action}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#AAA' }}>
                      {log.eventId ? `#${log.eventId}` : '—'}
                    </TableCell>
                    <TableCell sx={{ color: '#AAA' }}>
                      {log.performedByName || `User #${log.performedBy}`}
                    </TableCell>
                    <TableCell sx={{ color: '#888', whiteSpace: 'nowrap' }}>
                      {dayjs(log.timestamp).format('MMM DD, HH:mm:ss')}
                    </TableCell>
                    <TableCell
                      sx={{
                        color: '#888',
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {log.details}
                    </TableCell>
                  </TableRow>
                ))}
                {data?.content.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      sx={{ textAlign: 'center', py: 6, color: '#666' }}
                    >
                      No audit logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data?.totalElements ?? 0}
            page={page}
            rowsPerPage={size}
            rowsPerPageOptions={[10, 15, 25, 50]}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setSize(parseInt(e.target.value));
              setPage(0);
            }}
            sx={{ color: '#888' }}
          />
        </Card>
      )}
    </Box>
  );
}
