import { Feature } from "geojson";
import { Context } from "../api";
import { LngLat } from "../constants";
import { AnyFeature } from "../feature_types/feature";
import ModeInterfaceAccessors from "./mode_interface_accessors";

export type ModeName =
  | "onClick"
  | "onCombineFeature"
  | "onDrag"
  | "onKeyDown"
  | "onKeyUp"
  | "onMouseDown"
  | "onMouseMove"
  | "onMouseOut"
  | "onMouseUp"
  | "onSetup"
  | "onStop"
  | "onTap"
  | "onTouchEnd"
  | "onTouchMove"
  | "onTouchStart"
  | "onTrash"
  | "onUncombineFeature"
  | "toDisplayFeatures";

export type CoordPaths = string[];

export interface ModeState {
  featureId?: string;
  feature?: AnyFeature;
  dragMoveLocation?: LngLat | null;
  dragMoving?: boolean;
  canDragMove?: boolean;
  selectedCoordPaths?: CoordPaths;
  initialDragPanState?: boolean;
}

class ModeInterface extends ModeInterfaceAccessors {
  /**
   * Triggered while a mode is being transitioned into.
   * @param opts {Object} - this is the object passed via `draw.changeMode('mode', opts)`;
   * @name MODE.onSetup
   * @returns {Object} - this object will be passed to all other life cycle functions
   */
  onSetup = function (args?: any): ModeState | null {
    return null;
  };

  /**
   * Triggered when a drag event is detected on the map
   * @name MODE.onDrag
   * @param state {Object} - a mutible state object created by onSetup
   * @param e {Object} - the captured event that is triggering this life cycle event
   */
  onDrag = function () {};

  /**
   * Triggered when the mouse is clicked
   * @name MODE.onClick
   * @param state {Object} - a mutible state object created by onSetup
   * @param e {Object} - the captured event that is triggering this life cycle event
   */
  onClick = function () {};

  /**
   * Triggered with the mouse is moved
   * @name MODE.onMouseMove
   * @param state {Object} - a mutible state object created by onSetup
   * @param e {Object} - the captured event that is triggering this life cycle event
   */
  onMouseMove = function () {};

  /**
   * Triggered when the mouse button is pressed down
   * @name MODE.onMouseDown
   * @param state {Object} - a mutible state object created by onSetup
   * @param e {Object} - the captured event that is triggering this life cycle event
   */
  onMouseDown = function () {};

  /**
   * Triggered when the mouse button is released
   * @name MODE.onMouseUp
   * @param state {Object} - a mutible state object created by onSetup
   * @param e {Object} - the captured event that is triggering this life cycle event
   */
  onMouseUp = function () {};

  /**
   * Triggered when the mouse leaves the map's container
   * @name MODE.onMouseOut
   * @param state {Object} - a mutible state object created by onSetup
   * @param e {Object} - the captured event that is triggering this life cycle event
   */
  onMouseOut = function () {};

  /**
   * Triggered when a key up event is detected
   * @name MODE.onKeyUp
   * @param state {Object} - a mutible state object created by onSetup
   * @param e {Object} - the captured event that is triggering this life cycle event
   */
  onKeyUp = function () {};

  /**
   * Triggered when a key down event is detected
   * @name MODE.onKeyDown
   * @param state {Object} - a mutible state object created by onSetup
   * @param e {Object} - the captured event that is triggering this life cycle event
   */
  onKeyDown = function () {};

  /**
   * Triggered when a touch event is started
   * @name MODE.onTouchStart
   * @param state {Object} - a mutible state object created by onSetup
   * @param e {Object} - the captured event that is triggering this life cycle event
   */
  onTouchStart = function () {};

  /**
   * Triggered when one drags thier finger on a mobile device
   * @name MODE.onTouchMove
   * @param state {Object} - a mutible state object created by onSetup
   * @param e {Object} - the captured event that is triggering this life cycle event
   */
  onTouchMove = function () {};

  /**
   * Triggered when one removes their finger from the map
   * @name MODE.onTouchEnd
   * @param state {Object} - a mutible state object created by onSetup
   * @param e {Object} - the captured event that is triggering this life cycle event
   */
  onTouchEnd = function () {};

  /**
   * Triggered when one quicly taps the map
   * @name MODE.onTap
   * @param state {Object} - a mutible state object created by onSetup
   * @param e {Object} - the captured event that is triggering this life cycle event
   */
  onTap = function () {};

  /**
   * Triggered when the mode is being exited, to be used for cleaning up artifacts such as invalid features
   * @name MODE.onStop
   * @param state {Object} - a mutible state object created by onSetup
   */
  onStop = function (state?: ModeState) {};

  /**
   * Triggered when [draw.trash()](https://github.com/mapbox/mapbox-gl-draw/blob/main/API.md#trash-draw) is called.
   * @name MODE.onTrash
   * @param state {Object} - a mutible state object created by onSetup
   */
  onTrash = function (state?: ModeState) {};

  /**
   * Triggered when [draw.combineFeatures()](https://github.com/mapbox/mapbox-gl-draw/blob/main/API.md#combinefeatures-draw) is called.
   * @name MODE.onCombineFeature
   * @param state {Object} - a mutible state object created by onSetup
   */
  onCombineFeatures = function (state?: ModeState) {};

  /**
   * Triggered when [draw.uncombineFeatures()](https://github.com/mapbox/mapbox-gl-draw/blob/main/API.md#uncombinefeatures-draw) is called.
   * @name MODE.onUncombineFeature
   * @param state {Object} - a mutible state object created by onSetup
   */
  onUncombineFeatures = function (state?: ModeState) {};

  /**
   * Triggered per feature on render to convert raw features into set of features for display on the map
   * See [styling draw](https://github.com/mapbox/mapbox-gl-draw/blob/main/API.md#styling-draw) for information about what geojson properties Draw uses as part of rendering.
   * @name MODE.toDisplayFeatures
   * @param state {Object} - a mutible state object created by onSetup
   * @param geojson {Object} - a geojson being evaulated. To render, pass to `display`.
   * @param display {Function} - all geojson objects passed to this be rendered onto the map
   */
  toDisplayFeatures = function <GeoJSON extends Feature>(
    state?: ModeState,
    geojson?: GeoJSON,
    display?: (geojson: GeoJSON) => void
  ) {
    throw new Error("You must overwrite toDisplayFeatures");
  };

  constructor(ctx: Context) {
    super(ctx);
  }
}

export default ModeInterface;
