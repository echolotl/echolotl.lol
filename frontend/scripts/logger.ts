import { Logger } from "@echolotl/logger";
import { context } from "./artcli/utils/context";

Logger.setSuppressionCheck(() => context.noLog);

export { Logger };
