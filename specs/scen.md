# Scenario Files

Scenario files are relevant in running benchmark tests. They contain information
such as the map to be used, map size, start and goal coordinates, and the
theoretical optimal length. While initially based on the format used in this
[page](https://www.movingai.com/benchmarks/formats.html), an adjustment was
necessary for the authors of this paper to run benchmarks easier.

## Format

The first line begins with the text `version x`. This document describes
version 2.

The following lines are scenarios. In version 2, each line has 6 fields,
delimited by whitespaces.

- **Map:** Filepath of the spherical map (`.sph`) to be used
- **Label:** Discriminates between different runs on the same map. Results are
  saved in a default folder of `out` concatenated with the map name delimited by
  `_` e.g. `out/a_1.out`
- **Start Latitude:** Number from -90 to 90
- **Start Longitude:** Number from -180 to 180
- **Target Latitude:** Number from -90 to 90
- **Target Longitude:** Number from -180 to 180
