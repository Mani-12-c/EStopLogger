import { useSnackbar } from 'notistack';
import { useCallback } from 'react';

export function useToast() {
  const { enqueueSnackbar } = useSnackbar();

  const success = useCallback(
    (msg: string) => enqueueSnackbar(msg, { variant: 'success' }),
    [enqueueSnackbar]
  );

  const error = useCallback(
    (msg: string) => enqueueSnackbar(msg, { variant: 'error' }),
    [enqueueSnackbar]
  );

  const info = useCallback(
    (msg: string) => enqueueSnackbar(msg, { variant: 'info' }),
    [enqueueSnackbar]
  );

  const warn = useCallback(
    (msg: string) => enqueueSnackbar(msg, { variant: 'warning' }),
    [enqueueSnackbar]
  );

  return { success, error, info, warn };
}
