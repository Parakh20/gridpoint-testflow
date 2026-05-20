import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';

type Kind = 'info' | 'success' | 'error' | 'warn';
type Toast = { id: number; kind: Kind; message: string };

type Ctx = {
  show: (message: string, kind?: Kind) => void;
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
  warn: (m: string) => void;
};

const ToastCtx = createContext<Ctx | undefined>(undefined);

const COLORS: Record<Kind, string> = {
  info: theme.primary,
  success: theme.success,
  error: theme.danger,
  warn: theme.warn,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const idRef = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setToast(null);
    });
  }, [fade]);

  const show = useCallback(
    (message: string, kind: Kind = 'info') => {
      idRef.current += 1;
      const t: Toast = { id: idRef.current, kind, message };
      setToast(t);
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(dismiss, kind === 'error' ? 4500 : 2800);
    },
    [fade, dismiss]
  );

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const api: Ctx = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    info: (m) => show(m, 'info'),
    warn: (m) => show(m, 'warn'),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            s.wrap,
            { top: insets.top + 8, opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] },
          ]}
        >
          <View style={[s.toast, { borderLeftColor: COLORS[toast.kind] }]}>
            <Text style={[s.kind, { color: COLORS[toast.kind] }]}>
              {toast.kind.toUpperCase()}
            </Text>
            <Text style={s.msg}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center', zIndex: 10000 },
  toast: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderLeftWidth: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    minWidth: '90%',
    maxWidth: '100%',
  },
  kind: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  msg: { color: theme.text, fontSize: 14, fontWeight: '500' },
});
