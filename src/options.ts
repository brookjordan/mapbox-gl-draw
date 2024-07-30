import { Layer } from "mapbox-gl";
import { modes as modeConstants, sources, types } from "./constants";

import styles from "./lib/theme";
import modes from "./modes/index";

export type Control =
  | "trash"
  | "combine_features"
  | "uncombine_features"
  | typeof types.LINE
  | typeof types.POLYGON
  | typeof types.POINT;

export type DrawMode = (typeof modeConstants)[keyof typeof modeConstants];

export interface Options {
  defaultMode: DrawMode;
  keybindings: boolean;
  touchEnabled: boolean;
  clickBuffer: number;
  touchBuffer: number;
  boxSelect: boolean;
  displayControlsDefault: boolean;
  styles: Layer[];
  modes: typeof modes;
  controls: any;
  userProperties: boolean;
}
const defaultOptions: Options = {
  defaultMode: modeConstants.SIMPLE_SELECT,
  keybindings: true,
  touchEnabled: true,
  clickBuffer: 2,
  touchBuffer: 25,
  boxSelect: true,
  displayControlsDefault: true,
  styles,
  modes,
  controls: {},
  userProperties: false,
};

const showControls = {
  point: true,
  line_string: true,
  polygon: true,
  trash: true,
  combine_features: true,
  uncombine_features: true,
};

const hideControls = {
  point: false,
  line_string: false,
  polygon: false,
  trash: false,
  combine_features: false,
  uncombine_features: false,
};

function addSources(styles, sourceBucket) {
  return styles.map((style) => {
    if (style.source) return style;
    return Object.assign({}, style, {
      id: `${style.id}.${sourceBucket}`,
      source: sourceBucket === "hot" ? sources.HOT : sources.COLD,
    });
  });
}

export type SetupOptions = Partial<
  Pick<Options, "controls" | "displayControlsDefault" | "controls" | "styles">
>;
export default function (options: SetupOptions = {}) {
  let withDefaults: typeof options = Object.assign({}, options);

  if (!options.controls) {
    withDefaults.controls = {};
  }

  if (options.displayControlsDefault === false) {
    withDefaults.controls = Object.assign({}, hideControls, options.controls);
  } else {
    withDefaults.controls = Object.assign({}, showControls, options.controls);
  }

  withDefaults = Object.assign({}, defaultOptions, withDefaults);

  // Layers with a shared source should be adjacent for performance reasons
  withDefaults.styles = addSources(withDefaults.styles, "cold").concat(
    addSources(withDefaults.styles, "hot")
  );

  return withDefaults;
}
