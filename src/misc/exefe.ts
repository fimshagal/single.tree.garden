import {typeOf} from "./type.of.ts";

export const exefe = (fn: any): void => {
    (async (): Promise<void> => {
        const fnType: string = typeOf(fn);

        if (fnType !== "function" && fnType !== "asyncfunction") {
            return;
        }

        try {
            await fn();
        } catch (error) {
            throw Error(error);
        }
    })();
};