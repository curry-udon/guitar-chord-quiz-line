import { handleRequest } from "./app.js";

export default {
  /**
   * @param {Request} request
   * @param {import("./app.js").Env} env
   */
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};
