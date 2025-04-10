import { TextLineStream } from "@std/streams";
import { verbose } from "./main.ts";

// deno-lint-ignore no-explicit-any
export function debug(message: any, v: boolean = verbose): void {
  if (v) {
    console.log(message);
  }
}

export async function* readlines(filename: string): AsyncGenerator<string> {
  using f = await Deno.open(filename);

  const readable = f.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TextLineStream());

  for await (const line of readable) {
    yield line;
  }
}
