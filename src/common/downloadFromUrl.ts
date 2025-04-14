import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function downloadFromUrl(url: string, localPath: string): Promise<void> {
  const response = await fetch(url);
  const blob = await response.blob();
  console.log("Downloading from URL", url, "to", localPath);
  // create the directory if it doesn't exist
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, Buffer.from(await blob.arrayBuffer()));
}
