import { TrafficStore } from '../traffic/types';
import { exportSnapshot, ExportOptions } from './exporter';

export interface WatcherOptions extends ExportOptions {
  intervalMs?: number;
}

export interface ExportWatcher {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

export function createExportWatcher(
  store: TrafficStore,
  options: WatcherOptions
): ExportWatcher {
  const intervalMs = options.intervalMs ?? 30_000;
  let timer: ReturnType<typeof setInterval> | null = null;

  function runExport() {
    try {
      exportSnapshot(store, options);
    } catch (err) {
      console.error('[routewatch] Export failed:', err);
    }
  }

  return {
    start() {
      if (timer !== null) return;
      timer = setInterval(runExport, intervalMs);
      if (timer.unref) timer.unref();
    },
    stop() {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
      runExport();
    },
    isRunning() {
      return timer !== null;
    },
  };
}
