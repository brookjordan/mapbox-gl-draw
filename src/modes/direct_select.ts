import {
  activeStates,
  cursors,
  events,
  geojsonTypes,
  meta,
  modes,
  updateActions,
} from "../constants";
import {
  isActiveFeature,
  isInactiveFeature,
  isOfMetaType,
  isShiftDown,
  noTarget,
} from "../lib/common_selectors";
import constrainFeatureMovement from "../lib/constrain_feature_movement";
import createSupplementaryPoints from "../lib/create_supplementary_points";
import doubleClickZoom from "../lib/double_click_zoom";
import moveFeatures from "../lib/move_features";
import { ModeState } from "./mode_interface";

const isVertex = isOfMetaType(meta.VERTEX);
const isMidpoint = isOfMetaType(meta.MIDPOINT);

export default {
  fireUpdate() {
    this.map.fire(events.UPDATE, {
      action: updateActions.CHANGE_COORDINATES,
      features: this.getSelected().map((f) => f.toGeoJSON()),
    });
  },

  fireActionable(state: ModeState) {
    this.setActionableState({
      combineFeatures: false,
      uncombineFeatures: false,
      trash: state.selectedCoordPaths.length > 0,
    });
  },

  startDragging(state: ModeState, e) {
    state.initialDragPanState = this.map.dragPan.isEnabled();

    this.map.dragPan.disable();
    state.canDragMove = true;
    state.dragMoveLocation = e.lngLat;
  },

  stopDragging(state: ModeState) {
    if (state.canDragMove && state.initialDragPanState === true) {
      this.map.dragPan.enable();
    }
    state.dragMoving = false;
    state.canDragMove = false;
    state.dragMoveLocation = null;
  },

  onVertex(state: ModeState, e) {
    this.startDragging(state, e);
    const about = e.featureTarget.properties;
    const selectedIndex = state.selectedCoordPaths.indexOf(about.coord_path);
    if (!isShiftDown(e) && selectedIndex === -1) {
      state.selectedCoordPaths = [about.coord_path];
    } else if (isShiftDown(e) && selectedIndex === -1) {
      state.selectedCoordPaths.push(about.coord_path);
    }

    const selectedCoordinates = this.pathsToCoordinates(
      state.featureId,
      state.selectedCoordPaths
    );
    this.setSelectedCoordinates(selectedCoordinates);
  },

  onMidpoint(state: ModeState, e) {
    this.startDragging(state, e);
    const about = e.featureTarget.properties;
    const feature = state.feature;
    if ("addCoordinate" in feature) {
      feature.addCoordinate(about.coord_path, about.lng, about.lat);
    }
    this.fireUpdate();
    state.selectedCoordPaths = [about.coord_path];
  },

  pathsToCoordinates(featureId, paths) {
    return paths.map((coord_path) => ({ feature_id: featureId, coord_path }));
  },

  onFeature(state: ModeState, e) {
    if (state.selectedCoordPaths.length === 0) this.startDragging(state, e);
    else this.stopDragging(state);
  },

  dragFeature(state: ModeState, e, delta) {
    moveFeatures(this.getSelected(), delta);
    state.dragMoveLocation = e.lngLat;
  },

  dragVertex(state: ModeState, e, delta) {
    const selectedCoords = state.selectedCoordPaths.map((coord_path) =>
      state.feature.getCoordinate(coord_path)
    );
    const selectedCoordPoints = selectedCoords.map((coords) => ({
      type: geojsonTypes.FEATURE,
      properties: {},
      geometry: {
        type: geojsonTypes.POINT,
        coordinates: coords,
      },
    }));

    const constrainedDelta = constrainFeatureMovement(
      selectedCoordPoints,
      delta
    );
    for (let i = 0; i < selectedCoords.length; i++) {
      const coord = selectedCoords[i];
      state.feature.updateCoordinate(
        state.selectedCoordPaths[i],
        coord[0] + constrainedDelta.lng,
        coord[1] + constrainedDelta.lat
      );
    }
  },

  clickNoTarget() {
    this.changeMode(modes.SIMPLE_SELECT);
  },

  clickInactive() {
    this.changeMode(modes.SIMPLE_SELECT);
  },

  clickActiveFeature(state: ModeState) {
    state.selectedCoordPaths = [];
    this.clearSelectedCoordinates();
    state.feature.changed();
  },

  // EXTERNAL FUNCTIONS

  onSetup(opts) {
    const featureId = opts.featureId;
    const feature = this.getFeature(featureId);

    if (!feature) {
      throw new Error(
        "You must provide a featureId to enter direct_select mode"
      );
    }

    if (feature.type === geojsonTypes.POINT) {
      throw new TypeError("direct_select mode doesn't handle point features");
    }

    const state: ModeState = {
      featureId,
      feature,
      dragMoveLocation: opts.startPos || null,
      dragMoving: false,
      canDragMove: false,
      selectedCoordPaths: opts.coordPath ? [opts.coordPath] : [],
    };

    this.setSelectedCoordinates(
      this.pathsToCoordinates(featureId, state.selectedCoordPaths)
    );
    this.setSelected(featureId);
    doubleClickZoom.disable(this);

    this.setActionableState({
      trash: true,
    });

    return state;
  },

  onStop() {
    doubleClickZoom.enable(this);
    this.clearSelectedCoordinates();
  },

  toDisplayFeatures(state: ModeState, geojson, push) {
    if (state.featureId === geojson.properties.id) {
      geojson.properties.active = activeStates.ACTIVE;
      push(geojson);
      createSupplementaryPoints(geojson, {
        // I’m not sure where this comes from, or should be used for
        // map: this.map,
        midpoints: true,
        selectedPaths: state.selectedCoordPaths,
      }).forEach(push);
    } else {
      geojson.properties.active = activeStates.INACTIVE;
      push(geojson);
    }
    this.fireActionable(state);
  },

  onTrash(state: ModeState) {
    // Uses number-aware sorting to make sure '9' < '10'. Comparison is reversed because we want them
    // in reverse order so that we can remove by index safely.
    const feature = state.feature;
    if ("removeCoordinate" in feature) {
      state.selectedCoordPaths
        .sort((a, b) => b.localeCompare(a, "en", { numeric: true }))
        .forEach((id) => feature.removeCoordinate(id));
    }
    this.fireUpdate();
    state.selectedCoordPaths = [];
    this.clearSelectedCoordinates();
    this.fireActionable(state);
    if (feature.isValid() === false) {
      this.deleteFeature([state.featureId]);
      this.changeMode(modes.SIMPLE_SELECT, {});
    }
  },

  onMouseMove(state: ModeState, e) {
    // On mousemove that is not a drag, stop vertex movement.
    const isFeature = isActiveFeature(e);
    const onVertex = isVertex(e);
    const isMidPoint = isMidpoint(e);
    const noCoords = state.selectedCoordPaths.length === 0;
    if (isFeature && noCoords) this.updateUIClasses({ mouse: cursors.MOVE });
    else if (onVertex && !noCoords)
      this.updateUIClasses({ mouse: cursors.MOVE });
    else this.updateUIClasses({ mouse: cursors.NONE });

    const isDraggableItem = onVertex || isFeature || isMidPoint;
    if (isDraggableItem && state.dragMoving) this.fireUpdate();

    this.stopDragging(state);

    // Skip render
    return true;
  },

  onMouseOut(state: ModeState) {
    // As soon as you mouse leaves the canvas, update the feature
    if (state.dragMoving) this.fireUpdate();

    // Skip render
    return true;
  },

  onTouchStart(state: ModeState, e) {
    if (isVertex(e)) return this.onVertex(state, e);
    if (isActiveFeature(e)) return this.onFeature(state, e);
    if (isMidpoint(e)) return this.onMidpoint(state, e);
  },

  onMouseDown(...args) {
    this.onTouchStart(...args);
  },

  onDrag(state: ModeState, e) {
    if (state.canDragMove !== true) return;
    state.dragMoving = true;
    e.originalEvent.stopPropagation();

    const delta = {
      lng: e.lngLat.lng - state.dragMoveLocation.lng,
      lat: e.lngLat.lat - state.dragMoveLocation.lat,
    };
    if (state.selectedCoordPaths.length > 0) this.dragVertex(state, e, delta);
    else this.dragFeature(state, e, delta);

    state.dragMoveLocation = e.lngLat;
  },

  onClick(state: ModeState, e) {
    if (noTarget(e)) return this.clickNoTarget(state, e);
    if (isActiveFeature(e)) return this.clickActiveFeature(state, e);
    if (isInactiveFeature(e)) return this.clickInactive(state, e);
    this.stopDragging(state);
  },

  onTap(state: ModeState, e) {
    if (noTarget(e)) return this.clickNoTarget(state, e);
    if (isActiveFeature(e)) return this.clickActiveFeature(state, e);
    if (isInactiveFeature(e)) return this.clickInactive(state, e);
  },

  onTouchEnd(state: ModeState) {
    if (state.dragMoving) {
      this.fireUpdate();
    }
    this.stopDragging(state);
  },

  onMouseUp(...args) {
    this.onTouchEnd(...args);
  },
} as const;
