/**
 * Allows CLI scripts to import application modules that use `server-only`.
 * Loaded via `node --import ./scripts/stub-server-only.ts` before tsx.
 */
import Module from "node:module";

type ModuleLoad = (
  request: string,
  parent: Module,
  isMain: boolean,
) => unknown;

const moduleHost = Module as unknown as { _load: ModuleLoad };
const originalLoad = moduleHost._load;

moduleHost._load = function loadWithServerOnlyStub(
  request: string,
  parent: Module,
  isMain: boolean,
): unknown {
  if (request === "server-only") {
    return {};
  }
  return originalLoad.call(this, request, parent, isMain);
};
