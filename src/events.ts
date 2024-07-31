import { Point } from "mapbox-gl";
import {
  classes,
  cursors,
  modes as modeConstants,
  events as eventConstants,
  DrawModeName,
} from "./constants";
import featuresAt from "./lib/features_at";
import getFeaturesAndSetCursor from "./lib/get_features_and_set_cursor";
import isClick from "./lib/is_click";
import isTap from "./lib/is_tap";
import ModeHandler from "./lib/mode_handler";
import objectToMode from "./modes/object_to_mode";
import { ModeName } from "./modes/mode_interface";
import { Context } from "./api";

export default class Events<ModeNames extends ModeName = ModeName> {
  modes: { [ModeName in ModeNames]: ModeHandler[] };
  mouseDownInfo: {
    time?: number;
    point?: Point;
  } = {};
  touchStartInfo = {};

  ctx;
  currentMode: ModeHandler | null = null;

  actionState = {
    trash: false,
    combineFeatures: false,
    uncombineFeatures: false,
  };

  _currentModeName: string | null = null;
  get currentModeName() {
    return this._currentModeName;
  }

  events = {
    drag(event, isDrag) {
      if (
        isDrag({
          point: event.point,
          time: new Date().getTime(),
        })
      ) {
        this.ctx.ui.queueMapClasses({ mouse: cursors.DRAG });
        this.currentMode.drag(event);
      } else {
        event.originalEvent.stopPropagation();
      }
    },

    mousedrag(event) {
      this.events.drag(
        event,
        (endInfo) => !isClick(this.mouseDownInfo, endInfo)
      );
    },

    touchdrag(event) {
      this.events.drag(
        event,
        (endInfo) => !isTap(this.touchStartInfo, endInfo)
      );
    },

    mousemove(event) {
      const button =
        event.originalEvent.buttons !== undefined
          ? event.originalEvent.buttons
          : event.originalEvent.which;
      if (button === 1) {
        return this.events.mousedrag(event);
      }
      const target = getFeaturesAndSetCursor(event, this.ctx);
      event.featureTarget = target;
      this.currentMode.mousemove(event);
    },

    mousedown(event) {
      this.mouseDownInfo.time = new Date().getTime();
      this.mouseDownInfo.point = event.point;
      const target = getFeaturesAndSetCursor(event, this.ctx);
      event.featureTarget = target;
      this.currentMode.mousedown(event);
    },

    mouseup(event) {
      const target = getFeaturesAndSetCursor(event, this.ctx);
      event.featureTarget = target;

      if (
        isClick(this.mouseDownInfo, {
          point: event.point,
          time: new Date().getTime(),
        })
      ) {
        this.currentMode.click(event);
      } else {
        this.currentMode.mouseup(event);
      }
    },

    mouseout(event) {
      this.currentMode.mouseout(event);
    },

    touchstart(event) {
      if (!this.ctx.options.touchEnabled) {
        return;
      }

      this.touchStartInfo = {
        time: new Date().getTime(),
        point: event.point,
      };
      const target = featuresAt.touch(event, null, this.ctx)[0];
      event.featureTarget = target;
      this.currentMode.touchstart(event);
    },

    touchmove(event) {
      if (!this.ctx.options.touchEnabled) {
        return;
      }

      this.currentMode.touchmove(event);
      return this.events.touchdrag(event);
    },

    touchend(event) {
      // Prevent emulated mouse events because we will fully handle the touch here.
      // This does not stop the touch events from propogating to mapbox though.
      event.originalEvent.preventDefault();
      if (!this.ctx.options.touchEnabled) {
        return;
      }

      const target = featuresAt.touch(event, null, this.ctx)[0];
      event.featureTarget = target;
      if (
        isTap(this.touchStartInfo, {
          time: new Date().getTime(),
          point: event.point,
        })
      ) {
        this.currentMode.tap(event);
      } else {
        this.currentMode.touchend(event);
      }
    },

    keydown(event) {
      const isMapElement = (
        event.srcElement || event.target
      ).classList.contains(classes.CANVAS);
      if (!isMapElement) return; // we only handle events on the map

      if (
        (event.keyCode === 8 || event.keyCode === 46) &&
        this.ctx.options.controls.trash
      ) {
        event.preventDefault();
        this.currentMode.trash();
      } else if (this.isKeyModeValid(event.keyCode)) {
        this.currentMode.keydown(event);
      } else if (event.keyCode === 49 && this.ctx.options.controls.point) {
        this.changeMode(modeConstants.DRAW_POINT);
      } else if (
        event.keyCode === 50 &&
        this.ctx.options.controls.line_string
      ) {
        this.changeMode(modeConstants.DRAW_LINE_STRING);
      } else if (event.keyCode === 51 && this.ctx.options.controls.polygon) {
        this.changeMode(modeConstants.DRAW_POLYGON);
      }
    },

    keyup(event) {
      if (this.isKeyModeValid(event.keyCode)) {
        this.currentMode.keyup(event);
      }
    },

    zoomend() {
      this.ctx.store.changeZoom();
    },

    data(event) {
      if (event.dataType === "style") {
        const { setup, map, options, store } = this.ctx;
        const hasLayers = options.styles.some((style) =>
          map.getLayer(style.id)
        );
        if (!hasLayers) {
          setup.addLayers();
          store.setDirty();
          store.render();
        }
      }
    },
  };

