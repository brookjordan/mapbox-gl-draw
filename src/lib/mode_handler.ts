class ModeHandler {
  mode;
  DrawContext;

  handlers = {
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
    on(event, selector, fn) {
      if (this.handlers[event] === undefined) {
        throw new Error(`Invalid event type: ${event}`);
      }
      this.handlers[event].push({
        selector,
        fn,
      });
    },
    render(id) {
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

  delegate(eventName, event) {
    const handles = this.handlers[eventName];
    let iHandle = handles.length;
    while (iHandle--) {
      const handle = handles[iHandle];
      if (handle.selector(event)) {
        const skipRender = handle.fn.call(this.ctx, event);
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

  drag(event) {
    this.delegate("drag", event);
  }

  click(event) {
    this.delegate("click", event);
  }

  mousemove(event) {
    this.delegate("mousemove", event);
  }

  mousedown(event) {
    this.delegate("mousedown", event);
  }

  mouseup(event) {
    this.delegate("mouseup", event);
  }

  mouseout(event) {
    this.delegate("mouseout", event);
  }

  keydown(event) {
    this.delegate("keydown", event);
  }

  keyup(event) {
    this.delegate("keyup", event);
  }

  touchstart(event) {
    this.delegate("touchstart", event);
  }

  touchmove(event) {
    this.delegate("touchmove", event);
  }

  touchend(event) {
    this.delegate("touchend", event);
  }

  tap(event) {
    this.delegate("tap", event);
  }

  constructor(mode, DrawContext) {
    this.mode = mode;
    this.DrawContext = DrawContext;
    mode.start.call(this.ctx);
  }
}

export default ModeHandler;
