import { Context } from "../api";

type EventName =
  | "drag"
  | "click"
  | "mousemove"
  | "mousedown"
  | "mouseup"
  | "mouseout"
  | "keydown"
  | "keyup"
  | "touchstart"
  | "touchmove"
  | "touchend"
  | "tap";

type Event = any;
type HandlerSelector = (event: Event) => boolean;
type HandlerFn = (event: Event) => boolean | undefined;

type EventHander = {
  selector: HandlerSelector;
  fn: HandlerFn;
};

class ModeHandler {
  mode: ModeHandler;
  DrawContext: Context;

  handlers: Record<EventName, EventHander[]> = {
    drag: [],
    click: [],
    mousemove: [],
    mousedown: [],
    mouseup: [],
    mouseout: [],
    keydown: [],
    keyup: [],
    touchstart: [],
    touchmove: [],
    touchend: [],
    tap: [],
  };

  ctx = {
    on(event: Event, selector: HandlerSelector, fn: HandlerFn) {
      if (this.handlers[event] === undefined) {
        throw new Error(`Invalid event type: ${event}`);
      }
      this.handlers[event].push({
        selector,
        fn,
      });
    },
    render(id: string) {
      this.DrawContext.store.featureChanged(id);
    },
  };

  render() {
    this.mode.render();
  }

  stop() {
    if (this.mode.stop) this.mode.stop();
  }

  trash() {
    if (this.mode.trash) {
      this.mode.trash();
      this.DrawContext.store.render();
    }
  }

  combineFeatures() {
    if (this.mode.combineFeatures) {
      this.mode.combineFeatures();
    }
  }

  uncombineFeatures() {
    if (this.mode.uncombineFeatures) {
      this.mode.uncombineFeatures();
    }
  }

  delegate(eventName: EventName, event: Event) {
    const handlers = this.handlers[eventName];
    let iHandle = handlers.length;
    while (iHandle--) {
      const handler = handlers[iHandle];
      if (handler.selector(event)) {
        const skipRender = handler.fn.call(this.ctx, event);
        if (!skipRender) {
          this.DrawContext.store.render();
        }
        this.DrawContext.ui.updateMapClasses();

        // ensure an event is only handled once
        // we do this to let modes have multiple overlapping selectors
        // and relay on order of oppertations to filter
        break;
      }
    }
  }

  drag(event: Event) {
    this.delegate("drag", event);
  }

  click(event: Event) {
    this.delegate("click", event);
  }

  mousemove(event: Event) {
    this.delegate("mousemove", event);
  }

  mousedown(event: Event) {
    this.delegate("mousedown", event);
  }

  mouseup(event: Event) {
    this.delegate("mouseup", event);
  }

  mouseout(event: Event) {
    this.delegate("mouseout", event);
  }

  keydown(event: Event) {
    this.delegate("keydown", event);
  }

  keyup(event: Event) {
    this.delegate("keyup", event);
  }

  touchstart(event: Event) {
    this.delegate("touchstart", event);
  }

  touchmove(event: Event) {
    this.delegate("touchmove", event);
  }

  touchend(event: Event) {
    this.delegate("touchend", event);
  }

  tap(event: Event) {
    this.delegate("tap", event);
  }

  constructor(mode: ModeHandler, DrawContext: Context) {
    this.mode = mode;
    this.DrawContext = DrawContext;
    mode.start.call(this.ctx);
  }
}

export default ModeHandler;
