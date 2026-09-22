import { Button, Snackbar } from '@mui/material';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { TOAST_DURATION_MS } from '../../data';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  action?: ToastAction;
}

type ShowToast = (message: string, action?: ToastAction) => void;

const ToastContext = createContext<ShowToast>(() => undefined);

let nextId = 1;

// Shows one toast at a time; newer toasts replace the current one so undo always targets the latest action.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);

  // useCallback: provided through context and used as a hook dependency by consumers.
  const show = useCallback<ShowToast>((message, action) => {
    setToast({ id: nextId++, message, action });
  }, []);

  const close = () => setToast(null);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Snackbar
        key={toast?.id}
        open={toast !== null}
        onClose={(_event, reason) => reason !== 'clickaway' && close()}
        autoHideDuration={TOAST_DURATION_MS}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={toast?.message}
        action={
          toast?.action ? (
            <Button
              variant="text"
              size="small"
              sx={{ color: 'primary.main', '&:hover': { color: 'primary.main' } }}
              onClick={() => {
                toast.action?.onClick();
                close();
              }}
            >
              {toast.action.label}
            </Button>
          ) : null
        }
      />
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
