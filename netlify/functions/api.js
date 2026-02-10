/**
 * Netlify Function entry-point.
 *
 * The actual server code is compiled by `tsc --project tsconfig.netlify.json`
 * into  dist/server/.  This file lazily imports the compiled handler so that
 * Netlify's bundler can trace and include the dependency tree.
 */

let _handler;

export const handler = async (event, context) => {
  if (!_handler) {
    const mod = await import("../../dist/server/netlify-function.js");
    _handler = mod.handler;
  }
  return _handler(event, context);
};
