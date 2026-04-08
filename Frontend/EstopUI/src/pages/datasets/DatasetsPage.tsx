import { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  MenuItem,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  PlayArrow as SimulateIcon,
} from '@mui/icons-material';
import { datasetService } from '../../services/datasetService';
import { useToast } from '../../hooks/useToast';
import type { DatasetStatusDTO } from '../../types';

const DATASET_TYPES = [
  { value: 'factories', label: 'Factories', order: 1 },
  { value: 'stations', label: 'Stations', order: 2 },
  { value: 'users', label: 'Users', order: 3 },
  { value: 'scheduled_work', label: 'Scheduled Work', order: 4 },
  { value: 'estop_events', label: 'E-Stop Events', order: 5 },
  { value: 'acknowledgements', label: 'Acknowledgements', order: 6 },
];

export default function DatasetsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [type, setType] = useState('factories');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<DatasetStatusDTO | null>(null);
  const [error, setError] = useState('');

  // Simulation
  const [simCount, setSimCount] = useState(10);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<number | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const res = await datasetService.upload(file, type);
      setResult(res.data.data);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      const d = res.data.data;
      if (d.failedRows === 0) {
        toast.success(`Uploaded ${d.successRows} rows successfully`);
      } else {
        toast.warn(`${d.successRows} rows uploaded, ${d.failedRows} failed`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const res = await datasetService.simulate(simCount);
      setSimResult(res.data.data);
      toast.success(`Generated ${res.data.data} events successfully`);
    } catch {
      setSimResult(null);
      toast.error('Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Datasets
      </Typography>
      <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
        Upload CSV datasets or simulate events for testing
      </Typography>

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                CSV Upload
              </Typography>

              <TextField
                fullWidth
                select
                label="Dataset Type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                sx={{ mb: 2 }}
              >
                {DATASET_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.order}. {t.label}
                  </MenuItem>
                ))}
              </TextField>

              <Box
                sx={{
                  border: '2px dashed rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  mb: 2,
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.25)',
                    bgcolor: 'rgba(255,255,255,0.02)',
                  },
                }}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <UploadIcon sx={{ fontSize: 40, color: '#666', mb: 1 }} />
                <Typography variant="body2" sx={{ color: '#888' }}>
                  {file ? file.name : 'Click to select a CSV file'}
                </Typography>
                {file && (
                  <Typography variant="caption" sx={{ color: '#555' }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </Typography>
                )}
              </Box>

              {uploading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

              <Button
                fullWidth
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                {uploading ? 'Uploading…' : 'Upload Dataset'}
              </Button>

              {error && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              {result && (
                <Box sx={{ mt: 2 }}>
                  <Alert
                    severity={
                      result.failedRows === 0 ? 'success' : 'warning'
                    }
                    sx={{ borderRadius: 2, mb: 1 }}
                  >
                    {result.message}
                  </Alert>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      mt: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#22C55E' }}>
                      ✓ {result.successRows} success
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#EF4444' }}>
                      ✗ {result.failedRows} failed
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#888' }}>
                      {result.totalRows} total
                    </Typography>
                  </Box>
                  {result.errors && result.errors.length > 0 && (
                    <Box
                      sx={{
                        mt: 1,
                        maxHeight: 150,
                        overflowY: 'auto',
                        bgcolor: 'rgba(239,68,68,0.05)',
                        borderRadius: 1,
                        p: 1,
                      }}
                    >
                      {result.errors.map((err, i) => (
                        <Typography
                          key={i}
                          variant="caption"
                          sx={{
                            display: 'block',
                            color: '#EF4444',
                            fontFamily: 'monospace',
                          }}
                        >
                          {err}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column */}
        <Grid size={{ xs: 12, md: 5 }}>
          {/* Simulation */}
          <Card sx={{ mb: 2.5 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Event Simulation
              </Typography>
              <Typography variant="body2" sx={{ color: '#888', mb: 2 }}>
                Auto-generate random E-Stop events for testing
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Number of events"
                value={simCount}
                onChange={(e) => setSimCount(parseInt(e.target.value) || 1)}
                sx={{ mb: 2 }}
                slotProps={{ htmlInput: { min: 1, max: 100 } }}
              />
              <Button
                fullWidth
                variant="outlined"
                startIcon={<SimulateIcon />}
                onClick={handleSimulate}
                disabled={simulating}
                sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#FFF' }}
              >
                {simulating ? 'Generating…' : 'Generate Events'}
              </Button>
              {simResult !== null && (
                <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                  Successfully generated {simResult} events
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Upload Order Guide */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Upload Order
              </Typography>
              <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>
                Upload in this order (foreign key dependencies):
              </Typography>
              <List dense disablePadding>
                {DATASET_TYPES.map((t) => (
                  <ListItem key={t.value} sx={{ px: 0, py: 0.3 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          <span style={{ color: '#666', marginRight: 8 }}>
                            {t.order}.
                          </span>
                          {t.label}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
