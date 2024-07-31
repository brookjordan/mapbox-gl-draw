declare module "@mapbox/geojson-normalize" {
  import { FeatureCollection, GeoJSON } from "geojson";

  export default function normalize(geojson: GeoJSON): FeatureCollection;
}
