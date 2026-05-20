import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '@/theme';
import { captureException } from '@/lib/monitoring';

type State = { err: Error | null };

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    captureException(err, { componentStack: info.componentStack });
  }

  reset = () => this.setState({ err: null });

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <View style={s.root}>
        <View style={s.card}>
          <Text style={s.title}>Something broke</Text>
          <Text style={s.subtitle}>
            The app hit an unexpected error. Tap reload to try again, or sign out from the previous screen.
          </Text>
          <ScrollView style={s.trace}>
            <Text style={s.traceText} selectable>
              {this.state.err.message}
              {'\n\n'}
              {this.state.err.stack}
            </Text>
          </ScrollView>
          <TouchableOpacity style={s.btn} onPress={this.reset}>
            <Text style={s.btnText}>Reload</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, padding: theme.pad, justifyContent: 'center' },
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.danger,
    borderRadius: theme.radius,
    padding: theme.pad,
  },
  title: { color: theme.danger, fontSize: 18, fontWeight: '800' },
  subtitle: { color: theme.textDim, marginTop: 6, lineHeight: 20 },
  trace: { maxHeight: 200, marginTop: 14, backgroundColor: theme.bg, padding: 10, borderRadius: 6 },
  traceText: { color: theme.textDim, fontSize: 11, fontFamily: 'Menlo' as any },
  btn: {
    marginTop: 14,
    backgroundColor: theme.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: theme.primaryText, fontWeight: '700' },
});
