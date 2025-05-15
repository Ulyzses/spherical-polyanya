import { assert } from "@std/assert/assert";
import { debug, readlines } from "../utils.ts";
import { Point } from "./Point.ts";

export interface Scenario {
  index: number;
  map: string;
  start: Point;
  end: Point;
  optimalPath: number;
}

export class ScenarioReader {
  constructor() {}

  public static async *scenarioGenerator(
    file: string,
  ): AsyncGenerator<Scenario> {
    debug(`Reading scenario from ${file}`);

    const scenReader = readlines(file);

    const firstLine = (await scenReader.next()).value;

    assert(
      firstLine.toLowerCase() === "version 1",
      `Invalid scenario version: ${firstLine} (expecting 'version 1')`,
    );

    for await (const line of scenReader) {
      const scen = line.split("\t");

      assert(
        scen.length === 9,
        `Invalid scenario format: ${line} (expecting 9 fields)`,
      );

      const bucket: number = parseInt(scen[0]); // used as index
      const map: string = scen[1];
      // const height: number = parseFloat(scen[2]); // unused
      // const width: number = parseFloat(scen[3]);  // unused
      const startLat: number = parseFloat(scen[4]);
      const startLon: number = parseFloat(scen[5]);
      const endLat: number = parseFloat(scen[6]);
      const endLon: number = parseFloat(scen[7]);
      const optimalPath: number = parseFloat(scen[8]);

      yield {
        index: bucket,
        map: map,
        start: new Point(startLat, startLon),
        end: new Point(endLat, endLon),
        optimalPath: optimalPath,
      };
    }
  }
}
