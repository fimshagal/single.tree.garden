import {generateCollatzSequenceAdic} from "./math";
import {onDocReady} from "./misc/on.doc.ready.ts";
import {initRenderer, updateRenderer} from "./draw";
import {exefe} from "./misc";

exefe(async (): Promise<void> => {
    await onDocReady();

    initRenderer({
        parent: document.getElementById('pixiTarget'),
    });

    updateRenderer({
        sequence: generateCollatzSequenceAdic(11).sequence,
    });
});