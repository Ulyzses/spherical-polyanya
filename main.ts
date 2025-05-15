import { assert } from "@std/assert/assert";
import { Mesh } from "./classes/Mesh.ts";
import { Scenario, ScenarioReader } from "./classes/Scenario.ts";
import { parseArgs } from "@std/cli/parse-args";
import { debug } from "./utils.ts";
import { SearchInstance } from "./classes/SearchInstance.ts";

/* SECTION: Imports */

const args = parseArgs(Deno.args, {
  alias: { v: "verbose" },
  boolean: ["verbose"],
});

const scenarioFile = args._[0] as string;

if (!scenarioFile) {
  assert(false, "Usage: deno run --allow-read main.ts <scenario_file>\nAlias: deno run verbose <scenario_file>");
}

export const verbose = args.verbose;

/* SECTION: Functions */

async function runScenario(scen: Scenario, mesh: Mesh) {
  console.log(`Running scenario ${scen.index} on ${scen.map} from ${scen.start.toString()} to ${scen.end.toString()}`);
  const si = new SearchInstance(mesh, scen.start, scen.end);
  const [path, distance] = si.search();

  if (path.length === 0) {
    console.log(`No path found from ${scen.start.toString()} to ${scen.end.toString()}`);
  }

  await Deno.writeTextFile(`./out/${scen.index}.txt`, '');

  for (const point of path) {
    console.log(point.lat, point.lon);
    await Deno.writeTextFile(`./out/${scen.index}.txt`, `${point.lat} ${point.lon}\n`, { append: true });
  }

  console.log(`Distance: ${distance}`);
  console.log();
}

/* SECTION: Main Logic */

async function main() {
  const meshes: Map<string, Mesh> = new Map();

  // Read the scenario file
  debug(`Running scenarios from ${scenarioFile}`);
  for await (const scen of ScenarioReader.scenarioGenerator(scenarioFile)) {
    debug(
      `\nRunning scenario ${scen.index} on ${scen.map} from ${scen.start.toString()} to ${scen.end.toString()} {`,
    );

    if (!meshes.has(scen.map)) {
      debug(`Loading mesh ${scen.map}`);
      const mesh = new Mesh();
      await mesh.read(scen.map);
      meshes.set(scen.map, mesh);
    }

    runScenario(scen, meshes.get(scen.map)!);

    debug(`}`);
  }
}

if (import.meta.main) {
  await main();
}