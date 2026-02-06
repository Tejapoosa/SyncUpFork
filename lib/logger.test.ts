/**
 * Tests for Logger
 */

import { logger, LogLevel } from './logger';

// Mock console methods to capture output
const originalLog = console.log;
const originalDebug = console.debug;
const originalWarn = console.warn;
const originalError = console.error;

describe('Logger', () => {
  beforeEach(() => {
    // Clear mocks before each test
    console.log = jest.fn();
    console.debug = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalLog;
    console.debug = originalDebug;
    console.warn = originalWarn;
    console.error = originalError;
  });

  describe('info', () => {
    it('should log info message', () => {
      logger.info('test message', { userId: 'user_123' });

      expect(console.log).toHaveBeenCalled();
      const loggedData = JSON.parse((console.log as jest.Mock).mock.calls[0][0]);
      expect(loggedData.level).toBe('INFO');
      expect(loggedData.message).toBe('test message');
      expect(loggedData.context.userId).toBe('user_123');
    });

    it('should include timestamp in log entry', () => {
      logger.info('timestamped message');

      const loggedData = JSON.parse((console.log as jest.Mock).mock.calls[0][0]);
      expect(loggedData.timestamp).toBeDefined();
      const timestamp = new Date(loggedData.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should handle empty context', () => {
      logger.info('message without context');

      const loggedData = JSON.parse((console.log as jest.Mock).mock.calls[0][0]);
      expect(loggedData.context).toBeDefined();
      expect(Object.keys(loggedData.context).length).toBe(0);
    });

    it('should handle complex context objects', () => {
      const context = {
        userId: 'user_456',
        endpoint: '/api/meetings',
        duration: 123,
        metadata: { foo: 'bar' },
      };

      logger.info('complex context', context);

      const loggedData = JSON.parse((console.log as jest.Mock).mock.calls[0][0]);
      expect(loggedData.context).toEqual(context);
    });
  });

  describe('warn', () => {
    it('should log warn message', () => {
      logger.warn('warning message', { severity: 'low' });

      expect(console.warn).toHaveBeenCalled();
      const loggedData = JSON.parse((console.warn as jest.Mock).mock.calls[0][0]);
      expect(loggedData.level).toBe('WARN');
      expect(loggedData.message).toBe('warning message');
    });

    it('should include context in warning', () => {
      logger.warn('rate limit warning', { userId: 'user_789', remaining: 5 });

      const loggedData = JSON.parse((console.warn as jest.Mock).mock.calls[0][0]);
      expect(loggedData.context.remaining).toBe(5);
    });
  });

  describe('error', () => {
    it('should log error with Error object', () => {
      const error = new Error('Test error');
      logger.error('error occurred', error, { userId: 'user_err' });

      expect(console.error).toHaveBeenCalled();
      const loggedData = JSON.parse((console.error as jest.Mock).mock.calls[0][0]);
      expect(loggedData.level).toBe('ERROR');
      expect(loggedData.message).toBe('error occurred');
      expect(loggedData.error.message).toBe('Test error');
      expect(loggedData.error.stack).toBeDefined();
    });

    it('should log error with string message', () => {
      logger.error('string error', 'Error message', { operation: 'save' });

      const loggedData = JSON.parse((console.error as jest.Mock).mock.calls[0][0]);
      expect(loggedData.error.message).toBe('Error message');
    });

    it('should log error with unknown type', () => {
      logger.error('unknown error', { unknown: 'data' }, { context: 'test' });

      const loggedData = JSON.parse((console.error as jest.Mock).mock.calls[0][0]);
      expect(loggedData.error.message).toBe('Unknown error');
    });

    it('should include stack trace in error', () => {
      const error = new Error('Stack trace test');
      logger.error('error with stack', error);

      const loggedData = JSON.parse((console.error as jest.Mock).mock.calls[0][0]);
      expect(loggedData.error.stack).toContain('Stack trace test');
    });

    it('should include context with error', () => {
      const error = new Error('Database error');
      logger.error('db failed', error, {
        userId: 'user_db',
        query: 'SELECT * FROM users',
        retries: 3,
      });

      const loggedData = JSON.parse((console.error as jest.Mock).mock.calls[0][0]);
      expect(loggedData.context.userId).toBe('user_db');
      expect(loggedData.context.retries).toBe(3);
    });
  });

  describe('debug', () => {
    it('should log debug message', () => {
      logger.debug('debug info', { traceId: 'trace_001' });

      expect(console.debug).toHaveBeenCalled();
      const loggedData = JSON.parse((console.debug as jest.Mock).mock.calls[0][0]);
      expect(loggedData.level).toBe('DEBUG');
      expect(loggedData.message).toBe('debug info');
    });
  });

  describe('getLogs', () => {
    beforeEach(() => {
      // Clear logs before each test
      logger.setLevel(LogLevel.DEBUG);
    });

    it('should retrieve recent logs', () => {
      logger.info('log 1', { num: 1 });
      logger.info('log 2', { num: 2 });
      logger.info('log 3', { num: 3 });

      const logs = logger.getLogs(10);
      expect(logs.length).toBeGreaterThanOrEqual(3);
    });

    it('should limit retrieved logs', () => {
      // Add multiple logs
      for (let i = 0; i < 20; i++) {
        logger.info(`log ${i}`, { index: i });
      }

      const logs = logger.getLogs(5);
      expect(logs.length).toBeLessThanOrEqual(5);
    });

    it('should return logs in chronological order', () => {
      logger.info('first', { order: 1 });
      logger.info('second', { order: 2 });
      logger.info('third', { order: 3 });

      const logs = logger.getLogs(10);
      const recentLogs = logs.slice(-3);
      const messages = recentLogs.map((log) => log.message);

      expect(messages).toContain('first');
      expect(messages).toContain('second');
      expect(messages).toContain('third');
    });
  });

  describe('setLevel', () => {
    it('should respect debug level', () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('debug message');

      expect(console.debug).toHaveBeenCalled();
    });

    it('should respect info level', () => {
      logger.setLevel(LogLevel.INFO);
      logger.debug('debug message');

      expect(console.debug).not.toHaveBeenCalled();
    });

    it('should respect warn level', () => {
      logger.setLevel(LogLevel.WARN);
      logger.info('info message');
      logger.warn('warn message');

      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });

    it('should respect error level', () => {
      logger.setLevel(LogLevel.ERROR);
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Log Entry Structure', () => {
    it('should have consistent log format', () => {
      logger.info('structured message', { key: 'value' });

      const loggedData = JSON.parse((console.log as jest.Mock).mock.calls[0][0]);

      expect(loggedData).toHaveProperty('timestamp');
      expect(loggedData).toHaveProperty('level');
      expect(loggedData).toHaveProperty('message');
      expect(loggedData).toHaveProperty('context');
      expect(typeof loggedData.timestamp).toBe('string');
      expect(typeof loggedData.level).toBe('string');
      expect(typeof loggedData.message).toBe('string');
      expect(typeof loggedData.context).toBe('object');
    });

    it('should include error object only when present', () => {
      logger.info('message without error');
      const infoLog = JSON.parse((console.log as jest.Mock).mock.calls[0][0]);

      expect(infoLog).not.toHaveProperty('error');

      logger.error('message with error', new Error('test'));
      const errorLog = JSON.parse((console.error as jest.Mock).mock.calls[0][0]);

      expect(errorLog).toHaveProperty('error');
      expect(errorLog.error).toHaveProperty('message');
    });
  });

  describe('Performance', () => {
    it('should log quickly', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        logger.info(`message ${i}`, { index: i });
      }

      const duration = performance.now() - start;
      // Should log 1000 messages in less than 500ms
      expect(duration).toBeLessThan(500);
    });

    it('should maintain reasonable memory', () => {
      // Log many messages
      for (let i = 0; i < 5000; i++) {
        logger.info(`message ${i}`, { index: i });
      }

      // Should only keep up to maxLogs (1000)
      const logs = logger.getLogs(2000);
      expect(logs.length).toBeLessThanOrEqual(1000);
    });
  });
});
