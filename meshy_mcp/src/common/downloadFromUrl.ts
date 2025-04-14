import { writeFile } from "fs/promises";

export async function downloadFromUrl(url: string, localPath: string): Promise<void> {
  const response = await fetch(url);
  const blob = await response.blob();
  console.log("Downloading from URL", url, "to", localPath);
  await writeFile(localPath, Buffer.from(await blob.arrayBuffer()));
}
