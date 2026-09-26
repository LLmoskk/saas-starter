import handler from "@tanstack/react-start/server-entry";
export default {
  fetch(req: Request) {
    return handler.fetch(req);
  },
};
