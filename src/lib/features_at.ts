import { MapMouseEvent } from "mapbox-gl";
import { meta } from "../constants";
import mapEventToBoundingBox, {
  BoundingBox,
  EventParts,
} from "./map_event_to_bounding_box";
import sortFeatures from "./sort_features";
import StringSet from "./string_set";
import { Context } from "../api";
import { Feature, Geometry } from "geojson";
import { Properties } from "../feature_types/feature";

const META_TYPES = [meta.FEATURE, meta.MIDPOINT, meta.VERTEX];

// Requires either event or bbox
export default {
  click: featuresAtClick,
  touch: featuresAtTouch,
};

function featuresAtClick(event: EventParts, bbox: BoundingBox, ctx: Context) {
  return featuresAt(event, bbox, ctx, ctx.options.clickBuffer);
}

function featuresAtTouch(event: EventParts, bbox: BoundingBox, ctx: Context) {
  return featuresAt(event, bbox, ctx, ctx.options.touchBuffer);
}

function featuresAt(
  event: EventParts,
  bbox: BoundingBox,
  ctx: Context,
  buffer?: number
) {
  if (ctx.map === null) return [];

  const box = event ? mapEventToBoundingBox(event, buffer) : bbox;

  const queryParams: {
    layers?: string[];
  } = {};

  if (ctx.options.styles)
    queryParams.layers = ctx.options.styles
      .map((s) => s.id)
      .filter((id) => ctx.map.getLayer(id) != null);

  const features = ctx.map
    .queryRenderedFeatures(box, queryParams)
    .filter((feature) => META_TYPES.indexOf(feature.properties.meta) !== -1);

  const featureIds = new StringSet();
  const uniqueFeatures: Feature<Geometry, Properties>[] = [];
  features.forEach((feature) => {
    const featureId = feature.properties.id;
    if (featureIds.has(featureId)) return;
    featureIds.add(featureId);
    uniqueFeatures.push(feature);
  });

  return sortFeatures(uniqueFeatures);
}
