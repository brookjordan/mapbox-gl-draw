import { Feature } from "geojson";
import { Context } from "../api";
import ModeInterface, { ModeState } from "./mode_interface";
import { Options } from "../options";
import { DrawModeName, modes } from "../constants";

const EVENT_MAP = {
  drag: "onDrag",
  click: "onClick",
  mousemove: "onMouseMove",
  mousedown: "onMouseDown",
  mouseup: "onMouseUp",
  mouseout: "onMouseOut",
  keyup: "onKeyUp",
  keydown: "onKeyDown",
  touchstart: "onTouchStart",
  touchmove: "onTouchMove",
  touchend: "onTouchEnd",
  tap: "onTap",
};
type EventKey = keyof typeof EVENT_MAP;

const eventKeys = Object.keys(EVENT_MAP) as EventKey[];

class ModeFromObject {
  startOpts;
  mode;
  state: ModeState = {};

  wrapper(eh) {
    return (e) => this.mode[eh](this.state, e);
  }

  start() {
    this.state = this.mode.onSetup(this.startOpts); // this should set ui buttons

    // Adds event handlers for all event options
    // add sets the selector to false for all
    // handlers that are not present in the mode
    // to reduce on render calls for functions that
    // have no logic
    eventKeys.forEach((key) => {
      const modeHandler = EVENT_MAP[key];
      let selector = () => false;
      if (modeObject[modeHandler]) {
        selector = () => true;
      }
      this.on(key, selector, wrapper(modeHandler));
    });
  }
  stop() {
    this.mode.onStop(this.state);
  }
  trash() {
    this.mode.onTrash(this.state);
  }
  combineFeatures() {
    this.mode.onCombineFeatures(this.state);
  }
  uncombineFeatures() {
    this.mode.onUncombineFeatures(this.state);
  }
  render(geojson: Feature, push: (geojson: Feature) => void) {
    this.mode.toDisplayFeatures(this.state, geojson, push);
  }

  constructor(ctx: Context, startOpts: DrawModeName, modeObject: DrawModeName) {
    const modeObjectKeys = Object.keys(modeObject);
    this.startOpts = startOpts;
    this.mode = modeObjectKeys.reduce((m, k) => {
      m[k] = modeObject[k];
      return m;
    }, new ModeInterface(ctx));
  }
}

export default function (modeObject: DrawModeName) {
  return function (ctx: Context, startOpts: Partial<DrawModeName> = {}) {
    return new ModeFromObject(ctx, startOpts, modeObject);
  };
}
