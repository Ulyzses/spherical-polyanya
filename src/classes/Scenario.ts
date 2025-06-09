import { assert } from "@std/assert";
import Point from "./Point.ts";
import { readLines } from "../utils.ts";

export interface Scenario {
  map: string;
  label: string;
  start: Point;
  end: Point;
}

/** A class for reading scenarios */
export default class ScenarioReader {
  private _filename: string;

  /**
   * A class to read and generate scenarios
   * @param filename The name of the file containing the scenario data
   */
  constructor(filename: string) {
    this._filename = filename;
  }

  /**
   * Generate scenarios from the file
   * @returns An async generator yielding Scenario objects
   * @throws Will throw an error if the file format is invalid
   */
  async *generator(): AsyncGenerator<Scenario> {
    const scenReader = readLines(this._filename);

    const firstLine = (await scenReader.next()).value;
    assert(
      firstLine.toLowerCase().startsWith("version 2"),
      "Invalid file format: expected 'version 2' header",
    );

    for await (const line of scenReader) {
      const scen = line.split(/\s+/);

      assert(
        scen.length === 6,
        `Invalid scenario format: expected 6 fields but got ${scen.length}: ${line}`,
      );

      const map: string = scen[0];
      const label: string = scen[1];
      const startLat: number = parseFloat(scen[2]);
      const startLon: number = parseFloat(scen[3]);
      const endLat: number = parseFloat(scen[4]);
      const endLon: number = parseFloat(scen[5]);

      yield {
        map,
        label,
        start: new Point(startLat, startLon),
        end: new Point(endLat, endLon),
      };
    }
  }
}
