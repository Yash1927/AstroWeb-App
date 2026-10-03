import "dotenv/config";
import "temporal-polyfill/global";
import { getMediaService } from "./media-service";

const removed = await getMediaService().cleanupUnused();
console.log(`Removed ${removed} unused media object${removed === 1 ? "" : "s"}.`);
