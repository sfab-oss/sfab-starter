// Minimal worker entry for tests — provides bindings without TanStack Start
export default {
  fetch() {
    return new Response("test worker");
  },
};
