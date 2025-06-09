import { assert } from "@std/assert";
import Mesh from "./src/classes/Mesh.ts";
import { parseArgs } from "@std/cli";
import * as Path from "@std/path";
import ScenarioReader from "./src/classes/Scenario.ts";
import SearchInstance from "./src/classes/SearchInstance.ts";

const args = parseArgs(Deno.args);

const scenarioFile = args._[0] as string;

assert(
  scenarioFile,
  "deno run --allow-read --allow-write main.ts <scenario_file>",
);

const meshes: Map<string, Mesh> = new Map();

const scenReader = new ScenarioReader(scenarioFile);

for await (const scen of scenReader.generator()) {
  console.log(`Running scenario: ${scen.label} on map: ${scen.map}`);
  console.log(`Start: ${scen.start.lat}, ${scen.start.lon}`);
  console.log(`End: ${scen.end.lat}, ${scen.end.lon}`);

  const mapName = Path.basename(scen.map, ".sph");

  if (!meshes.has(mapName)) {
    const mesh = new Mesh();
    await mesh.read(scen.map);

    meshes.set(mapName, mesh);
  }

  const si = new SearchInstance(meshes.get(mapName)!, scen.start, scen.end);

  const [path, length] = si.search();

  if (path.length === 0) {
    console.log(`No path found for scenario: ${scen.label}`);
    continue;
  }

  console.log(`Path found: ${path.length} points with length ${length}`);

  Deno.writeTextFileSync(`./out/${mapName}_${scen.label}.txt`, "", {
    create: true,
  });

  for (const point of path) {
    console.log(`${point.lat}, ${point.lon}`);
    Deno.writeTextFileSync(
      `./out/${mapName}_${scen.label}.txt`,
      `${point.lat}, ${point.lon}\n`,
      { append: true },
    );
  }
}

console.log("All scenarios processed.");
