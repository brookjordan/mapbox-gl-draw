import * as CommonSelectors from "../lib/common_selectors";
import {
  activeStates,
  cursors,
  events,
  geojsonTypes,
  modes,
  types,
} from "../constants";

export default {
  onSetup: function () {
    const point = this.newFeature({
      type: geojsonTypes.FEATURE,
      properties: {},
      geometry: {
        type: geojsonTypes.POINT,
        coordinates: [],
      },
    });

    this.addFeature(point);

    this.clearSelectedFeatures();
    this.updateUIClasses({ mouse: cursors.ADD });
    this.activateUIButton(types.POINT);

    this.setActionableState({
      trash: true,
    });

    return { point };
  },

  stopDrawingAndRemove: function (state) {
    this.deleteFeature([state.point.id], { silent: true });
    this.changeMode(modes.SIMPLE_SELECT);
  },

  onTap: function (state, e) {
    this.updateUIClasses({ mouse: cursors.MOVE });
    state.point.updateCoordinate("", e.lngLat.lng, e.lngLat.lat);
    this.map.fire(events.CREATE, {
      features: [state.point.toGeoJSON()],
    });
    this.changeMode(modes.SIMPLE_SELECT, {
      featureIds: [state.point.id],
    });
  },

  onClick: function (...args) {
    this.onTap(...args);
  },

  onStop: function (state) {
    this.activateUIButton();
    if (!state.point.getCoordinate().length) {
      this.deleteFeature([state.point.id], { silent: true });
    }
  },

  toDisplayFeatures: function (state, geojson, display) {
    // Never render the point we're drawing
    const isActivePoint = geojson.properties.id === state.point.id;
    geojson.properties.active = isActivePoint
      ? activeStates.ACTIVE
      : activeStates.INACTIVE;
    if (!isActivePoint) return display(geojson);
  },

  onTrash: function (...args) {
    this.stopDrawingAndRemove(...args);
  },

  onKeyUp: function (state, e) {
    if (CommonSelectors.isEscapeKey(e) || CommonSelectors.isEnterKey(e)) {
      return this.stopDrawingAndRemove(state, e);
    }
  },
} as const;
