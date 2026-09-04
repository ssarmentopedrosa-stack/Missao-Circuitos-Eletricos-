import { TelemetryEvent } from '../types';

const TELEMETRY_STORAGE_KEY = 'ARES3_TELEMETRY_EVENTS';
const MAX_LOCAL_EVENTS = 500;

class TelemetryService {
  private events: TelemetryEvent[] = [];
  private uid: string = 'anon_astronaut';

  constructor() {
    this.loadFromStorage();
  }

  public setUid(uid: string) {
    this.uid = uid;
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
      if (raw) {
        this.events = JSON.parse(raw);
      }
    } catch {
      this.events = [];
    }
  }

  private saveToStorage() {
    try {
      // Keep within storage boundaries
      if (this.events.length > MAX_LOCAL_EVENTS) {
        this.events = this.events.slice(-MAX_LOCAL_EVENTS);
      }
      localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(this.events));
    } catch {
      // Ignore quota exceeded in private browsing
    }
  }

  public logEvent(type: TelemetryEvent['type'], payload: Record<string, unknown> = {}) {
    const event: TelemetryEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      uid: this.uid,
      timestamp: Date.now(),
      type,
      payload,
    };

    this.events.push(event);
    this.saveToStorage();

    // If online backend available, push asynchronously
    if (typeof window !== 'undefined' && 'fetch' in window) {
      fetch('/api/telemetry/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(() => {
        // Silent catch: network queue will keep locally
      });
    }
  }

  public getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  public getPedagogicalSummary() {
    const questionsAnswered = this.events.filter((e) => e.type === 'question_answered');
    const hintsUsed = this.events.filter((e) => e.type === 'hint_used');
    const timeouts = this.events.filter((e) => e.type === 'question_timeout');
    
    return {
      totalAnswered: questionsAnswered.length,
      totalHintsUsed: hintsUsed.length,
      totalTimeouts: timeouts.length,
      recentEvents: this.events.slice(-10),
    };
  }
}

export const telemetry = new TelemetryService();
