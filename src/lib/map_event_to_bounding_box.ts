import { MapMouseEvent } from "mapbox-gl";

export type EventParts = Pick<MapMouseEvent, "point">;
export type BoundingBox = [[number, number], [number, number]];

/**
 * Returns a bounding box representing the event's location.
 */
function mapEventToBoundingBox(mapEvent: EventParts, buffer = 0): BoundingBox {
  return [
    [mapEvent.point.x - buffer, mapEvent.point.y - buffer],
    [mapEvent.point.x + buffer, mapEvent.point.y + buffer],
  ];
}

export default mapEventToBoundingBox;
