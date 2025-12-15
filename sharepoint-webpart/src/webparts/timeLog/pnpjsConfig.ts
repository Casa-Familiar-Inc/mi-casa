import { WebPartContext } from "@microsoft/sp-webpart-base";
import { spfi, SPFI, SPFx } from "@pnp/sp";
import { LogLevel, PnPLogging } from "@pnp/logging";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/batching";
import "@pnp/sp/sputilities";

let _sp: SPFI | undefined = undefined;

export const getSP = (context?: WebPartContext): SPFI => {
    if (_sp === undefined && context !== undefined) {
        _sp = spfi().using(SPFx(context!)).using(PnPLogging(LogLevel.Warning));
    }
    return _sp!;
};
