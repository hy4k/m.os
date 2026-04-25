import { CommandCenter } from "@/components/command-center";
import { demoData } from "@/lib/demo-data";
import { loadCommandCenter } from "@/lib/api";

export default async function Page() {
  let data = demoData;
  let live = false;

  try {
    data = await loadCommandCenter();
    live = true;
  } catch {
    // The UI remains fully explorable before the API/database is running.
  }

  return <CommandCenter initialData={data} live={live} />;
}
