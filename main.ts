import { Mesh } from "./classes/Mesh.ts";
import { Scenario, ScenarioReader } from "./classes/Scenario.ts";
import { parseArgs } from "@std/cli/parse-args";
import { debug } from "./utils.ts";
import { SearchInstance } from "./classes/SearchInstance.ts";
// import { SearchInstance } from "./classes/SearchInstance.ts";

/* SECTION: Imports */

const args = parseArgs(Deno.args, {
  alias: { v: "verbose" },
  boolean: ["verbose"],
});

const scenarioFile = args._[0] as string;

if (!scenarioFile) {
  console.error("Usage: deno run --allow-read main.ts <scenario_file>");
  console.error("Alias: deno run verbose <scenario_file>");
}

export const verbose = args.verbose;

/* SECTION: Functions */

function runScenario(scen: Scenario, mesh: Mesh) {
  const si = new SearchInstance(mesh, scen.start, scen.end);
  const finalNode = si.search();

  if (!finalNode) {
    console.log(`No path found from ${scen.start.toString()} to ${scen.end.toString()}`);
  }

  const path = si.generatePath();
  
  console.log(path);
}

/* SECTION: Main Logic */

const meshes: Map<string, Mesh> = new Map();

// Read the scenario file
debug(`Running scenarios from ${scenarioFile}`);
for await (const scen of ScenarioReader.scenarioGenerator(scenarioFile)) {
  debug(
    `\nRunning scenario ${scen.map} from ${scen.start.toString()} to ${scen.end.toString()} {`,
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
