export class EventBus<T> {
  private disposed: boolean = false;
  subscriptions: ((event: T) => unknown)[] = [];

  subscribe(callback: (event: T) => unknown) {
    if (this.disposed) return () => {};
    this.subscriptions.push(callback);

    return () => {
      this.subscriptions = this.subscriptions.filter((cb) => cb !== callback);
    };
  }

  publish(event: T) {
    for (const sub of this.subscriptions) {
      sub(event);
    }
  }

  dispose() {
    this.disposed = true;
    this.subscriptions = [];
  }
}

export const EkgBus = new EventBus<unknown>();

/**
 * Every second we send an TICK event onto the EventBus.
 *
 * The TICK event is used by widgets to perform any cleanups that may be required.
 * This includes things like making chat messages disappear after a certain amount
 * of time or some other resource cleanup.
 *
 * @todo Send this event more often and smarter
 */
const TICK_INTERVAL = 100;
function fireTickEvent() {
  EkgBus.publish({ type: "TICK" });
  setTimeout(fireTickEvent, TICK_INTERVAL);
}
setTimeout(fireTickEvent, TICK_INTERVAL);

declare global {
  interface Window {
    EkgBus: EventBus<unknown>;
  }
}
window.EkgBus = EkgBus;
