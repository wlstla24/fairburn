#!/usr/bin/env node
import { textTo3D } from "./operations/textTo3D.js";

textTo3D({
  mode: "preview",
  prompt: "A beautiful vase",
  art_style: "realistic",
  // seed: 42,
  // ai_model: "meshy-4",
  topology: "quad",
  target_polycount: 10000,
  // should_remesh: true,
  // symmetry_mode: "off",
}, {
  onProgress: (progress) => {
    console.log(`Progress: ${progress}`);
  },
}).then((result) => {
  console.log(result);
}).catch((error) => {
  console.error(error);
});