  // 8 - Backspace
  // 46 - Delete
  isKeyModeValid(code) {
    return !(code === 8 || code === 46 || (code >= 48 && code <= 57));
  }

  start() {
    this._currentModeName = this.ctx.options.defaultMode;
    this.currentMode = new ModeHandler(
      this.modes[this._currentModeName](this.ctx),
      this.ctx
    );
  }

  changeMode(
    modename,
    nextModeOptions,
    eventOptions: { silent?: boolean } = {}
  ) {
    this.currentMode.stop();

    const modebuilder = this.modes[modename];
    if (modebuilder === undefined) {
      throw new Error(`${modename} is not valid`);
    }
    this._currentModeName = modename;
    const mode = modebuilder(this.ctx, nextModeOptions);
    this.currentMode = new ModeHandler(mode, this.ctx);

    if (!eventOptions.silent) {
      this.ctx.map.fire(eventConstants.MODE_CHANGE, { mode: modename });
    }

    this.ctx.store.setDirty();
    this.ctx.store.render();
  }

  actionable(actions) {
    let changed = false;
    Object.keys(actions).forEach((action) => {
      if (this.actionState[action] === undefined)
        throw new Error("Invalid action type");
      if (this.actionState[action] !== actions[action]) changed = true;
      this.actionState[action] = actions[action];
    });
    if (changed) {
      this.ctx.map.fire(eventConstants.ACTIONABLE, {
        actions: this.actionState,
      });
    }
  }

  currentModeRender(geojson, push) {
    return this.currentMode.render(geojson, push);
  }

  fire(name: keyof typeof this.events, event, option1) {
    if (this.events[name]) {
      if (name === "drag") {
        this.events[name](event, option1);
      } else {
        this.events[name](event);
      }
    }
  }

  addEventListeners() {
    this.ctx.map.on("mousemove", this.events.mousemove);
    this.ctx.map.on("mousedown", this.events.mousedown);
    this.ctx.map.on("mouseup", this.events.mouseup);
    this.ctx.map.on("data", this.events.data);

    this.ctx.map.on("touchmove", this.events.touchmove);
    this.ctx.map.on("touchstart", this.events.touchstart);
    this.ctx.map.on("touchend", this.events.touchend);

    this.ctx.container.addEventListener("mouseout", this.events.mouseout);

    if (this.ctx.options.keybindings) {
      this.ctx.container.addEventListener("keydown", this.events.keydown);
      this.ctx.container.addEventListener("keyup", this.events.keyup);
    }
  }

  removeEventListeners() {
    this.ctx.map.off("mousemove", this.events.mousemove);
    this.ctx.map.off("mousedown", this.events.mousedown);
    this.ctx.map.off("mouseup", this.events.mouseup);
    this.ctx.map.off("data", this.events.data);

    this.ctx.map.off("touchmove", this.events.touchmove);
    this.ctx.map.off("touchstart", this.events.touchstart);
    this.ctx.map.off("touchend", this.events.touchend);

    this.ctx.container.removeEventListener("mouseout", this.events.mouseout);

    if (this.ctx.options.keybindings) {
      this.ctx.container.removeEventListener("keydown", this.events.keydown);
      this.ctx.container.removeEventListener("keyup", this.events.keyup);
    }
  }

  trash(options) {
    this.currentMode.trash(options);
  }

  combineFeatures() {
    this.currentMode.combineFeatures();
  }

  uncombineFeatures() {
    this.currentMode.uncombineFeatures();
  }

  getMode() {
    return this._currentModeName;
  }

  constructor(ctx: Context) {
    this.ctx = ctx;
    this.modes = Object.keys(ctx.options.modes).reduce((m, k) => {
      m[k] = objectToMode(ctx.options.modes[k]);
      return m;
    }, {});
  }
}
