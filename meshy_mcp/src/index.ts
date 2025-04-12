#!/usr/bin/env node
import { textTo3D } from "./operations/textTo3D.js";

const previewResult = await textTo3D({
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
});

console.log(previewResult);

if (previewResult.status !== "SUCCEEDED") {
  throw new Error("Preview failed");
}

const refineResult = await textTo3D({
  mode: "refine",
  preview_task_id: previewResult.id,
  enable_pbr: true,
  texture_prompt: "A beautiful vase with a pattern",
}, {
  onProgress: (progress) => {
    console.log(`Progress: ${progress}`);
  },
});

console.log(refineResult);

if (refineResult.status !== "SUCCEEDED") {
  throw new Error("Refine failed");
}
