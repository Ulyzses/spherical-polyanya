# Spherical Polyanya

This is a spherical implementation of [Cui et al's (2017)](https://www.ijcai.org/proceedings/2017/0070.pdf) Polyanya algorithm. It is our Special Project as part of the Algorithms and Complexity Laboratory in the Department of Computer Science in UP Diliman.

## Files

### Maps

We use a similar mesh file format as in the original Polyanya algorithm but adapted for spherical surfaces i.e. with the limitations of using latitude and longitudes. Exact specifications can be found [here](specs/sph.md)

### Scenarios

The main method for running tests are through scenarios which identify the map to be used as well as start and end points. Exact specifications can be found [here](specs/scen.md)

## Running

To run a scenario file, run

```sh
deno run main <path/to/scenario_file>
```
This will run all the scenarios and create a resulting text file in the `out/` directory for each scenario.