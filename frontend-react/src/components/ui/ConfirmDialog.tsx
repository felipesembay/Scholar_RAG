import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

export type ConfirmDialogType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: ConfirmDialogType;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

const typeConfig = {
  danger: {
    icon: XCircle,
    iconColor: 'text-red-600',
    confirmBg: 'bg-red-600 hover:bg-red-700',
    borderColor: 'border-red-200'
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-600',
    confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
    borderColor: 'border-yellow-200'
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-600',
    confirmBg: 'bg-blue-600 hover:bg-blue-700',
    borderColor: 'border-blue-200'
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-600',
    confirmBg: 'bg-green-600 hover:bg-green-700',
    borderColor: 'border-green-200'
  }
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isLoading = false
}: ConfirmDialogProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  // Escape key handler
  const handleEscape = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && !isLoading) {
      onClose();
    }
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleOverlayClick}
          onKeyDown={handleEscape}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`
              bg-white rounded-xl shadow-2xl border-2 ${config.borderColor}
              max-w-md w-full mx-auto p-6
              focus:outline-none
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0">
                <Icon className={`size-6 ${config.iconColor}`} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h2 
                  id="confirm-dialog-title"
                  className=" font-bold text-ink text-lg mb-2"
                >
                  {title}
                </h2>
                <p 
                  id="confirm-dialog-description"
                  className=" text-muted-foreground text-sm leading-relaxed"
                  style={{ fontVariationSettings: "'wdth' 100" }}
                >
                  {message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className={`
                  px-4 py-2 rounded-lg border border-[var(--line)] 
                  bg-white text-[var(--muted-foreground)] font-['Open_Sans:Medium'] font-medium text-sm
                  hover:bg-gray-50 active:bg-gray-100
                  focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200
                `}
              >
                {cancelLabel}
              </button>
              
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`
                  px-4 py-2 rounded-lg text-white font-['Open_Sans:Medium'] font-medium text-sm
                  ${config.confirmBg}
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200
                  min-w-[100px] flex items-center justify-center gap-2
                `}
              >
                {isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook para usar o ConfirmDialog
export function useConfirmDialog() {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: ConfirmDialogType;
    onConfirm: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {}
  });

  const showConfirm = (config: Omit<typeof dialog, 'isOpen'>) => {
    setDialog({ ...config, isOpen: true });
  };

  const hideConfirm = () => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  const confirmDelete = (itemName: string, onConfirm: () => void) => {
    showConfirm({
      type: 'danger',
      title: 'Confirmar Exclusão',
      message: `Tem certeza de que deseja excluir "${itemName}"? Esta ação não pode ser desfeita.`,
      onConfirm,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar'
    });
  };

  return {
    dialog,
    showConfirm,
    hideConfirm,
    confirmDelete,
    ConfirmDialog: (props: Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm' | 'title' | 'message' | 'type'>) => (
      <ConfirmDialog
        {...props}
        isOpen={dialog.isOpen}
        onClose={hideConfirm}
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        confirmLabel={dialog.confirmLabel}
        cancelLabel={dialog.cancelLabel}
      />
    )
  };
}