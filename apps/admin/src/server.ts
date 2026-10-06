import handler from "@tanstack/react-start/server-entry";
import { runInWorkerRequest, type WorkerEnv } from "@starter/db/worker";
export default {
  fetch(req: Request, bindings?: WorkerEnv) {
    return runInWorkerRequest(bindings, () => handler.fetch(req));
  },
};
