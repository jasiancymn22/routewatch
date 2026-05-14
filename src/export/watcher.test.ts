import { createExportWatcher } from './watcher';
import { createTrafficStore, recordRequest } from '../traffic/recorder';
import * as exporter from './exporter';

function makeMockStore() {
  const store = createTrafficStore();
  recordRequest(store, {
    method: 'GET',
    path: '/ping',
    query: {},
    requestBody: null,
    responseBody: { ok: true },
    statusCode: 200,
  });
  return store;
}

describe('createExportWatcher', () => {
  let exportSpy: jest.SpyInstance;

  beforeEach(() => {
    exportSpy = jest.spyOn(exporter, 'exportSnapshot').mockImplementation(() => {});
    jest.useFakeTimers();
  });

  afterEach(() => {
    exportSpy.mockRestore();
    jest.useRealTimers();
  });

  it('is not running before start is called', () => {
    const store = makeMockStore();
    const watcher = createExportWatcher(store, {
      format: 'json',
      outputPath: 'out.json',
      intervalMs: 5000,
    });
    expect(watcher.isRunning()).toBe(false);
  });

  it('becomes running after start', () => {
    const store = makeMockStore();
    const watcher = createExportWatcher(store, {
      format: 'json',
      outputPath: 'out.json',
      intervalMs: 5000,
    });
    watcher.start();
    expect(watcher.isRunning()).toBe(true);
    watcher.stop();
  });

  it('calls exportSnapshot on interval tick', () => {
    const store = makeMockStore();
    const watcher = createExportWatcher(store, {
      format: 'json',
      outputPath: 'out.json',
      intervalMs: 1000,
    });
    watcher.start();
    jest.advanceTimersByTime(3000);
    expect(exportSpy).toHaveBeenCalledTimes(3);
    watcher.stop();
  });

  it('calls exportSnapshot on stop (final flush)', () => {
    const store = makeMockStore();
    const watcher = createExportWatcher(store, {
      format: 'yaml',
      outputPath: 'out.yaml',
      intervalMs: 60000,
    });
    watcher.start();
    watcher.stop();
    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(watcher.isRunning()).toBe(false);
  });

  it('does not start twice if already running', () => {
    const store = makeMockStore();
    const watcher = createExportWatcher(store, {
      format: 'json',
      outputPath: 'out.json',
      intervalMs: 1000,
    });
    watcher.start();
    watcher.start();
    jest.advanceTimersByTime(2000);
    expect(exportSpy).toHaveBeenCalledTimes(2);
    watcher.stop();
  });
});
